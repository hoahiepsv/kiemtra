/**
 * Service quản lý khoảng thời gian cho phép làm kiểm tra (Ô D3 trên Google Sheet data1)
 * Định dạng chuẩn: "DD/MM/YYYY - DD/MM/YYYY" (ví dụ: "29/09/2026 - 12/10/2026")
 *
 * Chức năng chính:
 * 1. Phân tích chuỗi ngày giờ từ ô D3
 * 2. Xác định trạng thái kỳ kiểm tra: Chưa bắt đầu / Đang mở / Đã hết hạn (tự động TẮT)
 * 3. Nhận diện thay đổi kỳ kiểm tra để tự động hoàn nguyên số lần làm của học sinh (tính lại từ đầu cho đề/kỳ mới)
 */

import { parseSubmissionDateTime } from './syncService';

export interface ExamDateStatus {
  status: 'no_limit' | 'not_started' | 'active' | 'expired';
  isExamAllowed: boolean;
  startDate: Date | null;
  endDate: Date | null;
  startDateFormatted: string;
  endDateFormatted: string;
  message: string;
  rawRange: string;
}

/**
 * Phân tích một chuỗi ngày (DD/MM/YYYY hoặc YYYY-MM-DD) thành đối tượng Date
 */
export function parseSingleDate(dateStr?: string | null, isEndOfDay = false): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  // 1. Dạng DD/MM/YYYY (ví dụ: "29/09/2026")
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (isEndOfDay) {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // 2. Dạng YYYY-MM-DD (từ thẻ <input type="date">)
  const ymdMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (isEndOfDay) {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // 3. Date.parse chuẩn
  const ts = Date.parse(s);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    if (isEndOfDay) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  return null;
}

/**
 * Phân tích khoảng thời gian trong ô D3 thành ngày bắt đầu và ngày kết thúc
 * Hỗ trợ các định dạng phân cách: " - ", "-", " đến ", " to ", " – "
 */
export function parseExamDateRange(rangeStr?: string | null): {
  startDate: Date | null;
  endDate: Date | null;
  raw: string;
} {
  const raw = String(rangeStr || '').trim();
  if (!raw) {
    return { startDate: null, endDate: null, raw: '' };
  }

  // Tách hai đầu khoảng thời gian
  // Ví dụ: "29/09/2026 - 12/10/2026"
  const separators = [' - ', ' – ', ' đến ', ' to ', '-', '–'];
  let startPart = '';
  let endPart = '';

  for (const sep of separators) {
    if (raw.includes(sep)) {
      const parts = raw.split(sep);
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        startPart = parts[0].trim();
        endPart = parts[1].trim();
        break;
      }
    }
  }

  if (startPart && endPart) {
    const startDate = parseSingleDate(startPart, false);
    const endDate = parseSingleDate(endPart, true);
    return { startDate, endDate, raw };
  }

  // Trường hợp chỉ nhập 1 ngày duy nhất
  const singleDate = parseSingleDate(raw, false);
  const singleEnd = parseSingleDate(raw, true);
  return { startDate: singleDate, endDate: singleEnd, raw };
}

/**
 * Định dạng Date thành DD/MM/YYYY
 */
