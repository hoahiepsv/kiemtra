/**
 * Tiện ích chuẩn hóa họ tên học sinh và tên lớp
 */

/**
 * Tự động viết hoa các chữ cái đầu của mỗi từ trong Họ tên học sinh
 * Ví dụ: "lê huy phát" -> "Lê Huy Phát", "LÊ HUY PHÁT" -> "Lê Huy Phát"
 * Hỗ trợ chuẩn Unicode Tiếng Việt (Đ, Ă, Â, Ê, Ô, Ơ, Ư,...)
 */
export function formatStudentName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (!word) return '';
      const firstChar = word.charAt(0).toUpperCase();
      const rest = word.slice(1).toLowerCase();
      return firstChar + rest;
    })
    .join(' ');
}

/**
 * Tự động viết hoa toàn bộ các chữ cái có trong tên lớp
 * Ví dụ: "6a10" -> "6A10", "12c2" -> "12C2"
 */
export function formatClassName(className: string): string {
  if (!className) return '';
  return className.trim().toUpperCase();
}
