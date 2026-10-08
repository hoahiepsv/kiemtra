import { SubmissionRecord } from '../types';

export interface IpViolationGroup {
  ipAddress: string;
  submissions: SubmissionRecord[];
  studentNames: string[];
  uniqueStudentsCount: number;
  classNames: string[];
  submissionCount: number;
  minScore: number;
  maxScore: number;
  isSameStudentMultipleTimes: boolean;
  isMultipleStudentsSharedIp: boolean;
}

/**
 * Thuật toán chuẩn hoá địa chỉ IP máy tính từ Cột I của datasheet 2
 * - Xóa khoảng trắng thừa
 * - Tách IP gốc nếu qua Proxy / VPN (vd: "171.243.63.201, 10.0.0.1" -> "171.243.63.201")
 * - Loại bỏ các giá trị rỗng hoặc placeholder không hợp lệ
 */
export function normalizeIpAddress(rawIp: string | null | undefined): string {
  if (!rawIp) return '';
  let ip = String(rawIp).trim();

  // Nếu chuỗi chứa dấu phẩy (nhiều IP từ reverse proxy/CDN/X-Forwarded-For)
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // Xóa mọi khoảng trắng ở giữa
  ip = ip.replace(/\s+/g, '');

  const lower = ip.toLowerCase();
  if (
    !lower ||
    lower === '-' ||
    lower === 'n/a' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower.includes('chưa ghi') ||
    lower.includes('khong co')
  ) {
    return '';
  }

  return ip;
}

/**
 * THUẬT TOÁN TÌM KIẾM & PHÁT HIỆN IP TRÙNG NHAU (ĐỘ PHỨC TẠP O(N))
 * Nhóm các bài nộp theo IP máy tính (Cột I trong datasheet 2)
 * và trích xuất tất cả IP đã làm bài từ 2 lần trở lên
 */