export function formatDateToDmy(date?: Date | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Định dạng Date thành YYYY-MM-DD để đưa vào input type="date"
 */
export function formatDateToInputYmd(date?: Date | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ghép ngày bắt đầu và ngày kết thúc thành chuỗi chuẩn cho ô D3
 * Ví dụ: "29/09/2026 - 12/10/2026"
 */
export function buildExamDateRangeString(startDate?: Date | string | null, endDate?: Date | string | null): string {
  const startObj = typeof startDate === 'string' ? parseSingleDate(startDate, false) : startDate;
  const endObj = typeof endDate === 'string' ? parseSingleDate(endDate, true) : endDate;

  const startDmy = formatDateToDmy(startObj);
  const endDmy = formatDateToDmy(endObj);

  if (startDmy && endDmy) {
    return `${startDmy} - ${endDmy}`;
  }
  if (startDmy) return startDmy;
  if (endDmy) return endDmy;
  return '';
}

/**
 * Kiểm tra trạng thái kỳ kiểm tra theo ô D3 so với thời điểm hiện tại
 */
export function checkExamDateStatus(rangeStr?: string | null, now = new Date()): ExamDateStatus {
  const rawRange = String(rangeStr || '').trim();
  const { startDate, endDate } = parseExamDateRange(rawRange);

  if (!startDate && !endDate) {
    return {
      status: 'no_limit',
      isExamAllowed: true,
      startDate: null,
      endDate: null,
      startDateFormatted: '',
      endDateFormatted: '',
      message: 'Không giới hạn ngày thi',
      rawRange,
    };
  }

  const nowTime = now.getTime();
  const startFormatted = formatDateToDmy(startDate);
  const endFormatted = formatDateToDmy(endDate);

  // 1. Chưa tới ngày mở thi
  if (startDate && nowTime < startDate.getTime()) {
    return {
      status: 'not_started',
      isExamAllowed: false,
      startDate,
      endDate,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted,
      message: `Chưa đến thời gian làm bài (Mở từ: ${startFormatted})`,
      rawRange,
    };
  }

  // 2. Đã hết hạn kỳ kiểm tra (sau ngày kết thúc) -> TỰ ĐỘNG TẮT
  if (endDate && nowTime > endDate.getTime()) {
    return {
      status: 'expired',
      isExamAllowed: false,
      startDate,
      endDate,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted,
      message: `Kỳ kiểm tra đã kết thúc vào ngày ${endFormatted} (Đã tự động tắt)`,
      rawRange,
    };
  }

  // 3. Đang trong khoảng thời gian hợp lệ
  return {
    status: 'active',
    isExamAllowed: true,
    startDate,
    endDate,
    startDateFormatted: startFormatted,
    endDateFormatted: endFormatted,
    message: `Đang trong thời gian cho phép làm bài (${startFormatted} - ${endFormatted})`,
    rawRange,
  };
}

/**
 * Kiểm tra xem một thời điểm nộp bài (timestamp hoặc ngày giờ chuỗi) có nằm trong khoảng thời gian D3 hay không
 */
export function isDateWithinExamPeriod(
  dateToCheck: Date | number | string | null | undefined,
  rangeStr?: string | null
): boolean {
  if (!rangeStr || !rangeStr.trim()) return true; // Không cấu hình D3 thì mặc định hợp lệ
  const { startDate, endDate } = parseExamDateRange(rangeStr);
  if (!startDate && !endDate) return true;

  let checkTime = 0;
  if (dateToCheck instanceof Date) {
    checkTime = dateToCheck.getTime();
  } else if (typeof dateToCheck === 'number') {
    checkTime = dateToCheck;
  } else if (typeof dateToCheck === 'string') {
    checkTime = parseSubmissionDateTime(dateToCheck);
    if (!checkTime) {
      const parsed = parseSingleDate(dateToCheck, false);
      checkTime = parsed ? parsed.getTime() : 0;
    }
  }

  if (checkTime <= 0) return true;

  if (startDate && checkTime < startDate.getTime()) return false;
  if (endDate && checkTime > endDate.getTime()) return false;
  return true;
}

/**
 * Sinh khóa định danh duy nhất cho kỳ kiểm tra (dùng để phát hiện khi thầy/cô đổi kỳ thi, đổi đề)
 * Khi khóa này thay đổi -> thiết bị biết kỳ thi mới đã bắt đầu và cho phép tính lại số lần từ đầu!
 */
export function getExamPeriodKey(config?: {
  examDateRange?: string;
  examName?: string;
  subject?: string;
  durationMinutes?: number;
}): string {
  if (!config) return 'default_exam_period';
  const range = (config.examDateRange || '').trim();
  const name = (config.examName || '').trim();
  const sub = (config.subject || '').trim();
  return `${range}__${name}__${sub}`;
}
