/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ứng dụng: KIỂM TRA THƯỜNG XUYÊN
 * Tone: Xanh dương nhạt
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { StudentStartForm } from './components/StudentStartForm';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { AppsScriptModal } from './components/AppsScriptModal';
import { PdfReportModal } from './components/PdfReportModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminMenuModal } from './components/AdminMenuModal';
import { ViolationWarningModal } from './components/ViolationWarningModal';
import { StudentReportExportModal } from './components/StudentReportExportModal';
import { ClassExcelExportModal } from './components/ClassExcelExportModal';
import { ExamEditorModal } from './components/ExamEditorModal';
import { HistoryModal } from './components/HistoryModal';
import {
  DEFAULT_EXAM_CONFIG,
  DEFAULT_QUESTIONS,
} from './data/defaultExamData';
import { formatScoreItem } from './utils/scoreStringUtils';
import { generateShuffledExam, ShuffledQuestion } from './utils/shuffleExam';
import {
  ExamConfig,
  Question,
  StudentAnswer,
  SubmissionRecord,
  DraftExam,
  AdminAuthSession,
} from './types';
import {
  saveDraftExam,
  loadDraftExam,
  clearDraftExam,
  sendSubmissionToData2,
  requestNotificationPermission,
  showPushNotification,
  getUnsyncedSubmissions,
  removeUnsyncedSubmission,
  fetchQuestionsFromData1,
  saveExamToData1,
  normalizeAppsScriptUrl,
  fetchSubmissionsFromData2,
  syncSubmissionsFromSheetToHistory,
  getSubmissionHistory,
  clearSubmissionHistory,
  deleteSubmissionFromHistory,
  updateSubmissionInHistory,
  clearAllExamData,
} from './utils/syncService';
import { checkEssayAnswerMatch } from './utils/gradeService';
import { fetchClientIp } from './utils/ipService';
import { formatStudentName, formatClassName } from './utils/studentFormatting';
import {
  isIpBlockedCheck,
  formatBlockedIpString,
  extractBlockedIpsFromSubmissions,
  extractCleanIp,
} from './utils/ipViolationService';

type AppScreen = 'start' | 'exam' | 'result';