export function detectIpViolations(submissions: SubmissionRecord[]): IpViolationGroup[] {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return [];
  }

  // Bước 1: Hash Map nhóm toàn bộ bài nộp theo IP chuẩn hoá
  const ipMap = new Map<string, SubmissionRecord[]>();

  submissions.forEach((record) => {
    const cleanIp = normalizeIpAddress(record.ipAddress);
    if (!cleanIp) return; // Bỏ qua nếu dòng này chưa có IP

    if (!ipMap.has(cleanIp)) {
      ipMap.set(cleanIp, []);
    }
    ipMap.get(cleanIp)!.push(record);
  });

  // Bước 2: Lọc các IP xuất hiện > 1 lần và tổng hợp dữ liệu chi tiết
  const violationGroups: IpViolationGroup[] = [];

  ipMap.forEach((records, ip) => {
    if (records.length > 1) {
      // Sắp xếp theo thứ tự thời gian nộp bài / STT
      const sorted = [...records].sort((a, b) => {
        if (a.stt && b.stt) return a.stt - b.stt;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      const studentNamesSet = new Set<string>();
      const classNamesSet = new Set<string>();
      let minScore = Infinity;
      let maxScore = -Infinity;

      sorted.forEach((r) => {
        const name = (r.studentName || '').trim();
        if (name) studentNamesSet.add(name);

        const cls = (r.className || '').trim();
        if (cls) classNamesSet.add(cls);

        const score = Number(r.totalScore) || 0;
        if (score < minScore) minScore = score;
        if (score > maxScore) maxScore = score;
      });

      // Nhận diện học sinh phân biệt không phân biệt chữ hoa/thường
      const normalizedNames = new Set(Array.from(studentNamesSet).map((n) => n.toLowerCase().trim()));
      const uniqueStudentsCount = normalizedNames.size;
      const isSameStudentMultipleTimes = uniqueStudentsCount === 1;
      const isMultipleStudentsSharedIp = uniqueStudentsCount > 1;

      violationGroups.push({
        ipAddress: ip,
        submissions: sorted,
        studentNames: Array.from(studentNamesSet),
        uniqueStudentsCount,
        classNames: Array.from(classNamesSet),
        submissionCount: sorted.length,
        minScore: minScore === Infinity ? 0 : minScore,
        maxScore: maxScore === -Infinity ? 0 : maxScore,
        isSameStudentMultipleTimes,
        isMultipleStudentsSharedIp,
      });
    }
  });

  // Bước 3: Sắp xếp theo mức độ vi phạm (IP làm nhiều lần nhất lên đầu)
  return violationGroups.sort((a, b) => b.submissionCount - a.submissionCount);
}

/**
 * Trích xuất địa chỉ IP thuần (loại bỏ hậu tố "- Block", "- Blocked", khoảng trắng...)
 * Ví dụ: "113.169.89.135 - Block" -> "113.169.89.135"
 */
export function extractCleanIp(ipStr: string | null | undefined): string {
  if (!ipStr) return '';
  let ip = String(ipStr).trim();
  ip = ip.replace(/\s*-\s*block(ed)?\b/gi, '');
  return normalizeIpAddress(ip);
}

/**
 * Định dạng địa chỉ IP kèm hậu tố "- Block"
 * Ví dụ: "113.169.89.135" -> "113.169.89.135 - Block"
 */
export function formatBlockedIpString(ip: string): string {
  const clean = extractCleanIp(ip);
  return clean ? `${clean} - Block` : '';
}

/**
 * Kiểm tra xem một địa chỉ IP có nằm trong danh sách chặn hay không (Độ phức tạp O(K) siêu nhanh < 0.0001s)
 */
export function isIpBlockedCheck(
  clientIp: string | null | undefined,
  blockedIpsList: string[] | undefined,
  enableBlocking = true
): boolean {
  if (!enableBlocking || !clientIp || !blockedIpsList || blockedIpsList.length === 0) {
    return false;
  }
  const cleanClient = extractCleanIp(clientIp);
  if (!cleanClient) return false;

  return blockedIpsList.some((blockedItem) => {
    const cleanBlocked = extractCleanIp(blockedItem);
    return cleanBlocked && cleanBlocked === cleanClient;
  });
}

/**
 * Kiểm tra định dạng cơ bản của địa chỉ IPv4
 */
export function isValidIpFormat(ip: string): boolean {
  const clean = extractCleanIp(ip);
  if (!clean) return false;
  // Cho phép IPv4 dạng x.x.x.x
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(clean)) {
    const parts = clean.split('.').map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }
  // Hoặc chấp nhận chuỗi IP hợp lệ bất kỳ (IPv6 hoặc dạng tên máy)
  return clean.length >= 3 && clean.length <= 45;
}

/**
 * Thêm một địa chỉ IP vào danh sách chặn thủ công (tự động gắn hậu tố "- Block")
 */
export function addIpToBlockedList(
  newIp: string,
  currentList: string[] = []
): { success: boolean; list: string[]; message: string; formattedIp?: string } {
  const clean = extractCleanIp(newIp);
  if (!clean) {
    return {
      success: false,
      list: currentList,
      message: 'Vui lòng nhập một địa chỉ IP hợp lệ (ví dụ: 113.169.89.135)!',
    };
  }

  if (isIpBlockedCheck(clean, currentList, true)) {
    return {
      success: false,
      list: currentList,
      message: `Địa chỉ IP ${clean} đã có trong danh sách chặn rồi!`,
    };
  }

  const formatted = formatBlockedIpString(clean);
  const nextList = [...currentList, formatted];
  return {
    success: true,
    list: nextList,
    message: `Đã chặn thành công IP: ${formatted}`,
    formattedIp: formatted,
  };
}

/**
 * Xóa/Mở chặn một địa chỉ IP khỏi danh sách chặn
 */
export function removeIpFromBlockedList(targetIp: string, currentList: string[] = []): string[] {
  const clean = extractCleanIp(targetIp);
  if (!clean) return currentList;
  return currentList.filter((item) => extractCleanIp(item) !== clean);
}

