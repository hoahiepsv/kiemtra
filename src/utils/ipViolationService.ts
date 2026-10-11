import { SubmissionRecord } from '../types';
import { parseSubmissionDateTime } from './syncService';
import { isDateWithinExamPeriod } from './examDateService';

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
  latestViolationTime: number; // Timestamp mili-giây của lần vi phạm (nộp bài) gần nhất
  latestViolationTimeFormatted: string; // Chuỗi hiển thị ngày giờ vi phạm gần nhất (e.g. "8:15 04/09/2026")
  latestStudentName?: string;
  latestClassName?: string;
  latestScore?: number;
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
 * và trích xuất tất cả IP đã làm bài từ 2 lần trở lên.
 * MẶC ĐỊNH SẮP XẾP THEO THỜI GIAN VI PHẠM MỚI NHẤT LÊN ĐẦU.
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
      // Sắp xếp theo thứ tự thời gian nộp bài / STT (Từ lần 1 -> các lần nộp sau)
      const sorted = [...records].sort((a, b) => {
        const sttA = Number(a.stt) || 0;
        const sttB = Number(b.stt) || 0;
        if (sttA > 0 && sttB > 0 && sttA !== sttB) {
          return sttA - sttB;
        }
        const timeA = Math.max(
          a.timestamp || 0,
          parseSubmissionDateTime(a.endTime),
          parseSubmissionDateTime(a.startTime)
        );
        const timeB = Math.max(
          b.timestamp || 0,
          parseSubmissionDateTime(b.endTime),
          parseSubmissionDateTime(b.startTime)
        );
        return timeA - timeB;
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

      // Xác định bài nộp vi phạm mới nhất (bài nộp cuối cùng của IP này)
      const latestSub = sorted[sorted.length - 1];
      const latestViolationTime = Math.max(
        latestSub?.timestamp || 0,
        parseSubmissionDateTime(latestSub?.endTime),
        parseSubmissionDateTime(latestSub?.startTime)
      );
      const latestViolationTimeFormatted =
        latestSub?.endTime ||
        latestSub?.startTime ||
        (latestViolationTime > 0 ? new Date(latestViolationTime).toLocaleString('vi-VN') : 'Mới nộp');

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
        latestViolationTime,
        latestViolationTimeFormatted,
        latestStudentName: latestSub?.studentName || '',
        latestClassName: latestSub?.className || '',
        latestScore: Number(latestSub?.totalScore) || 0,
      });
    }
  });

  // Bước 3: Sắp xếp theo thời gian vi phạm mới nhất (Mới nhất lên đầu bảng)
  return violationGroups.sort((a, b) => {
    // 1. So sánh thời gian vi phạm mới nhất (timestamp lớn hơn = mới hơn)
    if (a.latestViolationTime !== b.latestViolationTime && a.latestViolationTime > 0 && b.latestViolationTime > 0) {
      return b.latestViolationTime - a.latestViolationTime;
    }
    // 2. Dự phòng: So sánh theo STT bài nộp lớn nhất (STT dòng trên Sheet lớn hơn = nộp sau)
    const maxSttA = Math.max(...a.submissions.map((s) => Number(s.stt) || 0), 0);
    const maxSttB = Math.max(...b.submissions.map((s) => Number(s.stt) || 0), 0);
    if (maxSttA !== maxSttB && maxSttA > 0 && maxSttB > 0) {
      return maxSttB - maxSttA;
    }
    // 3. Dự phòng tiếp theo: Số lần vi phạm nhiều hơn
    return b.submissionCount - a.submissionCount;
  });
}

/**
 * Hàm sắp xếp linh hoạt danh sách vi phạm IP
 */
export function sortIpViolations(
  groups: IpViolationGroup[],
  sortBy: 'newest' | 'count_desc' | 'oldest' = 'newest'
): IpViolationGroup[] {
  const cloned = [...groups];
  return cloned.sort((a, b) => {
    if (sortBy === 'newest') {
      if (a.latestViolationTime !== b.latestViolationTime && a.latestViolationTime > 0 && b.latestViolationTime > 0) {
        return b.latestViolationTime - a.latestViolationTime;
      }
      const maxSttA = Math.max(...a.submissions.map((s) => Number(s.stt) || 0), 0);
      const maxSttB = Math.max(...b.submissions.map((s) => Number(s.stt) || 0), 0);
      if (maxSttA !== maxSttB) return maxSttB - maxSttA;
      return b.submissionCount - a.submissionCount;
    }
    if (sortBy === 'oldest') {
      if (a.latestViolationTime !== b.latestViolationTime && a.latestViolationTime > 0 && b.latestViolationTime > 0) {
        return a.latestViolationTime - b.latestViolationTime;
      }
      const maxSttA = Math.max(...a.submissions.map((s) => Number(s.stt) || 0), 0);
      const maxSttB = Math.max(...b.submissions.map((s) => Number(s.stt) || 0), 0);
      if (maxSttA !== maxSttB) return maxSttA - maxSttB;
      return a.submissionCount - b.submissionCount;
    }
    if (sortBy === 'count_desc') {
      if (b.submissionCount !== a.submissionCount) {
        return b.submissionCount - a.submissionCount;
      }
      return (b.latestViolationTime || 0) - (a.latestViolationTime || 0);
    }
    return 0;
  });
}

