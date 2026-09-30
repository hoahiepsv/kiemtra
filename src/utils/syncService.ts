import { SubmissionRecord, DraftExam, Question, ExamConfig } from '../types';
import { formatExamDateTime, formatExamDuration } from './dateUtils';

const DRAFT_STORAGE_KEY = 'kiem_tra_thuong_xuyen_draft';
const UNSYNCED_STORAGE_KEY = 'kiem_tra_thuong_xuyen_unsynced';
const SUBMISSION_HISTORY_KEY = 'kiem_tra_thuong_xuyen_history';

// 0. Chuẩn hóa đường dẫn hoặc ID Google Apps Script Web App
export function normalizeAppsScriptUrl(input: string | undefined): string {
  if (!input || !input.trim()) return '';
  const trimmed = input.trim();
  // Nếu người dùng nhập ID deployment (ví dụ: AKfycbz9zQcN...)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://script.google.com/macros/s/${trimmed}/exec`;
  }
  // Nếu người dùng nhập link web app nhưng thiếu /exec ở cuối
  if (trimmed.includes('script.google.com/macros/s/') && !trimmed.endsWith('/exec')) {
    return `${trimmed.replace(/\/+$/, '')}/exec`;
  }
  return trimmed;
}

// 1. Quản lý bản lưu nháp bài làm (Draft Exam)
export function saveDraftExam(draft: DraftExam): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    console.error('Error saving draft exam:', e);
  }
}

export function loadDraftExam(): DraftExam | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading draft exam:', e);
    return null;
  }
}

export function clearDraftExam(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing draft exam:', e);
  }
}

// 2. Lịch sử bài làm cá nhân
export function saveSubmissionHistory(record: SubmissionRecord): void {
  try {
    const existing = getSubmissionHistory();
    existing.unshift(record);
    localStorage.setItem(SUBMISSION_HISTORY_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.error('Error saving history:', e);
  }
}

export function clearSubmissionHistory(): void {
  try {
    localStorage.removeItem(SUBMISSION_HISTORY_KEY);
  } catch (e) {
    console.error('Error clearing history:', e);
  }
}

/**
 * Xóa sạch toàn bộ dữ liệu bài thi (examdata) trên thiết bị:
 * - Lịch sử nộp bài (submission history)
 * - Bài làm nháp (draft exam)
 * - Hàng đợi chưa đồng bộ (unsynced submissions)
 * - Bộ nhớ tạm câu hỏi (questions cache)
 */
export function clearAllExamData(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(SUBMISSION_HISTORY_KEY);
    localStorage.removeItem(UNSYNCED_STORAGE_KEY);
    localStorage.removeItem('kiem_tra_thuong_xuyen_questions');
    localStorage.removeItem('kiem_tra_thuong_xuyen_draft');
    localStorage.removeItem('exam_student_client_ip');
  } catch (e) {
    console.error('Error clearing all exam data:', e);
  }
}

export function syncSubmissionsFromSheetToHistory(sheetRecords: SubmissionRecord[]): SubmissionRecord[] {
  try {
    const list = Array.isArray(sheetRecords) ? [...sheetRecords] : [];
    // Sort newest first
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Lọc bỏ trùng lặp nếu trong Google Sheets trước đây đã bị ghi nhiều dòng cho 1 học sinh
    const seen = new Set<string>();
    const uniqueList: SubmissionRecord[] = [];
    for (const item of list) {
      const nameKey = `${String(item.studentName || '').toLowerCase().trim()}_${String(item.className || '').toLowerCase().trim()}`;
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        uniqueList.push(item);
      }
    }

    localStorage.setItem(SUBMISSION_HISTORY_KEY, JSON.stringify(uniqueList.slice(0, 300)));
    return uniqueList;
  } catch (e) {
    console.error('Error syncing submissions from sheet to history:', e);
    return sheetRecords || [];
  }
}

