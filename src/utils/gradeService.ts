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
 * Tách chuỗi các đáp án chấp nhận được thành mảng các đáp án.
 * Dữ liệu lưu trong data1 theo định dạng: "đáp án 1 / đáp án 2 / ..."
 * Hỗ trợ dấu phân tách: " / ", "/", "|", ";"
 */
export function parseAcceptableAnswers(correctAnswer: string | undefined | null): string[] {
  if (!correctAnswer) return [];
  const raw = String(correctAnswer).trim();
  if (!raw) return [];

  // 1. Phân tách theo " / " (dấu gạch chéo chuẩn có khoảng trắng theo định dạng data1)
  if (raw.includes(' / ')) {
    const list = raw
      .split(/\s+\/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }

  // 2. Phân tách theo dấu gạch đứng | hoặc chấm phẩy ;
  if (raw.includes('|') || raw.includes(';')) {
    const list = raw
      .split(/\s*[|;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }

  // 3. Phân tách theo dấu gạch chéo / thông thường (nếu không phải là phân số đơn lẻ kiểu 1/2 hay 3/4)
  if (raw.includes('/') && !/^\d+\/\d+$/.test(raw)) {
    const list = raw
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }

  return [raw];
}

/**
 * Gộp danh sách các đáp án tương tự / từ đồng nghĩa thành chuỗi lưu vào data1
 * Định dạng: "đáp án 1 / đáp án 2 / đáp án 3"
 */
export function joinAcceptableAnswers(answers: (string | undefined | null)[]): string {
  if (!answers || answers.length === 0) return '';
  return answers
    .map((a) => (a !== undefined && a !== null ? String(a).trim() : ''))
    .filter(Boolean)
    .join(' / ');
}

/**
 * So khớp một phương án đáp án đơn lẻ với câu trả lời của học sinh
 */
function checkSingleEssayMatch(rawStudent: string, rawOption: string): boolean {
  if (!rawStudent || !rawOption) return false;

  // 1. So khớp sau khi chuẩn hóa chữ thường, khử dấu tiếng Việt và thu gọn khoảng trắng thừa
  const sNorm = normalizeKeywords(rawStudent);
  const cNorm = normalizeKeywords(rawOption);
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

/**
 * So khớp giá trị học sinh nhập với đáp án chuẩn tự luận:
 * Khi học sinh gõ 1 trong những đáp án được thiết lập (phân tách bởi /) đều chấm đúng!
 * @param studentAnswer Giá trị học sinh nhập
 * @param correctAnswer Từ khóa / chuỗi đáp án chuẩn do giáo viên thiết lập (đáp án 1 / đáp án 2 / ...)
 * @returns boolean - true nếu học sinh gõ trúng bất kỳ đáp án nào
 */
export function checkEssayAnswerMatch(
  studentAnswer: string | undefined | null,
  correctAnswer: string | undefined | null
): boolean {
  if (!studentAnswer || !correctAnswer) return false;

  const rawStudent = String(studentAnswer).trim();
  const rawCorrect = String(correctAnswer).trim();
  if (!rawStudent || !rawCorrect) return false;

  // Tách các đáp án tương tự / từ đồng nghĩa (đáp án 1 / đáp án 2 / ...)
  const acceptableOptions = parseAcceptableAnswers(rawCorrect);

  if (acceptableOptions.length === 0) return false;

  // Kiểm tra nếu học sinh gõ khớp với BẤT KỲ đáp án tương tự nào -> Đều chấm đúng!
  return acceptableOptions.some((opt) => checkSingleEssayMatch(rawStudent, opt));
}
