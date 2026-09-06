/**
 * Tiện ích định dạng ngày giờ và thời gian thi
 * Xử lý triệt để các định dạng ngày giờ từ Google Sheets (đặc biệt là ISO Date 1899-12-29T... do Apps Script trả về)
 * Đảm bảo định dạng chuẩn: "giờ: phút dd/mm/yyyy" (ví dụ: 17:02 06/09/2026)
 */

/**
 * Định dạng chuỗi ngày giờ thi thành: "giờ: phút dd/mm/yyyy" (ví dụ: 17:02 06/09/2026)
 */
export function formatExamDateTime(raw?: string | null, fallbackDate?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const str = raw.trim();
  if (!str) return '';

  // 1. Trường hợp đã đúng định dạng "giờ:phút ngày/tháng/năm" (vd: "8:00 04/09/2026" hoặc "17:02 06/09/2026")
  if (/^\d{1,2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    return str;
  }

  // 2. Trường hợp chuỗi ISO chứa 'T' (vd: "1899-12-29T17:02:00.000Z" hoặc "2026-09-04T17:02:00.000Z")
  if (str.includes('T')) {
    try {
      // Trích xuất giờ và phút trực tiếp từ chuỗi để tránh lệch múi giờ
      const timeMatch = str.match(/T(\d{1,2}):(\d{2})/);
      let hours = '00';
      let minutes = '00';

      if (timeMatch) {
        hours = timeMatch[1].padStart(2, '0');
        minutes = timeMatch[2].padStart(2, '0');
      } else {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          hours = d.getHours().toString().padStart(2, '0');
          minutes = d.getMinutes().toString().padStart(2, '0');
        }
      }

      // Kiểm tra năm: Google Sheets trả về năm 1899/1900 cho các ô chỉ chứa giờ (Time-only)
      const yearMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      let day = '';
      let month = '';
      let year = '';

      if (yearMatch && parseInt(yearMatch[1], 10) > 1920) {
        // Năm hợp lệ (> 1920)
        year = yearMatch[1];
        month = yearMatch[2];
        day = yearMatch[3];
      } else {
        // Năm 1899/1900 là giá trị mốc của Google Sheets -> Lấy ngày tháng năm thực tế hiện tại
        const now = new Date();
        day = now.getDate().toString().padStart(2, '0');
        month = (now.getMonth() + 1).toString().padStart(2, '0');
        year = now.getFullYear().toString();
      }

      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return str;
    }
  }

  // 3. Trường hợp chỉ có giờ (vd: "17:02" hoặc "17:02:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');

    if (fallbackDate && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fallbackDate)) {
      return `${hours}:${minutes} ${fallbackDate}`;
    }

    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Định dạng thời lượng làm bài thành chuỗi dễ đọc (vd: "02:00", "14:20" hoặc "2 phút")
 * Tránh hiển thị chuỗi ISO timestamp khi Google Sheets lưu thời lượng dưới dạng ngày giờ
 */
export function formatExamDuration(
  duration?: string | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  if (!duration && !startTime && !endTime) return '15:00';

  // Nếu startTime và endTime có thể tính ra chênh lệch phút
  if (startTime && endTime) {
    const extractMinutes = (val: string): number | null => {
      if (val.includes('T')) {
        const m = val.match(/T(\d{1,2}):(\d{2})/);
        if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      }
      const m2 = val.match(/(\d{1,2}):(\d{2})/);
      if (m2) return parseInt(m2[1], 10) * 60 + parseInt(m2[2], 10);
      return null;
    };

    const sMin = extractMinutes(startTime);
    const eMin = extractMinutes(endTime);
    if (sMin !== null && eMin !== null && eMin >= sMin) {
      const diffMin = eMin - sMin;
      const mm = Math.floor(diffMin).toString().padStart(2, '0');
      const ss = '00';
      return `${mm}:${ss}`;
    }
  }

  const str = (duration || '').trim();

  // Đã là định dạng mm:ss (vd "00:14" hoặc "15:00")
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    return str;
  }

  // Nếu thời lượng bị biến thành chuỗi ISO (vd "1899-12-29T17:04:00.000Z")
  if (str.includes('T')) {
    const timeMatch = str.match(/T(\d{1,2}):(\d{2}):?(\d{2})?/);
    if (timeMatch) {
      const m = timeMatch[2].padStart(2, '0');
      const s = (timeMatch[3] || '00').padStart(2, '0');
      return `${m}:${s}`;
    }
  }

  return str || '15:00';
}