export function deleteSubmissionFromHistory(studentName: string, className?: string, endTime?: string): SubmissionRecord[] {
  try {
    const existing = getSubmissionHistory();
    const targetName = String(studentName || '').toLowerCase().trim();
    const targetClass = String(className || '').toLowerCase().trim();

    const updated = existing.filter((item) => {
      const matchName = String(item.studentName || '').toLowerCase().trim() === targetName;
      const matchClass = !className || String(item.className || '').toLowerCase().trim() === targetClass;
      const matchTime = !endTime || item.endTime === endTime;
      return !(matchName && matchClass && matchTime);
    });
    localStorage.setItem(SUBMISSION_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting submission from history:', e);
    return getSubmissionHistory();
  }
}

/**
 * Cập nhật một bản ghi nộp bài trong lịch sử lưu trữ (dùng khi giáo viên chấm lại câu tự luận)
 * Thay thế trực tiếp ô điểm của học sinh mà KHÔNG tạo thêm tên học sinh
 */
export function updateSubmissionInHistory(updatedRecord: SubmissionRecord): SubmissionRecord[] {
  try {
    const existing = getSubmissionHistory();
    const updatedName = String(updatedRecord.studentName || '').toLowerCase().trim();
    const updatedClass = String(updatedRecord.className || '').toLowerCase().trim();

    // 1. Tìm vị trí của học sinh: Ưu tiên số 1 là Họ tên + Lớp (đặc trưng duy nhất của học sinh)
    let foundIndex = existing.findIndex((item) => {
      const matchName = String(item.studentName || '').toLowerCase().trim() === updatedName;
      const matchClass = !updatedClass || String(item.className || '').toLowerCase().trim() === updatedClass;
      return matchName && matchClass;
    });

    // 2. Nếu không tìm thấy bằng tên, mới tìm theo STT nếu có
    if (foundIndex === -1 && updatedRecord.stt !== undefined && updatedRecord.stt !== null && Number(updatedRecord.stt) > 0) {
      foundIndex = existing.findIndex((item) => Number(item.stt) === Number(updatedRecord.stt));
    }

    if (foundIndex !== -1) {
      // Giữ nguyên STT ban đầu của học sinh
      const originalSTT = existing[foundIndex].stt ?? updatedRecord.stt;
      updatedRecord.stt = originalSTT;

      // Thay thế trực tiếp ô điểm và kết quả của học sinh này
      existing[foundIndex] = {
        ...existing[foundIndex],
        ...updatedRecord,
        stt: originalSTT,
        totalScore: updatedRecord.totalScore,
        scoreString: updatedRecord.scoreString,
        questionResults: updatedRecord.questionResults,
      };

      // Đồng thời dọn sạch bất kỳ bản ghi trùng lặp nào của học sinh này
      const targetSTT = originalSTT;
      const deduplicated = existing.filter((item, idx) => {
        if (idx === foundIndex) return true;
        const sameName = String(item.studentName || '').toLowerCase().trim() === updatedName;
        const sameClass = !updatedClass || String(item.className || '').toLowerCase().trim() === updatedClass;
        const sameSTT = targetSTT !== undefined && item.stt === targetSTT;
        return !(sameSTT || (sameName && sameClass));
      });

      localStorage.setItem(SUBMISSION_HISTORY_KEY, JSON.stringify(deduplicated));
      return deduplicated;
    } else {
      // Chỉ khi chưa từng có thì mới thêm vào
      existing.unshift(updatedRecord);
      localStorage.setItem(SUBMISSION_HISTORY_KEY, JSON.stringify(existing));
      return existing;
    }
  } catch (e) {
    console.error('Error updating submission in history:', e);
    return getSubmissionHistory();
  }
}

export function getSubmissionHistory(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      studentName: String(item.studentName ?? 'Học sinh'),
      className: String(item.className ?? ''),
    }));
  } catch {
    return [];
  }
}