/**
 * Kiểm tra xem chuỗi IP hoặc trạng thái có chứa dấu hiệu chặn (Block hoặc Chặn) hay không
 */
export function hasBlockMarker(ipStr: string | null | undefined): boolean {
  if (!ipStr) return false;
  return /\bblock(ed)?\b|ch[aặ]n/i.test(String(ipStr));
}

/**
 * Trích xuất địa chỉ IP thuần (loại bỏ hoàn toàn tiền tố/hậu tố Block, dấu gạch nối thừa...)
 * Ví dụ: "113.169.89.135 - Block", "113.169.89.135 -", "Block - 113.169.89.135" -> "113.169.89.135"
 */
export function extractCleanIp(ipStr: string | null | undefined): string {
  if (!ipStr) return '';
  let ip = String(ipStr).trim();
  // Loại bỏ tiền tố: "Block - 113.169...", "Block: 113.169...", "Block 113.169..."
  ip = ip.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, '');
  // Loại bỏ hậu tố: "... - Block", "...: Block", "... Block"
  ip = ip.replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, '');
  // Loại bỏ các ký tự dấu gạch nối, hai chấm thừa ở đầu hoặc cuối nếu có
  ip = ip.replace(/^[-:_,\s]+|[-:_,\s]+$/g, '').trim();
  return normalizeIpAddress(ip);
}

/**
 * Định dạng địa chỉ IP chuẩn để lưu trữ (Lưu IP thuần không gắn đuôi, trạng thái ghi sang Cột J)
 */
export function formatBlockedIpString(ip: string, _style: 'suffix' | 'prefix' = 'suffix'): string {
  const clean = extractCleanIp(ip);
  return clean || '';
}

/**
 * Trích xuất toàn bộ danh sách các IP bị chặn từ mảng kết quả bài nộp của Google Sheet data2
 * (Nhận diện qua Cột J - Trạng thái: "Chặn" HOẶC Cột I còn chứa dấu hiệu Block cũ để tương thích ngược)
 */
