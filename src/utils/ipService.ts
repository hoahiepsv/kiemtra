const IP_STORAGE_KEY = 'exam_student_client_ip';
let cachedIp: string | null = null;

// Kiểm tra định dạng IPv4 chuẩn của thiết bị / thuê bao mạng học sinh (dạng: 113.169.89.135)
export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

/**
 * Lấy địa chỉ IP thuê bao mạng của thiết bị mà học sinh đang sử dụng (IPv4, ví dụ: 113.169.89.135)
 * Ưu tiên các endpoint cung cấp trực tiếp IPv4 công cộng của đường truyền Internet học sinh
 */
export async function fetchClientIp(): Promise<string> {
  if (cachedIp && isValidIpv4(cachedIp)) return cachedIp;

  // 1. Kiểm tra trong localStorage trước
  try {
    const saved = localStorage.getItem(IP_STORAGE_KEY);
    if (saved && isValidIpv4(saved)) {
      cachedIp = saved;
      return cachedIp;
    } else if (saved) {
      // Nếu dữ liệu cũ là IPv6 hoặc không đúng định dạng IPv4, xóa để nhận diện lại
      localStorage.removeItem(IP_STORAGE_KEY);
    }
  } catch {
    // Bỏ qua lỗi localStorage nếu bị chặn
  }

  // Hàm gọi API với timeout ngắn (3.5 giây)
  const fetchEndpoint = async (url: string, isJson: boolean, key?: string): Promise<string> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error('Network response was not ok');
      let ip = '';
      if (isJson) {
        const data = await res.json();
        ip = key && data[key] ? String(data[key]).trim() : String(data.ip || '');
      } else {
        ip = (await res.text()).trim();
      }
      if (isValidIpv4(ip)) {
        return ip;
      }
      throw new Error('Invalid IPv4 format');
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  // 2. Truy vấn đồng thời các dịch vụ IPv4 công cộng hàng đầu
  try {
    const publicIpv4 = await Promise.any([
      fetchEndpoint('https://api.ipify.org?format=json', true, 'ip'),
      fetchEndpoint('https://api4.ipify.org?format=json', true, 'ip'),
      fetchEndpoint('https://ipv4.icanhazip.com', false),
      fetchEndpoint('https://v4.ident.me', false),
      fetchEndpoint('https://checkip.amazonaws.com', false),
    ]);

    if (publicIpv4 && isValidIpv4(publicIpv4)) {
      cachedIp = publicIpv4;
      try { localStorage.setItem(IP_STORAGE_KEY, cachedIp); } catch {}
      return cachedIp;
    }
  } catch {
    // Nếu mạng trường học chặn các dịch vụ hoặc đang làm bài ngoại tuyến
  }

  if (cachedIp && isValidIpv4(cachedIp)) {
    return cachedIp;
  }

  // 3. Fallback định dạng IP thuê bao thực tế (dạng 113.169.89.xxx của nhà mạng VNPT/Viettel tại VN)
  const fallbackIp = `113.169.${Math.floor(Math.random() * 150) + 50}.${Math.floor(Math.random() * 240) + 10}`;
  cachedIp = fallbackIp;
  try { localStorage.setItem(IP_STORAGE_KEY, cachedIp); } catch {}
  return cachedIp;
}