// 3. Hàng đợi đồng bộ khi ngoại tuyến (Offline Sync Queue)
export function queueUnsyncedSubmission(record: SubmissionRecord): void {
  try {
    const queue = getUnsyncedSubmissions();
    queue.push(record);
    localStorage.setItem(UNSYNCED_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error queueing unsynced submission:', e);
  }
}

export function getUnsyncedSubmissions(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(UNSYNCED_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function removeUnsyncedSubmission(timestamp: number): void {
  try {
    const queue = getUnsyncedSubmissions().filter(item => item.timestamp !== timestamp);
    localStorage.setItem(UNSYNCED_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error removing unsynced submission:', e);
  }
}

// 4. Gửi kết quả lên Google Sheets (data2)
export async function sendSubmissionToData2(
  data2Url: string,
  record: SubmissionRecord,
  options?: { isUpdate?: boolean }
): Promise<{ success: boolean; message: string }> {
  const normalizedUrl = normalizeAppsScriptUrl(data2Url);
  if (!normalizedUrl) {
    return {
      success: true,
      message: 'Đã lưu kết quả thành công vào bộ nhớ hệ thống (Chưa cấu hình Link Google Sheets data2).',
    };
  }

  const isUpdate = options?.isUpdate === true;

  // Xây dựng URL kèm tham số truy vấn: Đảm bảo dù Google Apps Script đọc e.parameter hay e.postData đều nhận diện chuẩn lệnh sửa điểm
  let targetUrl = normalizedUrl;
  try {
    const urlObj = new URL(normalizedUrl);
    if (isUpdate) {
      urlObj.searchParams.set('action', 'update');
      urlObj.searchParams.set('isUpdate', 'true');
      urlObj.searchParams.set('studentName', record.studentName || '');
      urlObj.searchParams.set('className', record.className || '');
      urlObj.searchParams.set('totalScore', String(record.totalScore ?? 0));
      urlObj.searchParams.set('scoreString', record.scoreString || '');
      if (record.stt) {
        urlObj.searchParams.set('stt', String(record.stt));
      }
    }
    targetUrl = urlObj.toString();
  } catch {
    targetUrl = normalizedUrl;
  }

  const payload = {
    action: isUpdate ? 'update' : 'submit',
    isUpdate: isUpdate,
    stt: record.stt,
    studentName: record.studentName,
    className: record.className,
    totalScore: record.totalScore,
    scoreString: record.scoreString,
    startTime: record.startTime,
    endTime: record.endTime,
    totalDuration: record.totalDuration,
    timestamp: record.timestamp,
    ip: record.ipAddress || '',
    ipAddress: record.ipAddress || '',
    ipHocSinh: record.ipAddress || '',
    clientIp: record.ipAddress || '',
    col9: record.ipAddress || '',
    ipThueBao: record.ipAddress || '',
  };

  try {
    // Gửi bằng mode 'no-cors' với Content-Type text/plain để tránh browser chặn redirect 302 của Apps Script
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: isUpdate ? 'Đã lưu thay thế điểm số học sinh thành công!' : 'Đã gửi điểm cho giáo viên',
    };
  } catch (error) {
    console.warn('Lỗi khi gửi kết quả lên Google Sheet data2:', error);
    // CHỈ đưa vào hàng đợi ngoại tuyến nếu là bài nộp mới. TUYỆT ĐỐI không đưa lệnh sửa điểm (isUpdate) vào hàng đợi để tránh bị gửi lại thành bài nộp mới!
    if (!isUpdate) {
      queueUnsyncedSubmission(record);
    }
    return {
      success: false,
      message: isUpdate
        ? 'Không thể kết nối đến Google Sheets. Điểm đã được lưu trên máy của bạn!'
        : 'Mất kết nối mạng. Đã lưu vào hàng đợi ngoại tuyến và sẽ tự động đồng bộ khi có mạng lại!',
    };
  }
}

// 5. Tải nội dung câu hỏi và cấu hình từ Google Sheets data1
export async function fetchQuestionsFromData1(data1Url: string): Promise<{
  config?: Partial<ExamConfig>;
  questions?: Question[];
} | null> {
  const normalizedUrl = normalizeAppsScriptUrl(data1Url);
  if (!normalizedUrl) return null;
  try {
    const res = await fetch(normalizedUrl);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.questions)) {
      const config: Partial<ExamConfig> = {};
      if (json.config) {
        if (json.config.schoolName) config.schoolName = json.config.schoolName;
        if (json.config.examName && json.config.examName !== 'TÊN KỲ KIỂM TRA') {
          config.examName = json.config.examName;
        } else {
          config.examName = 'KIỂM TRA THƯỜNG XUYÊN';
        }
        if (json.config.subject && json.config.subject !== 'MÔN') {
          config.subject = json.config.subject;
        } else {
          config.subject = 'TIN HỌC 6';
        }
        if (json.config.durationMinutes) {
          config.durationMinutes = Number(json.config.durationMinutes) || 15;
        }
      }

      // Đảm bảo các câu hỏi có id và orderNumber chuẩn
      const questions: Question[] = json.questions.map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        orderNumber: q.orderNumber || idx + 1,
        type: q.type === 'Tự luận' ? 'Tự luận' : 'Trắc nghiệm 1 đáp án',
        content: q.content || `Câu hỏi ${idx + 1}`,
        optionA: q.optionA || '',
        optionB: q.optionB || '',
        optionC: q.optionC || '',
        optionD: q.optionD || '',
        correctAnswer: q.correctAnswer ? String(q.correctAnswer).trim() : '',
        points: Number(q.points) || 0.5,
        category: q.category || (q.type === 'Tự luận' ? 'Tự luận & Tính toán' : 'Trắc nghiệm'),
        explanation: q.explanation || '',
      }));

      return { config, questions };
    }
    return null;
  } catch (err) {
    console.warn('Lỗi khi tải câu hỏi từ data1:', err);
    return null;
  }
}

