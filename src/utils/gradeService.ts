import { SubmissionRecord, Question } from '../types';
import { parseScoreStringDetailed, buildScoreString } from './scoreStringUtils';

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
export function removeVietnameseAccents(str: any): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  return s
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
export function normalizeKeywords(str: any): string {
  if (str === undefined || str === null) return '';
  return removeVietnameseAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * So khớp tìm kiếm chuỗi (tên học sinh, lớp, ...)
 * Không phân biệt chữ hoa / chữ thường, không phân biệt khoảng cách và dấu tiếng Việt.
 * Ví dụ: "nguyen van a", "nguyenvana", "NGUYEN VAN A", "Nguyen   Van A", "van a", "a van" đều khớp với "Nguyễn Văn A".
 */
export function matchSearchQuery(
  target: any,
  query: any
): boolean {
  const q = String(query || '').trim();
  const t = String(target || '').trim();
  if (!q) return true;
  if (!t) return false;

  const cleanTarget = removeVietnameseAccents(t).toLowerCase();
  const cleanQuery = removeVietnameseAccents(q).toLowerCase();

  // 1. So khớp không khoảng cách (nguyenvana khớp với Nguyễn Văn A)
  const noSpaceTarget = cleanTarget.replace(/\s+/g, '');
  const noSpaceQuery = cleanQuery.replace(/\s+/g, '');
  if (noSpaceQuery && noSpaceTarget.includes(noSpaceQuery)) {
    return true;
  }

  // 2. So khớp có khoảng cách đơn chuẩn hóa
  const normalizedTarget = cleanTarget.replace(/\s+/g, ' ').trim();
  const normalizedQuery = cleanQuery.replace(/\s+/g, ' ').trim();
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // 3. So khớp từng từ (tất cả các từ khóa gõ vào đều xuất hiện trong tên mục tiêu)
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1 && queryTokens.every((token) => noSpaceTarget.includes(token))) {
    return true;
  }

  return false;
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

/**
 * Chấm lại câu tự luận cho học sinh theo quyền giáo viên (Đúng / Sai)
 * @param submission Bản ghi nộp bài của học sinh
 * @param questions Danh sách câu hỏi đề thi
 * @param orderNumber Số thứ tự câu hỏi cần chấm lại
 * @param isCorrect Giáo viên chọn Đúng (true) hoặc Sai (false)
 * @returns Bản ghi SubmissionRecord mới đã được cập nhật điểm số và chuỗi scoreString
 */
export function overrideEssayGrade(
  submission: SubmissionRecord,
  questions: Question[],
  orderNumber: number,
  isCorrect: boolean
): SubmissionRecord {
  const parsed = parseScoreStringDetailed(submission.scoreString || '');

  let newResults: { orderNumber: number; earnedPoints: number; studentAnswer: string }[] = [];

  if (questions && questions.length > 0) {
    newResults = questions.map((q, idx) => {
      const order = q.orderNumber || idx + 1;
      const matched = parsed.items.find((it) => it.orderNumber === order);
      const studentAns = matched?.studentAnswer || '';

      if (order === orderNumber) {
        const fullPoints = typeof q.points === 'number' && q.points > 0 ? q.points : 1;
        const earned = isCorrect ? fullPoints : 0;
        return {
          orderNumber: order,
          earnedPoints: earned,
          studentAnswer: studentAns,
        };
      }

      const earned = matched ? matched.earnedPoints : 0;
      return {
        orderNumber: order,
        earnedPoints: earned,
        studentAnswer: studentAns,
      };
    });
  } else {
    // Trường hợp không có danh sách câu hỏi đề thi
    newResults = parsed.items.map((it) => {
      if (it.orderNumber === orderNumber) {
        return {
          orderNumber: it.orderNumber,
          earnedPoints: isCorrect ? (it.earnedPoints > 0 ? it.earnedPoints : 1) : 0,
          studentAnswer: it.studentAnswer,
        };
      }
      return {
        orderNumber: it.orderNumber,
        earnedPoints: it.earnedPoints,
        studentAnswer: it.studentAnswer,
      };
    });
  }

  const rawTotal = newResults.reduce((acc, r) => acc + (Number(r.earnedPoints) || 0), 0);
  const newTotalScore = Math.round(rawTotal * 100) / 100;
  const newScoreString = buildScoreString(newResults);

  return {
    ...submission,
    totalScore: newTotalScore,
    scoreString: newScoreString,
  };
}