export default function App() {
  // Config & Questions: ensure data1Url and data2Url always fallback to the user's provided URLs
  const [config, setConfig] = useState<ExamConfig>(() => {
    const saved = localStorage.getItem('kiem_tra_thuong_xuyen_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isOldData1 =
          !parsed.data1Url ||
          parsed.data1Url.includes('AKfycbzVR-FeTa2IZ20Nodk3ts3TUJqiadghILLCzyc8NZ6EAqzECm9gSbFVvA4EBmmOMpCO2A') ||
          parsed.data1Url.includes('AKfycbz9zQcN3CuaLsjyHEQeNiR5vJv_gfWhwBKDFL35k-q5VVQQwr0yBqBPCbyE1OF1A86jsw');
        const activeData1Url = isOldData1 ? DEFAULT_EXAM_CONFIG.data1Url : normalizeAppsScriptUrl(parsed.data1Url);
        const isOldData2 =
          !parsed.data2Url ||
          parsed.data2Url.includes('AKfycbw2ArWfvmE9lJQQRrUNIv6y_EXS8yOzdVRF7AILq3MXjRiNjgwooOsco_4TeCoC2O3o') ||
          parsed.data2Url.includes('AKfycbw3o7fi087YgBy8WjQZwWqavHeUN8jFfr6T3d2kuWkF4WMajeUlI8xajSP0ZkbPKGbB') ||
          parsed.data2Url.includes('AKfycbxxT7uc08D92XLmNaTvbXJvrrDBYN257-ByspJ00BtOJvankVLbdqfHKddfDm-7BG2s') ||
          parsed.data2Url.includes('AKfycbzS107icL7jGKWU8gZFzC87WeJCRkBYxmTnqJNAwu63Vm1QZomRjn2P2JczWS5OguLn') ||
          parsed.data2Url.includes('AKfycbzNodWtP-Y8mIC1ZFkH9iNCH7mhZYmUXDrlNL4-haoZ8OwUOBfMcYWmJwmDR_EHUPis') ||
          parsed.data2Url.includes('AKfycbxdcQlU6nlvMStQ4ZFKv_8PcZwrpZGhMIMBS2F_Zbs5anKC6ohq1xJZj07lp-wg6yAS') ||
          parsed.data2Url.includes('AKfycby75dcZbrgLbtg2tymL47LqvmkItG1RD4Tab7dPStqMxyw8k2MGtP_zur7qwkAI_OJU') ||
          parsed.data2Url.includes('AKfycbyn8IZAj243ZY4mkSVfAkZhUICFWwmKFq-FmjuYDZ4A1ghDhmuAri6Y9z61JlDBu8FY') ||
          parsed.data2Url.includes('AKfycbxnUdlNE9VUQvLuU-w6ZN0g7cm7jLtBh9KADa2zflWfKOl1kVnyDLPAiko5fF0LTYo9');
        const activeData2Url = isOldData2 ? DEFAULT_EXAM_CONFIG.data2Url : normalizeAppsScriptUrl(parsed.data2Url);
        return {
          ...DEFAULT_EXAM_CONFIG,
          ...parsed,
          data1Url: activeData1Url,
          data2Url: activeData2Url,
        };
      } catch {
        return DEFAULT_EXAM_CONFIG;
      }
    }
    return DEFAULT_EXAM_CONFIG;
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('kiem_tra_thuong_xuyen_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        return DEFAULT_QUESTIONS;
      }
    }
    return DEFAULT_QUESTIONS;
  });
  const [screen, setScreen] = useState<AppScreen>('start');
  const [isLoadingData1, setIsLoadingData1] = useState(false);

  // Student details & Exam State
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [answers, setAnswers] = useState<Record<number, StudentAnswer>>({});
  const [startFormattedTime, setStartFormattedTime] = useState('');
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationMinutes * 60);
  const [lastSavedText, setLastSavedText] = useState('Đã lưu nháp tự động');
  const [examQuestions, setExamQuestions] = useState<ShuffledQuestion[]>([]);

  // Submissions state
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRecord | null>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  // Existing draft detection
  const [existingDraft, setExistingDraft] = useState<DraftExam | null>(() => loadDraftExam());

  // Modals state
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminMenuModal, setShowAdminMenuModal] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminAuthSession | null>(null);
  const [showStudentReportExportModal, setShowStudentReportExportModal] = useState(false);
  const [showClassExcelModal, setShowClassExcelModal] = useState(false);
  const [showExamEditorModal, setShowExamEditorModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showViolationWarningModal, setShowViolationWarningModal] = useState(false);
  const [historyList, setHistoryList] = useState<SubmissionRecord[]>(() => getSubmissionHistory());
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [previewSubmission, setPreviewSubmission] = useState<SubmissionRecord | null>(null);

  // Tự động tải danh sách bài thi từ Google Sheets data2 khi khởi động ứng dụng
  useEffect(() => {
    if (config.data2Url && config.data2Url.trim()) {
      fetchSubmissionsFromData2(config.data2Url)
        .then((sheetData) => {
          if (Array.isArray(sheetData)) {
            const updated = syncSubmissionsFromSheetToHistory(sheetData);
            setHistoryList(updated);

            // Tự động quét và đồng bộ các IP bị chặn từ Google Sheets data2 (nguồn chính xác duy nhất)
            const blockedFromSheet = extractBlockedIpsFromSubmissions(sheetData);
            const cleanBlockedFromSheet = Array.from(new Set(blockedFromSheet.map(extractCleanIp).filter(Boolean)));
            setConfig((prev) => {
              const nextConfig = { ...prev, blockedIps: cleanBlockedFromSheet };
              localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(nextConfig));
              return nextConfig;
            });
          }
        })
        .catch(() => {});
    }
  }, [config.data2Url]);

  const handleAuthorClick = () => {
    if (adminSession) {
      setShowAdminMenuModal(true);
    } else {
      setShowAdminAuthModal(true);
    }
  };

  const handleSyncHistoryFromSheet = async () => {
    if (!config.data2Url || !config.data2Url.trim()) return;
    setIsSyncingHistory(true);
    try {
      const sheetData = await fetchSubmissionsFromData2(config.data2Url);
      const updated = syncSubmissionsFromSheetToHistory(sheetData || []);
      setHistoryList(updated);

      // Quét và đồng bộ các IP bị chặn từ sheet (cho phép mở chặn nếu trên sheet đã gỡ)
      const blockedFromSheet = extractBlockedIpsFromSubmissions(sheetData || []);
      const cleanBlockedFromSheet = Array.from(new Set(blockedFromSheet.map(extractCleanIp).filter(Boolean)));
      setConfig((prev) => {
        const nextConfig = { ...prev, blockedIps: cleanBlockedFromSheet };
        localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(nextConfig));
        return nextConfig;
      });

      if (sheetData && sheetData.length > 0) {
        setSyncToast(`Đã lấy ${sheetData.length} bài nộp từ Cơ sở dữ liệu!`);
      } else {
        setSyncToast('Cơ sở dữ liệu hiện chưa có bài nộp nào.');
      }
      setTimeout(() => setSyncToast(null), 3500);
    } catch (e) {
      console.warn('Lỗi lấy bài nộp từ Cơ sở dữ liệu:', e);
    } finally {
      setIsSyncingHistory(false);
    }
  };

  const handleAdminAuthSuccess = async (session: AdminAuthSession) => {
    setAdminSession(session);
    setShowAdminAuthModal(false);
    setShowAdminMenuModal(true);

    // Tự động tải và đồng bộ lịch sử nộp bài từ Cơ sở dữ liệu sau khi giáo viên đăng nhập
    if (config.data2Url && config.data2Url.trim()) {
      try {
        const sheetData = await fetchSubmissionsFromData2(config.data2Url);
        const updated = syncSubmissionsFromSheetToHistory(sheetData || []);
        setHistoryList(updated);
        if (sheetData && sheetData.length > 0) {
          setSyncToast(`Đã đồng bộ ${sheetData.length} bài nộp từ Cơ sở dữ liệu!`);
        } else {
          setSyncToast('Đã kết nối Cơ sở dữ liệu (Chưa có bài nộp nào trong bảng).');
        }
        setTimeout(() => setSyncToast(null), 3500);
      } catch (e) {
        console.warn('Lỗi đồng bộ bài nộp từ Cơ sở dữ liệu:', e);
      }
    }
  };

  // Online / Offline state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper date formatter: "8:15 04/09/2026"
  const formatDateForSheet = (date: Date): string => {
    const hours = date.getHours().toString();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  // Helper duration formatter: "00:15"
  const formatDurationForSheet = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Listen for Online / Offline & Auto-sync offline submissions
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncToast('Đã có kết nối mạng trở lại. Đang tự động đồng bộ...');

      // Auto-sync unsynced queue
      const unsynced = getUnsyncedSubmissions();
      if (unsynced.length > 0 && config.data2Url) {
        for (const item of unsynced) {
          const res = await sendSubmissionToData2(config.data2Url, item);
          if (res.success) {
            removeUnsyncedSubmission(item.timestamp);
          }
        }
        setSyncToast(`Đã tự động đồng bộ ${unsynced.length} bài thi lên Google Sheets data2!`);
      } else {
        setTimeout(() => setSyncToast(null), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncToast('Chuyển sang chế độ Ngoại tuyến (Offline). Bạn vẫn có thể làm bài và nộp bình thường!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config.data2Url]);

  // 1b. Tự động tải đề thi từ data1 và kết quả từ data2 khi khởi động ứng dụng
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromSheets() {
      // 1. Tải câu hỏi từ data1
      if (config.data1Url) {
        setIsLoadingData1(true);
        try {
          const result = await fetchQuestionsFromData1(config.data1Url);
          if (result && isMounted) {
            if (result.questions && result.questions.length > 0) {
              setQuestions(result.questions);
            }
            if (result.config) {
              setConfig((prev) => {
                const updated = { ...prev, ...result.config };
                localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(updated));
                return updated;
              });
            }
          }
        } catch (e) {
          console.warn('Lỗi tải dữ liệu data1:', e);
        } finally {
          if (isMounted) setIsLoadingData1(false);
        }
      }
    }

    loadDataFromSheets();

    return () => {
      isMounted = false;
    };
  }, [config.data1Url]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Request notifications handler
  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      showPushNotification('Đã bật thông báo', 'Hệ thống sẽ nhắc nhở bạn khi còn bài kiểm tra chưa hoàn thành!');
    }
  };

  // 2. Timer Loop during Exam
  useEffect(() => {
    if (screen === 'exam') {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Auto submit when time expires!
            if (timerRef.current) clearInterval(timerRef.current);
            handleFinishExam(true);
            return 0;
          }

          // In-exam draft saving every 5 seconds
          if (prev % 5 === 0) {
            saveDraftExam({
              studentInfo: { fullName: studentName, className },
              answers,
              startTime: startFormattedTime,
              startTimestamp,
              remainingSeconds: prev,
              currentQuestionIndex: 0,
              lastSavedAt: new Date().toLocaleTimeString('vi-VN'),
              shuffledQuestions: examQuestions,
            });
            setLastSavedText('Đã lưu nháp tự động ' + new Date().toLocaleTimeString('vi-VN'));
          }

          // Remind student at 5 minutes and 1 minute
          if (prev === 300) {
            showPushNotification('Sắp hết giờ làm bài!', 'Bạn còn 5 phút để hoàn thành bài kiểm tra thường xuyên.');
          } else if (prev === 60) {
            showPushNotification('Chú ý: Còn 1 phút!', 'Hãy nhanh chóng kiểm tra lại các câu trả lời và nộp bài.');
          }

          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [screen, studentName, className, answers, startFormattedTime, startTimestamp, examQuestions]);

  const handleUpdateBlockedIps = useCallback((newList: string[]) => {
    const cleanNewList = Array.from(new Set(newList.map(extractCleanIp).filter(Boolean)));
    setConfig((prev) => {
      const nextConfig = { ...prev, blockedIps: cleanNewList };
      localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(nextConfig));
      return nextConfig;
    });
  }, []);

  // 3. Start Exam Action
  const handleStartExam = async (name: string, cls: string) => {
    // Kiểm tra chốt chặn an toàn địa chỉ IP trước khi cho vào phòng thi
    try {
      const clientIp = await fetchClientIp();
      if (isIpBlockedCheck(clientIp, config.blockedIps, config.enableIpBlocking ?? true)) {
        alert(`⛔ Thí sinh (SBD: ${clientIp}) đã bị tạm khóa vì đã vi phạm quy định!`);
        return;
      }
    } catch {}

    const formattedName = formatStudentName(name);
    const formattedClass = formatClassName(cls);
    const now = new Date();
    const formattedStart = formatDateForSheet(now);
    const ts = now.getTime();

    // Sinh đề thi hoán đổi ngẫu nhiên câu hỏi & đáp án (theo cấu hình cài đặt)
    const shuffled = generateShuffledExam(
      questions,
      config.shuffleQuestions !== false,
      config.shuffleOptions !== false
    );
    setExamQuestions(shuffled);

    setStudentName(formattedName);
    setClassName(formattedClass);
    setStartFormattedTime(formattedStart);
    setStartTimestamp(ts);
    setAnswers({});
    setRemainingSeconds(config.durationMinutes * 60);
    setScreen('exam');

    // Save initial draft immediately
    saveDraftExam({
      studentInfo: { fullName: formattedName, className: formattedClass },
      answers: {},
      startTime: formattedStart,
      startTimestamp: ts,
      remainingSeconds: config.durationMinutes * 60,
      currentQuestionIndex: 0,
      lastSavedAt: now.toLocaleTimeString('vi-VN'),
      shuffledQuestions: shuffled,
    });
    setExistingDraft(null);

    // Friendly push notification reminder
    showPushNotification(
      'Bắt đầu làm bài kiểm tra',
      `Chúc ${formattedName} làm bài thật tốt! Thời gian làm bài là ${config.durationMinutes} phút.`
    );
  };

  // Resume Draft
  const handleResumeDraft = async () => {
    if (!existingDraft) return;
    try {
      const clientIp = await fetchClientIp();
      if (isIpBlockedCheck(clientIp, config.blockedIps, config.enableIpBlocking ?? true)) {
        alert(`⛔ Thí sinh (SBD: ${clientIp}) đã bị tạm khóa vì đã vi phạm quy định!`);
        return;
      }
    } catch {}

    const formattedName = formatStudentName(existingDraft.studentInfo.fullName);
    const formattedClass = formatClassName(existingDraft.studentInfo.className);

    // Khôi phục đúng đề thi đã xáo trộn của học sinh (tránh bị xáo lại lần 2)
    if (existingDraft.shuffledQuestions && existingDraft.shuffledQuestions.length > 0) {
      setExamQuestions(existingDraft.shuffledQuestions);
    } else {
      const shuffled = generateShuffledExam(
        questions,
        config.shuffleQuestions !== false,
        config.shuffleOptions !== false
      );
      setExamQuestions(shuffled);
    }

    setStudentName(formattedName);
    setClassName(formattedClass);
    setAnswers(existingDraft.answers || {});
    setStartFormattedTime(existingDraft.startTime);
    setStartTimestamp(existingDraft.startTimestamp);
    setRemainingSeconds(existingDraft.remainingSeconds);
    setScreen('exam');
    setExistingDraft(null);
  };

  // Discard Draft
  const handleDiscardDraft = () => {
    clearDraftExam();
    setExistingDraft(null);
  };

  // Answer change handler
  const handleAnswerChange = (questionId: number, update: Partial<StudentAnswer>) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { questionId };
      const updated = { ...current, ...update };
      const newAnswers = { ...prev, [questionId]: updated };

      // Immediate auto-save to draft
      saveDraftExam({
        studentInfo: { fullName: studentName, className },
        answers: newAnswers,
        startTime: startFormattedTime,
        startTimestamp,
        remainingSeconds,
        currentQuestionIndex: 0,
        lastSavedAt: new Date().toLocaleTimeString('vi-VN'),
        shuffledQuestions: examQuestions,
      });
      setLastSavedText('Đã lưu nháp tự động ' + new Date().toLocaleTimeString('vi-VN'));

      return newAnswers;
    });
  };

  // Manual save draft button
  const handleSaveDraftManual = () => {
    saveDraftExam({
      studentInfo: { fullName: studentName, className },
      answers,
      startTime: startFormattedTime,
      startTimestamp,
      remainingSeconds,
      currentQuestionIndex: 0,
      lastSavedAt: new Date().toLocaleTimeString('vi-VN'),
      shuffledQuestions: examQuestions,
    });
    setLastSavedText('Đã lưu nháp thủ công ' + new Date().toLocaleTimeString('vi-VN'));
    setSyncToast('Đã lưu nháp thành công vào bộ nhớ trình duyệt!');
    setTimeout(() => setSyncToast(null), 2500);
  };

  // 4. Submit & Finish Exam
  const handleFinishExam = useCallback(
    async (isTimeout = false) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsSubmittingExam(true);
      const submitStartTime = Date.now();

      try {
        const now = new Date();
        const endTime = formatDateForSheet(now);
        const elapsedSeconds = Math.max(1, config.durationMinutes * 60 - remainingSeconds);
        const totalDuration = formatDurationForSheet(elapsedSeconds);

        // Grade each question
        let totalScore = 0;
        let maxScore = 0;
        const scoreParts: string[] = [];

        const questionResults = questions.map((q, index) => {
          maxScore += q.points;
          const studentAns = answers[q.id];
          let isCorrect = false;
          let answerText = '';
          let isBlank = false;

          let displayStudentAnswer = '';
          let displayCorrectAnswer = q.correctAnswer;

          if (q.type === 'Trắc nghiệm 1 đáp án') {
            answerText = studentAns?.selectedOption ? studentAns.selectedOption.trim() : '';
            isBlank = !answerText;
            isCorrect =
              !isBlank && answerText.toUpperCase() === q.correctAnswer.trim().toUpperCase();
            displayStudentAnswer = isBlank ? '' : answerText.trim();
            displayCorrectAnswer = q.correctAnswer.trim();
          } else if (q.type === 'Đúng / Sai') {
            answerText = studentAns?.selectedOption ? studentAns.selectedOption.trim() : '';
            isBlank = !answerText;
            const normAns = answerText.toUpperCase();
            const normCorrect = q.correctAnswer.trim().toUpperCase();
            const isAnsTrue = normAns === 'A' || normAns === 'ĐÚNG' || normAns === 'DUNG' || normAns === 'TRUE';
            const isAnsFalse = normAns === 'B' || normAns === 'SAI' || normAns === 'FALSE';
            const isCorrectTrue = normCorrect === 'A' || normCorrect === 'ĐÚNG' || normCorrect === 'DUNG' || normCorrect === 'TRUE';
            const isCorrectFalse = normCorrect === 'B' || normCorrect === 'SAI' || normCorrect === 'FALSE';

            isCorrect = !isBlank && ((isAnsTrue && isCorrectTrue) || (isAnsFalse && isCorrectFalse));
            displayStudentAnswer = isBlank ? '' : (isAnsTrue ? 'Đúng' : isAnsFalse ? 'Sai' : answerText);
            displayCorrectAnswer = isCorrectTrue ? 'Đúng' : isCorrectFalse ? 'Sai' : q.correctAnswer;
            answerText = displayStudentAnswer;
          } else {
            // Tự luận: so khớp không phân biệt hoa/thường, khoảng trắng thừa và dấu tiếng Việt
            answerText = studentAns?.essayAnswer ? studentAns.essayAnswer.trim() : '';
            isBlank = !answerText;
            isCorrect = !isBlank && checkEssayAnswerMatch(answerText, q.correctAnswer);
            displayStudentAnswer = isBlank ? '' : answerText.trim();
            displayCorrectAnswer = q.correctAnswer.trim();
          }

          const earned = isCorrect ? q.points : 0;
          totalScore += earned;

          const qNumber = index + 1;
          // Build score string format: <Số câu : số điểm : "Đáp án HS chọn / đã gõ"> (Ví dụ: <1 : 0,5 : "A"> <2 : 1 : "Liên kết">)
          const cleanAnswer = isBlank ? '' : answerText.trim();
          scoreParts.push(formatScoreItem(qNumber, earned, cleanAnswer));

          return {
            questionId: q.id,
            orderNumber: qNumber,
            studentAnswer: displayStudentAnswer,
            correctAnswer: displayCorrectAnswer,
            isCorrect,
            earnedPoints: earned,
            maxPoints: q.points,
            category: q.category || (q.type === 'Đúng / Sai' ? 'Đúng / Sai' : 'Kiến thức chung'),
          };
        });

        // Round to 1 decimal place
        totalScore = Math.round(totalScore * 10) / 10;
        maxScore = Math.round(maxScore * 10) / 10;
        const scoreString = scoreParts.join(' ');

        // Lấy IP học sinh đang làm bài để lưu vào cột 9 của data2
        const clientIp = await fetchClientIp();

        // Xác định STT chính xác theo thứ tự nộp bài (thay vì cố định 1)
        const existingHistory = getSubmissionHistory();
        const nextSTT = existingHistory.length > 0
          ? Math.max(...existingHistory.map((h) => Number(h.stt) || 0), 0) + 1
          : 1;

        const isClientBlocked = isIpBlockedCheck(clientIp, config.blockedIps, config.enableIpBlocking ?? true);
        const cleanClientIp = clientIp ? extractCleanIp(clientIp) : '';

        const record: SubmissionRecord = {
          stt: nextSTT,
          studentName: formatStudentName(studentName || 'Học sinh'),
          className: formatClassName(className || ''),
          totalScore,
          maxScore,
          scoreString,
          startTime: startFormattedTime || endTime,
          endTime,
          totalDuration,
          ipAddress: cleanClientIp,
          status: isClientBlocked ? 'Chặn' : '',
          isBlocked: isClientBlocked,
          timestamp: Date.now(),
          syncedToData2: false,
          questionResults,
        };

        // Clear the draft now that it's submitted
        clearDraftExam();

        // Attempt sending to Google Sheet (data2)
        if (config.data2Url && config.data2Url.trim()) {
          const sendResult = await sendSubmissionToData2(config.data2Url, record);
          if (sendResult.success) {
            record.syncedToData2 = true;
            setSyncToast('Đã gửi điểm cho giáo viên');
          } else {
            setSyncToast(sendResult.message);
          }
        } else {
          setSyncToast('Đã lưu bài làm hoàn tất!');
        }

        // Đảm bảo học sinh nhìn thấy trạng thái xoay với thông điệp chấm điểm tối thiểu 1.5 giây
        const elapsed = Date.now() - submitStartTime;
        if (elapsed < 1600) {
          await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
        }

        setActiveSubmission(record);
        setScreen('result');

        if (isTimeout) {
          showPushNotification('Hết giờ làm bài!', `Đã tự động nộp bài cho ${studentName}. Điểm số: ${totalScore}/${maxScore}`);
        } else {
          showPushNotification('Nộp bài thành công!', `Chúc mừng ${studentName} đã hoàn thành với điểm số ${totalScore}/${maxScore}!`);
        }
      } catch (err) {
        console.error('Lỗi khi chấm điểm & nộp bài:', err);
      } finally {
        setIsSubmittingExam(false);
      }
    },
    [
      config.durationMinutes,
      config.data2Url,
      remainingSeconds,
      questions,
      answers,
      studentName,
      className,
      startFormattedTime,
    ]
  );

  // Save config handler
  const handleSaveConfig = (updated: Partial<ExamConfig>) => {
    const merged: ExamConfig = {
      ...config,
      ...updated,
      data1Url: updated.data1Url !== undefined ? normalizeAppsScriptUrl(updated.data1Url) : config.data1Url,
      data2Url: updated.data2Url !== undefined ? normalizeAppsScriptUrl(updated.data2Url) : config.data2Url,
    };
    setConfig(merged);
    localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(merged));

    // Đồng bộ ngay lập tức trạng thái Chặn (Cột J) và làm sạch IP thuần (Cột I) trong giao diện
    if (updated.blockedIps !== undefined) {
      setHistoryList((prevHistory) => {
        const nextBlocked = updated.blockedIps || [];
        const updatedHistory = prevHistory.map((rec) => {
          const clean = extractCleanIp(rec.ipAddress);
          if (!clean) return rec;
          const isBlocked = isIpBlockedCheck(clean, nextBlocked, true);
          const expectedStatus = isBlocked ? 'Chặn' : '';
          if (rec.ipAddress !== clean || rec.status !== expectedStatus || rec.isBlocked !== isBlocked) {
            return {
              ...rec,
              ipAddress: clean,
              status: expectedStatus,
              isBlocked: isBlocked,
            };
          }
          return rec;
        });
        localStorage.setItem('kiem_tra_thuong_xuyen_history', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  };

  // Reload questions from Google Sheet Data1
  const handleReloadFromData1 = async () => {
    if (!config.data1Url) {
      throw new Error('Chưa nhập đường dẫn Google Sheets Web App data1.');
    }
    const result = await fetchQuestionsFromData1(config.data1Url);
    if (!result || !result.questions || result.questions.length === 0) {
      throw new Error('Không thể tải dữ liệu câu hỏi từ Google Sheets data1. Vui lòng kiểm tra quyền Anyone của Web App.');
    }
    if (result.config) {
      handleSaveConfig(result.config);
    }
    setQuestions(result.questions);
    localStorage.setItem('kiem_tra_thuong_xuyen_questions', JSON.stringify(result.questions));
  };

  // Save exam from ExamEditorModal (Lưu & đồng bộ trực tiếp vào data1)
  const handleSaveExamFromEditor = async (updatedConfig: ExamConfig, updatedQuestions: Question[]) => {
    setConfig(updatedConfig);
    setQuestions(updatedQuestions);
    localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(updatedConfig));
    localStorage.setItem('kiem_tra_thuong_xuyen_questions', JSON.stringify(updatedQuestions));

    if (screen === 'start') {
      setRemainingSeconds(updatedConfig.durationMinutes * 60);
    }

    // Đồng bộ trực tiếp vào Google Sheets data1
    const syncRes = await saveExamToData1(updatedConfig.data1Url, updatedConfig, updatedQuestions);

    if (syncRes.syncedToData1) {
      setSyncToast(`✅ Đã lưu và đồng bộ ${updatedQuestions.length} câu hỏi vào Google Sheets data1!`);
    } else {
      setSyncToast(`✅ Đã lưu ${updatedQuestions.length} câu hỏi vào hệ thống dữ liệu đề thi data1!`);
    }

    setTimeout(() => {
      setSyncToast(null);
    }, 4500);

    return syncRes;
  };

  // Reset exam to default Tin học 6
  const handleResetExamToDefault = async () => {
    setConfig(DEFAULT_EXAM_CONFIG);
    setQuestions(DEFAULT_QUESTIONS);
    localStorage.removeItem('kiem_tra_thuong_xuyen_questions');
    localStorage.setItem('kiem_tra_thuong_xuyen_config', JSON.stringify(DEFAULT_EXAM_CONFIG));

    if (screen === 'start') {
      setRemainingSeconds(DEFAULT_EXAM_CONFIG.durationMinutes * 60);
    }

    if (config.data1Url) {
      await saveExamToData1(config.data1Url, DEFAULT_EXAM_CONFIG, DEFAULT_QUESTIONS);
      setSyncToast('✅ Đã khôi phục đề thi gốc (13 câu) và cập nhật lên Google Sheets data1!');
    } else {
      setSyncToast('✅ Đã khôi phục đề thi gốc (13 câu - Tin học 6)');
    }

    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  };

  // Clear all exam data on device
  const handleClearAllExamData = () => {
    clearAllExamData();
    setHistoryList([]);
    setExistingDraft(null);
    setAnswers({});
    setActiveSubmission(null);
    setSyncToast('🗑️ Đã xóa sạch toàn bộ examdata trên thiết bị!');
    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  };

  // Restart / Retake Exam
  const handleRestart = () => {
    setScreen('start');
    setActiveSubmission(null);
    setAnswers({});
    setExistingDraft(null);
    setExamQuestions([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification Bar */}
      {syncToast && (
        <div
          className={`text-xs px-4 py-2.5 text-center shadow-md sticky top-0 z-50 animate-in fade-in slide-from-top duration-200 flex items-center justify-center gap-2 ${
            syncToast === 'Đã gửi điểm cho giáo viên'
              ? 'bg-slate-900 border-b-2 border-yellow-400 text-yellow-300 font-extrabold text-sm sm:text-base'
              : 'bg-sky-600 text-white font-medium'
          }`}
        >
          <span className={syncToast === 'Đã gửi điểm cho giáo viên' ? 'text-yellow-300 font-black' : ''}>
            {syncToast}
          </span>
          <button
            onClick={() => setSyncToast(null)}
            className={`ml-3 cursor-pointer font-bold ${
              syncToast === 'Đã gửi điểm cho giáo viên' ? 'text-yellow-400 hover:text-yellow-200' : 'text-sky-200 hover:text-white'
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        config={config}
        isOnline={isOnline}
        onOpenAdmin={handleAuthorClick}
        onRequestPush={handleRequestPush}
        notificationsEnabled={notificationsEnabled}
      />

      {/* App Body Screens */}
      <main className="flex-1 py-4">
        {screen === 'start' && (
          <StudentStartForm
            config={config}
            questions={questions}
            totalQuestions={questions.length}
            existingDraft={existingDraft}
            onStartExam={handleStartExam}
            onResumeDraft={handleResumeDraft}
            onDiscardDraft={handleDiscardDraft}
            onAuthorClick={handleAuthorClick}
            onUpdateBlockedIps={handleUpdateBlockedIps}
          />
        )}

        {screen === 'exam' && (
          <ExamScreen
            config={config}
            studentName={studentName}
            className={className}
            questions={examQuestions.length > 0 ? examQuestions : questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            remainingSeconds={remainingSeconds}
            lastSavedText={lastSavedText}
            onSaveDraftManual={handleSaveDraftManual}
            onSubmitExam={() => handleFinishExam(false)}
          />
        )}

        {screen === 'result' && activeSubmission && (
          <ResultScreen
            config={config}
            submission={activeSubmission}
            questions={questions}
            onRestart={handleRestart}
            onOpenPdfReport={() => setShowPdfModal(true)}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="bg-white border-t border-sky-100 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Hệ thống đánh giá năng lực trực tuyến</strong> • {config.schoolName}
          </span>
          <span>
            Bản quyền:{' '}
            <button
              onClick={handleAuthorClick}
              className="text-sky-700 font-bold hover:underline cursor-pointer focus:outline-none transition-colors"
              title="Quản trị viên & Giáo viên"
            >
              {config.copyrightText}
            </button>
          </span>
        </div>
      </footer>

      {/* MODAL 0: Admin Password Authentication */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* MODAL 0.1: Admin Menu */}
      <AdminMenuModal
        isOpen={showAdminMenuModal}
        onClose={() => {
          setShowAdminMenuModal(false);
          setAdminSession(null); // Chỉ đăng xuất khi GV chủ động tắt Bảng Quản Trị!
          setSyncToast('Đã đăng xuất khỏi Bảng Điều Khiển Quản Trị.');
          setTimeout(() => setSyncToast(null), 2500);
        }}
        session={adminSession}
        history={historyList}
        onSelectAppsScript={() => {
          if (adminSession?.permissions?.canManageAppsScript) {
            setShowAdminMenuModal(false);
            setShowAppsScriptModal(true);
          }
        }}
        onSelectExportImage={() => {
          setShowAdminMenuModal(false);
          setShowStudentReportExportModal(true);
        }}
        onSelectExportExcel={() => {
          setShowAdminMenuModal(false);
          setShowClassExcelModal(true);
        }}
        onSelectExamEditor={() => {
          setShowAdminMenuModal(false);
          setShowExamEditorModal(true);
        }}
        onSelectHistory={() => {
          setShowAdminMenuModal(false);
          setShowHistoryModal(true);
        }}
        onSelectViolationWarning={() => {
          setShowAdminMenuModal(false);
          setShowViolationWarningModal(true);
        }}
      />

      {/* MODAL 1: Apps Script Generator & Config */}
      <AppsScriptModal
        isOpen={showAppsScriptModal}
        onClose={() => {
          setShowAppsScriptModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        config={config}
        onSaveConfig={handleSaveConfig}
        onReloadFromData1={handleReloadFromData1}
      />

      {/* MODAL 1.5: Student Report Image & ZIP Archiving Export */}
      <StudentReportExportModal
        isOpen={showStudentReportExportModal}
        onClose={() => {
          setShowStudentReportExportModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        config={config}
        questions={questions}
      />

      {/* MODAL 1.7: Student Submission History (Synced from Cơ sở dữ liệu) */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        history={historyList}
        isSyncing={isSyncingHistory}
        onRefreshFromSheet={handleSyncHistoryFromSheet}
        onOpenViolations={() => {
          setShowHistoryModal(false);
          setShowViolationWarningModal(true);
        }}
        onSelectSubmission={(sub) => {
          setPreviewSubmission(sub);
          setShowPdfModal(true);
        }}
        onDeleteSubmission={(sub) => {
          const updated = deleteSubmissionFromHistory(sub.studentName, sub.className, sub.endTime);
          setHistoryList(updated);
        }}
        config={config}
        onUpdateConfig={handleSaveConfig}
      />

      {/* MODAL 1.75: Violation Warning (Duplicate IP Detection) */}
      <ViolationWarningModal
        isOpen={showViolationWarningModal}
        onClose={() => {
          setShowViolationWarningModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        history={historyList}
        isSyncing={isSyncingHistory}
        onRefreshFromSheet={handleSyncHistoryFromSheet}
        onSelectSubmission={(sub) => {
          setPreviewSubmission(sub);
          setShowPdfModal(true);
        }}
        config={config}
        onUpdateConfig={handleSaveConfig}
      />

      {/* MODAL 1.8: Class Excel Export (*.xlsx) */}
      <ClassExcelExportModal
        isOpen={showClassExcelModal}
        onClose={() => {
          setShowClassExcelModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        config={config}
        questions={questions}
      />

      {/* MODAL 1.9: Exam Creator & Editor */}
      <ExamEditorModal
        isOpen={showExamEditorModal}
        onClose={() => {
          setShowExamEditorModal(false);
          if (adminSession) setShowAdminMenuModal(true);
        }}
        config={config}
        questions={questions}
        onSaveExam={handleSaveExamFromEditor}
        onResetToDefault={handleResetExamToDefault}
      />

      {/* MODAL 2: PDF Print & Report (Mẫu bài kiểm tra học sinh Việt Nam) */}
      {(previewSubmission || activeSubmission) && (
        <PdfReportModal
          isOpen={showPdfModal}
          onClose={() => {
            setShowPdfModal(false);
            setPreviewSubmission(null);
          }}
          submission={previewSubmission || activeSubmission!}
          config={config}
          questions={questions}
          isTeacherMode={!!adminSession}
          submissionsList={historyList}
          onSelectSubmission={(sub) => {
            setPreviewSubmission(sub);
          }}
          onUpdateSubmission={async (updated, meta) => {
            if (previewSubmission) {
              setPreviewSubmission(updated);
            }
            if (
              activeSubmission &&
              String(activeSubmission.studentName).toLowerCase().trim() ===
                String(updated.studentName).toLowerCase().trim()
            ) {
              setActiveSubmission(updated);
            }
            const updatedList = updateSubmissionInHistory(updated);
            setHistoryList(updatedList);
            if (config.data2Url) {
              await sendSubmissionToData2(config.data2Url, updated, {
                isUpdate: true,
                targetOrderNumber: meta?.targetOrderNumber,
                questionScore: meta?.questionScore,
                isCorrect: meta?.isCorrect,
              });
            }
          }}
        />
      )}

      {/* TRẠNG THÁI XOAY CHỜ CHẤM ĐIỂM KHI HỌC SINH NỘP BÀI */}
      {isSubmittingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 text-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-sky-100 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Vòng quay hoạt họa với spinner */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-20 h-20 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
              <div className="absolute w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              </div>
            </div>

            {/* Dòng chữ chính xác theo yêu cầu người dùng */}
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Đang chấm điểm, các bạn vui lòng đợi giây lát!
              </h3>
            </div>

            {/* Thanh tiến trình vi mô sinh động */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 rounded-full w-full animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