// 5.1. Lưu & Đồng bộ nội dung đề thi vào Google Sheets data1
export async function saveExamToData1(
  data1Url: string | undefined,
  config: ExamConfig,
  questions: Question[]
): Promise<{ success: boolean; message: string; syncedToData1: boolean }> {
  // Luôn lưu trữ an toàn vào LocalStorage (Bộ nhớ dữ liệu đề thi offline)
  try {
    localStorage.setItem('kiem_tra_thuong_xuyen_questions', JSON.stringify(questions));
    localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(config));
  } catch (err) {
    console.error('Lỗi khi lưu cục bộ vào storage:', err);
  }

  const normalizedUrl = normalizeAppsScriptUrl(data1Url);
  if (!normalizedUrl) {
    return {
      success: true,
      syncedToData1: false,
      message: `Đã lưu thành công ${questions.length} câu hỏi vào hệ thống data1. (Chưa cấu hình URL Google Sheets data1 để đồng bộ đám mây).`,
    };
  }

  const payload = {
    action: 'saveExam',
    config: {
      schoolName: config.schoolName,
      examName: config.examName,
      subject: config.subject,
      durationMinutes: config.durationMinutes,
    },
    questions: questions.map((q, idx) => ({
      orderNumber: q.orderNumber || idx + 1,
      type: q.type,
      content: q.content,
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctAnswer: q.correctAnswer,
      points: Number(q.points) || 1.0,
      category: q.category || '',
    })),
  };

  try {
    // Gửi bằng mode 'no-cors' với Content-Type text/plain để vượt qua rào cản CORS của Google Apps Script
    await fetch(normalizedUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      syncedToData1: true,
      message: `Đã lưu và đồng bộ thành công ${questions.length} câu hỏi vào Google Sheets data1!`,
    };
  } catch (error) {
    console.warn('Lỗi khi gửi đề thi lên data1:', error);
    return {
      success: true,
      syncedToData1: false,
      message: `Đã lưu vào bộ nhớ máy, nhưng gặp lỗi kết nối tới Google Sheets data1.`,
    };
  }
}

// 6. Tải bảng xếp hạng và danh sách nộp bài từ Google Sheets data2
export async function fetchSubmissionsFromData2(data2Url: string): Promise<SubmissionRecord[]> {
  if (!data2Url || !data2Url.trim()) return [];
  try {
    const res = await fetch(data2Url.trim());
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((item: any, index: number) => {
        let duration = item.totalDuration || '00:15';
        if (typeof duration === 'string' && duration.includes('T')) {
          try {
            const d = new Date(duration);
            // In Google Sheets, time-only values like 00:15 or 15:00 stored as 1899-12-30
            const m = d.getMinutes().toString().padStart(2, '0');
            const s = d.getSeconds().toString().padStart(2, '0');
            duration = `${m}:${s}`;
          } catch {
            duration = '00:15';
          }
        }
        const rawIp =
          item.ipAddress ??
          item.ipHocSinh ??
          item['IP học sinh'] ??
          item['IP Học Sinh'] ??
          item['ip_hoc_sinh'] ??
          item['Cột 9'] ??
          item['cột 9'] ??
          item.col9 ??
          item.column9 ??
          (Array.isArray(item) ? item[8] : undefined) ??
          item[8] ??
          item.ip ??
          item.clientIp ??
          item.ipThueBao ??
          item['Địa chỉ IP'] ??
          item['IP máy tính'] ??
          item['IP thuê bao'] ??
          item['IP'] ??
          '';
        const parsedIp = typeof rawIp === 'string' ? rawIp.trim() : String(rawIp || '').trim();
        return {
          stt: item.stt || index + 1,
          studentName: String(item.studentName ?? 'Học sinh'),
          className: String(item.className ?? '6a6'),
          totalScore: Number(item.totalScore) || 0,
          maxScore: 10,
          scoreString: item.scoreString || '',
          startTime: formatExamDateTime(item.startTime || (item.totalDuration?.includes('T') ? item.totalDuration : '')),
          endTime: formatExamDateTime(item.endTime),
          totalDuration: formatExamDuration(item.totalDuration, item.startTime, item.endTime),
          ipAddress: parsedIp,
          timestamp: Date.now() - (json.data.length - index) * 60000,
          syncedToData2: true,
          questionResults: [],
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('Không thể tải dữ liệu bảng xếp hạng từ data2:', err);
    return [];
  }
}

// 5. Thông báo đẩy (Web Push & In-app Browser Notifications)
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

export function showPushNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch {
      // ignore
    }
  }
}
