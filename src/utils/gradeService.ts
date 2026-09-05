/**
 * Dịch vụ chấm điểm & So khớp đáp án
 * Hỗ trợ so khớp tự luận:
 * - Không phân biệt chữ hoa / chữ thường
 * - Không phân biệt khoảng trắng thừa (đầu, cuối, hoặc nhiều khoảng trắng liên tiếp)
 * - Không phân biệt dấu tiếng Việt (có dấu hay không dấu đều được công nhận)
 * - Hỗ trợ chuẩn hóa số (dấu chấm, dấu phẩy, phân tách hàng nghìn)
 */

/**
 * Loại bỏ dấu tiếng Việt, chuyển đ/Đ thành d
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

/**
 * Chuẩn hóa từ khóa / nội dung chuỗi:
 * - Khử dấu tiếng Việt
 * - Chuyển chữ thường
 * - Cắt khoảng trắng đầu cuối (trim)
 * - Gộp các khoảng trắng thừa ở giữa thành 1 dấu cách đơn
 */
export function normalizeKeywords(str: string): string {
  if (!str) return '';
  return removeVietnameseAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * So khớp giá trị học sinh nhập với đáp án chuẩn tự luận:
 * @param studentAnswer Giá trị học sinh nhập
 * @param correctAnswer Từ khóa / đáp án đúng do giáo viên thiết lập
 * @returns boolean - true nếu khớp đáp án
 */
export function checkEssayAnswerMatch(
  studentAnswer: string | undefined | null,
  correctAnswer: string | undefined | null
): boolean {
  if (!studentAnswer || !correctAnswer) return false;

  const rawStudent = String(studentAnswer).trim();
  const rawCorrect = String(correctAnswer).trim();
  if (!rawStudent || !rawCorrect) return false;

  // Nếu giáo viên thiết lập nhiều phương án trả lời phân tách bởi | hoặc ; hoặc /
  // Ví dụ: "1000 | 1.000" hoặc "Bàn phím ; Chuột"
  if (
    rawCorrect.includes('|') ||
    rawCorrect.includes(';') ||
    (rawCorrect.includes('/') && !/\d\/\d/.test(rawCorrect))
  ) {
    const validOptions = rawCorrect
      .split(/[|;/]/)
      .map((opt) => opt.trim())
      .filter(Boolean);

    if (validOptions.length > 1) {
      return validOptions.some((opt) => checkEssayAnswerMatch(rawStudent, opt));
    }
  }

  // 1. So khớp sau khi chuẩn hóa chữ thường, khử dấu tiếng Việt và thu gọn khoảng trắng thừa
  const sNorm = normalizeKeywords(rawStudent);
  const cNorm = normalizeKeywords(rawCorrect);
  if (sNorm === cNorm) return true;

  // 2. So khớp khi loại bỏ hoàn toàn mọi khoảng trắng (VD: "bo nho" vs "bonho", "1 000" vs "1000")
  const sNoSpace = sNorm.replace(/\s+/g, '');
  const cNoSpace = cNorm.replace(/\s+/g, '');
  if (sNoSpace && sNoSpace === cNoSpace) return true;

  // 3. So khớp dạng số: phân tách hàng nghìn (1.000 vs 1,000 vs 1000)
  const sNoNumSeparator = sNoSpace.replace(/[.,]/g, '');
  const cNoNumSeparator = cNoSpace.replace(/[.,]/g, '');
  if (
    sNoNumSeparator &&
    cNoNumSeparator &&
    sNoNumSeparator === cNoNumSeparator &&
    /^\d+$/.test(sNoNumSeparator)
  ) {
    return true;
  }

  // 4. So khớp số thập phân (thay dấu phẩy bằng dấu chấm: 0,25 vs 0.25)
  const sDecimal = sNoSpace.replace(/,/g, '.');
  const cDecimal = cNoSpace.replace(/,/g, '.');
  if (sDecimal === cDecimal) return true;

  const numS = Number(sDecimal);
  const numC = Number(cDecimal);
  if (!isNaN(numS) && !isNaN(numC) && numS === numC) {
    return true;
  }

  return false;
}