export function extractBlockedIpsFromSubmissions(
  submissions: { ipAddress?: string; status?: string; isBlocked?: boolean; endTime?: string; startTime?: string; timestamp?: number }[],
  examDateRange?: string | null
): string[] {
  if (!Array.isArray(submissions) || submissions.length === 0) return [];
  const blockedMap = new Map<string, string>();
  for (const s of submissions) {
    // Nếu có cấu hình khoảng thời gian kỳ kiểm tra (ô D3):
    // Chỉ các bài nộp phát sinh trong kỳ kiểm tra hiện tại mới tính vi phạm cho kỳ này!
    // Các vi phạm từ kỳ cũ trước ngày mở kỳ mới sẽ tự động được hoàn nguyên / tính lại từ đầu
    if (examDateRange) {
      const subTime = s.endTime || s.startTime || s.timestamp || 0;
      if (!isDateWithinExamPeriod(subTime, examDateRange)) {
        continue;
      }
    }

    const rawIp = String(s.ipAddress || '').trim();
    const rawStatus = String(s.status || '').trim();
    const isStatusBlocked = hasBlockMarker(rawStatus) || s.isBlocked === true;
    const isIpBlocked = hasBlockMarker(rawIp);

    if (isStatusBlocked || isIpBlocked) {
      const clean = extractCleanIp(rawIp);
      if (clean) {
        blockedMap.set(clean, clean);
      }
    }
  }
  return Array.from(blockedMap.values());
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
 * Thêm một địa chỉ IP vào danh sách chặn thủ công (lưu IP thuần, trạng thái "Chặn" ghi vào Cột J)
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

  const nextList = [...currentList, clean];
  return {
    success: true,
    list: nextList,
    message: `Đã thêm IP ${clean} vào danh sách chặn (Trạng thái: Chặn)!`,
    formattedIp: clean,
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

/**
 * Ghi nhận thêm 1 lần vào làm bài của IP trên JSON bộ nhớ máy này (phân biệt theo kỳ kiểm tra)
 */
export function recordIpEntryOnDevice(
  clientIp: string | null | undefined,
  examPeriodKey = 'current_exam_period'
): void {
  if (!clientIp) return;
  const clean = extractCleanIp(clientIp);
  if (!clean) return;
  try {
    const raw = localStorage.getItem('kiem_tra_thuong_xuyen_ip_entries_by_period');
    const data = raw ? JSON.parse(raw) : {};
    if (!data[examPeriodKey] || typeof data[examPeriodKey] !== 'object') {
      data[examPeriodKey] = {};
    }
    data[examPeriodKey][clean] = (Number(data[examPeriodKey][clean]) || 0) + 1;
    localStorage.setItem('kiem_tra_thuong_xuyen_ip_entries_by_period', JSON.stringify(data));

    // Đồng bộ flat để tương thích ngược
    const flatRaw = localStorage.getItem('kiem_tra_thuong_xuyen_ip_entries');
    const flatData = flatRaw ? JSON.parse(flatRaw) : {};
    flatData[clean] = (Number(flatData[clean]) || 0) + 1;
    localStorage.setItem('kiem_tra_thuong_xuyen_ip_entries', JSON.stringify(flatData));
  } catch (err) {
    console.error('Lỗi khi ghi nhận lượt vào làm:', err);
  }
}

/**
 * Đếm số lần 1 IP đã vào làm bài trong KỲ KIỂM TRA HIỆN TẠI
 * Nếu là đề/kỳ mới (hoặc ngoài khoảng thời gian cũ) -> số lần tự động tính lại từ đầu (0 lần)!
 */
export function countIpSubmissionsOnDevice(
  clientIp: string | null | undefined,
  examDateRange?: string | null,
  examPeriodKey = 'current_exam_period'
): number {
  if (!clientIp) return 0;
  const clean = extractCleanIp(clientIp);
  if (!clean) return 0;

  try {
    // 1. Số lần đã vào làm bài trong kỳ kiểm tra hiện tại
    let entryCount = 0;
    const periodRaw = localStorage.getItem('kiem_tra_thuong_xuyen_ip_entries_by_period');
    if (periodRaw) {
      const periodData = JSON.parse(periodRaw);
      if (periodData && periodData[examPeriodKey] && typeof periodData[examPeriodKey] === 'object') {
        entryCount = Number(periodData[examPeriodKey][clean]) || 0;
      }
    }

    // Nếu chưa có cấu hình period cụ thể và không có examDateRange -> dùng flat
    if (entryCount === 0 && !examDateRange) {
      const entriesRaw = localStorage.getItem('kiem_tra_thuong_xuyen_ip_entries');
      if (entriesRaw) {
        const parsed = JSON.parse(entriesRaw);
        if (parsed && typeof parsed === 'object') {
          entryCount = Number(parsed[clean]) || 0;
        }
      }
    }

    // 2. Số lần đã nộp và lưu trong lịch sử trên máy
    // CHỈ TÍNH BÀI NỘP NẰM TRONG KỲ KIỂM TRA HIỆN TẠI (Ô D3)
    let historyCount = 0;
    const raw = localStorage.getItem('kiem_tra_thuong_xuyen_history');
    if (raw) {
      const history: SubmissionRecord[] = JSON.parse(raw);
      if (Array.isArray(history)) {
        historyCount = history.filter((item) => {
          const itemIp = extractCleanIp(item.ipAddress);
          if (!itemIp || itemIp !== clean) return false;

          // Nếu có khoảng thời gian thi D3: chỉ tính bài nộp trong khoảng này
          if (examDateRange) {
            const timeVal = item.endTime || item.startTime || item.timestamp || 0;
            return isDateWithinExamPeriod(timeVal, examDateRange);
          }
          return true;
        }).length;
      }
    }

    return Math.max(entryCount, historyCount);
  } catch (err) {
    console.warn('Lỗi khi đếm số lần IP làm bài:', err);
    return 0;
  }
}

/**
 * Kiểm tra xem IP có vi phạm số lần vào làm cho phép trong kỳ kiểm tra này hay không
 */
export function isIpOverSubmissionLimit(
  clientIp: string | null | undefined,
  maxAllowed: number | undefined,
  enableBlocking = true,
  examDateRange?: string | null,
  examPeriodKey = 'current_exam_period'
): boolean {
  if (!enableBlocking) return false;
  const limit = Number(maxAllowed);
  if (isNaN(limit) || limit <= 0) return false;

  const count = countIpSubmissionsOnDevice(clientIp, examDateRange, examPeriodKey);
  return count >= limit;
}

/**
 * Tự động nhận diện thay đổi kỳ kiểm tra để hoàn nguyên / xóa bộ nhớ đếm tạm cũ
 */
export function checkAndResetPeriodOnDevice(newPeriodKey: string): boolean {
  try {
    const lastKey = localStorage.getItem('kiem_tra_last_known_period_key');
    if (lastKey && lastKey !== newPeriodKey) {
      // Đã đổi sang kỳ thi mới: hoàn nguyên bộ đếm cũ trên máy học sinh để tính lại từ đầu
      localStorage.removeItem('kiem_tra_thuong_xuyen_ip_entries');
      localStorage.removeItem('kiem_tra_thuong_xuyen_ip_entries_by_period');
      localStorage.setItem('kiem_tra_last_known_period_key', newPeriodKey);
      return true;
    }
    if (!lastKey) {
      localStorage.setItem('kiem_tra_last_known_period_key', newPeriodKey);
    }
  } catch {}
  return false;
}

