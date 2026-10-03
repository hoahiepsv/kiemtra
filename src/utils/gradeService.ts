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
 * Làm sạch các tiền tố và hậu tố thông dụng trong câu trả lời tự luận của học sinh:
 * - Tiền tố: "dạ", "thưa thầy", "đáp số", "đáp án là", "kết quả", "bằng", "em tính ra",...
 * - Hậu tố: "ạ", "thưa thầy", "nhé", "nha", dấu chấm, dấu than,...
 */
export function cleanPrefixesAndSuffixes(text: string): string {
  if (!text) return '';
  let str = String(text).trim();

  // 1. Lột bỏ dấu ngoặc, dấu nháy bao quanh ngoài cùng
  str = str.replace(/^["'“”‘’\(\[\{]+|["'“”‘’\)\]\}]+$/g, '').trim();

  // 2. Danh sách các regex tiền tố tiếng Việt phổ biến của học sinh
  const prefixRegexes = [
    // Chào hỏi, kính ngữ
    /^(?:kính\s+thưa|em\s+thưa|dạ\s+thưa|thưa)\s+(?:thầy\s+cô|thầy|cô)\s*[:,-]?\s*/i,
    /^(?:dạ|da)\s*[:,-]?\s*/i,
    /^(?:em\s+thưa|thưa)\s*[:,-]?\s*/i,
    // Số câu (câu 1:, c1:, q1:, bài 1:)
    /^(?:câu|cau|bài|bai|c|q)\s*\d+\s*[:.-]\s*/i,
    // Từ khóa kết quả, đáp số
    /^(?:đáp\s+số|dap\s+so|đáp\s+án|dap\s+an|kết\s+quả|ket\s+qua|câu\s+trả\s+lời|cau\s+tra\s+loi|trả\s+lời|tra\s+loi|bài\s+làm|bai\s+lam|đs|ds|kq|da|ans)\s*[:=.-]?\s*/i,
    // Thao tác / suy nghĩ của học sinh
    /^(?:theo\s+em(?:\s+thì|\s+thấy)?|theo\s+e|em\s+nghĩ(?:\s+là)?|em\s+nghi|em\s+tính\s+ra(?:\s+được)?|em\s+tinh\s+ra|em\s+chọn(?:\s+đáp\s+án)?|em\s+chon|em\s+làm\s+ra|em\s+lam\s+ra|tính\s+ra(?:\s+được)?|tinh\s+ra)\s*[:,-]?\s*/i,
    // Liên từ, khẳng định, ước lượng
    /^(?:là|la|bằng|bang|bằng\s+khoảng|khoảng|khoang|xấp\s+xỉ|xap\s+xi|chừng|tầm|gần\s+bằng|ra|được|duoc)\s*[:=]?\s*/i,
    // Phép gán kết quả (VD: x = 1234, kết quả = 1234)
    /^[a-zA-Z\d\s]+\s*=\s*/i,
  ];

  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard++;
    for (const rx of prefixRegexes) {
      if (rx.test(str)) {
        str = str.replace(rx, '').trim();
        changed = true;
      }
    }
  }

  // 3. Danh sách các regex hậu tố tiếng Việt phổ biến
  const suffixRegexes = [
    // Dấu câu ở cuối
    /[.,;:!?'"“”‘’~]+$/i,
    // Kính ngữ, từ cảm thán ở cuối
    /\s+(?:ạ|a|thưa\s+thầy|thua\s+thay|thưa\s+cô|thua\s+co|thưa\s+thầy\s+cô|thua\s+thay\s+co|nhé\s+thầy|nhé\s+cô|nhé|nhe|nha|nhen|ạ\s+thầy|ạ\s+cô|ạ\s+em\s+cảm\s+ơn|ạ\s+ạ)[.,;:!?]*$/i,
    // Dấu câu còn sót lại
    /[.,;:!?'"“”‘’~]+$/i,
  ];

  changed = true;
  guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard++;
    for (const sRx of suffixRegexes) {
      if (sRx.test(str)) {
        str = str.replace(sRx, '').trim();
        changed = true;
      }
    }
  }

  return str;
}

/**
 * So khớp một phương án đáp án đơn lẻ với câu trả lời của học sinh
 * Hỗ trợ nhận diện thông minh tiền tố, hậu tố, dấu phân cách nghìn và đơn vị đo
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

  // 3. So khớp sau khi làm sạch tiền tố và hậu tố (Prefixes & Suffixes)
  // Xử lý hoàn hảo: "đáp số 1234 thưa thầy", "thưa thầy là 1234 ạ", "bằng 3072 GB", "theo em là thông tin thưa cô"
  const sCleaned = cleanPrefixesAndSuffixes(rawStudent);
  const cCleaned = cleanPrefixesAndSuffixes(rawOption);

  const sCleanNorm = normalizeKeywords(sCleaned);
  const cCleanNorm = normalizeKeywords(cCleaned);
  if (sCleanNorm === cCleanNorm) return true;

  const sCleanNoSpace = sCleanNorm.replace(/\s+/g, '');
  const cCleanNoSpace = cCleanNorm.replace(/\s+/g, '');
  if (sCleanNoSpace && sCleanNoSpace === cCleanNoSpace) return true;

  // 4. So khớp số học thông minh:
  // Phân tách hàng nghìn (1.234 vs 1234 vs 1,234 vs 1 234)
  const sNoNumSeparator = sCleanNoSpace.replace(/[.,]/g, '');
  const cNoNumSeparator = cCleanNoSpace.replace(/[.,]/g, '');
  if (
    sNoNumSeparator &&
    cNoNumSeparator &&
    sNoNumSeparator === cNoNumSeparator &&
    /^\d+$/.test(sNoNumSeparator)
  ) {
    return true;
  }

  // So khớp số thập phân (thay dấu phẩy bằng dấu chấm: 0,25 vs 0.25)
  const sDecimal = sCleanNoSpace.replace(/,/g, '.');
  const cDecimal = cCleanNoSpace.replace(/,/g, '.');
  if (sDecimal === cDecimal) return true;

  const numS = Number(sDecimal);
  const numC = Number(cDecimal);
  if (!isNaN(numS) && !isNaN(numC) && numS === numC) {
    return true;
  }

  // 5. So khớp số kèm đơn vị đo (VD: Đáp án chuẩn "3072" mà HS gõ "3072 GB" hoặc ngược lại)
  const unitRegex = /\s*(?:gb|mb|kb|tb|byte|bit|gigabyte|megabyte|kilobyte|terabyte|bo\s+phim|hoc\s+sinh|trang|anh|buc\s+anh|tep|file|m|cm|km|kg|gam|g|lit|l|s|giay|phut|gio|%)\.?$/i;
  const sNoUnit = sCleanNorm.replace(unitRegex, '').trim();
  const cNoUnit = cCleanNorm.replace(unitRegex, '').trim();
  if (sNoUnit && cNoUnit) {
    if (sNoUnit === cNoUnit) return true;
    if (sNoUnit.replace(/[.,\s]/g, '') === cNoUnit.replace(/[.,\s]/g, '')) return true;
  }

  // 6. Nhận diện số cốt lõi trong câu trả lời tự luận của học sinh:
  // Nếu đáp án chuẩn là một con số (VD: cNoNumSeparator = "1234" hoặc "3072"):
  // Kiểm tra nếu trong câu trả lời đã làm sạch của học sinh có chứa con số này như một cụm số độc lập
  if (/^\d+$/.test(cNoNumSeparator) && cNoNumSeparator.length >= 2) {
    const targetNum = cNoNumSeparator;
    // Chuẩn hóa câu học sinh bằng cách gỡ dấu phân tách nghìn trong các cụm số
    const sNormalizedNumbers = sCleanNorm.replace(/(\d+)[.,](\d{3})/g, '$1$2');
    const numberWordRegex = new RegExp(`(?:^|[^\\d])${targetNum}(?:[^\\d]|$)`);
    if (numberWordRegex.test(sNormalizedNumbers)) {
      return true;
    }
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
    questionResults: newResults.map((r) => {
      const existingQ = submission.questionResults?.find((q) => q.orderNumber === r.orderNumber);
      const matchedQ = questions?.find((q) => (q.orderNumber || 0) === r.orderNumber);
      return {
        questionId: existingQ?.questionId || matchedQ?.id || r.orderNumber,
        orderNumber: r.orderNumber,
        studentAnswer: r.studentAnswer,
        correctAnswer: existingQ?.correctAnswer || matchedQ?.correctAnswer || '',
        isCorrect: r.earnedPoints > 0,
        earnedPoints: r.earnedPoints,
        maxPoints: existingQ?.maxPoints || matchedQ?.points || (r.earnedPoints > 0 ? r.earnedPoints : 1),
        category: existingQ?.category || matchedQ?.category || 'Chung',
      };
    }),
  };
}
