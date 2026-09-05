/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ứng dụng: KIỂM TRA THƯỜNG XUYÊN
 * Tone: Xanh dương nhạt
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StudentStartForm } from './components/StudentStartForm';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { AppsScriptModal } from './components/AppsScriptModal';
import { PdfReportModal } from './components/PdfReportModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminMenuModal } from './components/AdminMenuModal';
import { StudentReportExportModal } from './components/StudentReportExportModal';
import { ClassExcelExportModal } from './components/ClassExcelExportModal';
import { ExamEditorModal } from './components/ExamEditorModal';
import {
  DEFAULT_EXAM_CONFIG,
  DEFAULT_QUESTIONS,
} from './data/defaultExamData';
import {
  ExamConfig,
  Question,
  StudentAnswer,
  SubmissionRecord,
  DraftExam,
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
} from './utils/syncService';
import { checkEssayAnswerMatch } from './utils/gradeService';
import { fetchClientIp } from './utils/ipService';

type AppScreen = 'start' | 'exam' | 'result';

export default function App() {
  // Config & Questions: ensure data1Url and data2Url always fallback to the user's provided URLs
  const [config, setConfig] = useState<ExamConfig>(() => {
    const saved = localStorage.getItem('kiem_tra_thuong_xuyen_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isOldData1 = !parsed.data1Url || parsed.data1Url.includes('AKfycbzVR-FeTa2IZ20Nodk3ts3TUJqiadghILLCzyc8NZ6EAqzECm9gSbFVvA4EBmmOMpCO2A');
        const activeData1Url = isOldData1 ? DEFAULT_EXAM_CONFIG.data1Url : normalizeAppsScriptUrl(parsed.data1Url);
        const isOldData2 = parsed.data2Url && parsed.data2Url.includes('AKfycbw3o7fi087YgBy8WjQZwWqavHeUN8jFfr6T3d2kuWkF4WMajeUlI8xajSP0ZkbPKGbB');
        const activeData2Url = isOldData2 || !parsed.data2Url ? DEFAULT_EXAM_CONFIG.data2Url : normalizeAppsScriptUrl(parsed.data2Url);
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

  // Submissions state
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRecord | null>(null);

  // Existing draft detection
  const [existingDraft, setExistingDraft] = useState<DraftExam | null>(() => loadDraftExam());

  // Modals state
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminMenuModal, setShowAdminMenuModal] = useState(false);
  const [showStudentReportExportModal, setShowStudentReportExportModal] = useState(false);
  const [showClassExcelModal, setShowClassExcelModal] = useState(false);
  const [showExamEditorModal, setShowExamEditorModal] = useState(false);

  const handleAuthorClick = () => {
    setShowAdminAuthModal(true);
  };

  const handleAdminAuthSuccess = () => {
    setShowAdminAuthModal(false);
    setShowAdminMenuModal(true);
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
  }, [screen, studentName, className, answers, startFormattedTime, startTimestamp]);

  // 3. Start Exam Action
  const handleStartExam = (name: string, cls: string) => {
    const now = new Date();
    const formattedStart = formatDateForSheet(now);
    const ts = now.getTime();

    setStudentName(name);
    setClassName(cls);
    setStartFormattedTime(formattedStart);
    setStartTimestamp(ts);
    setAnswers({});
    setRemainingSeconds(config.durationMinutes * 60);
    setScreen('exam');

    // Save initial draft immediately
    saveDraftExam({
      studentInfo: { fullName: name, className: cls },
      answers: {},
      startTime: formattedStart,
      startTimestamp: ts,
      remainingSeconds: config.durationMinutes * 60,
      currentQuestionIndex: 0,
      lastSavedAt: now.toLocaleTimeString('vi-VN'),
    });
    setExistingDraft(null);

    // Friendly push notification reminder
    showPushNotification(
      'Bắt đầu làm bài kiểm tra',
      `Chúc ${name} làm bài thật tốt! Thời gian làm bài là ${config.durationMinutes} phút.`
    );
  };

  // Resume Draft
  const handleResumeDraft = () => {
    if (!existingDraft) return;
    setStudentName(existingDraft.studentInfo.fullName);
    setClassName(existingDraft.studentInfo.className);
    setAnswers(existingDraft.answers);
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

        if (q.type === 'Trắc nghiệm 1 đáp án') {
          answerText = studentAns?.selectedOption ? studentAns.selectedOption.trim() : '';
          isBlank = !answerText;
          isCorrect =
            !isBlank && answerText.toUpperCase() === q.correctAnswer.trim().toUpperCase();
        } else {
          // Tự luận: so khớp không phân biệt hoa/thường, khoảng trắng thừa và dấu tiếng Việt
          answerText = studentAns?.essayAnswer ? studentAns.essayAnswer.trim() : '';
          isBlank = !answerText;
          isCorrect = !isBlank && checkEssayAnswerMatch(answerText, q.correctAnswer);
        }

        const earned = isCorrect ? q.points : 0;
        totalScore += earned;

        const qNumber = index + 1;
        // Build score string format: "1:0.5 2:0.5 3:1..." hoặc "1:-" nếu học sinh bỏ trống (tương đương 0đ)
        if (isBlank) {
          scoreParts.push(`${qNumber}:-`);
        } else {
          scoreParts.push(`${qNumber}:${earned}`);
        }

        return {
          questionId: q.id,
          orderNumber: qNumber,
          studentAnswer: isBlank ? '-' : answerText,
          correctAnswer: q.correctAnswer,
          isCorrect,
          earnedPoints: earned,
          maxPoints: q.points,
          category: q.category || 'Kiến thức chung',
        };
      });

      // Round to 1 decimal place
      totalScore = Math.round(totalScore * 10) / 10;
      maxScore = Math.round(maxScore * 10) / 10;
      const scoreString = scoreParts.join(' ');

      // Lấy IP máy tính đang làm bài để lưu vào cột cuối cùng của data2
      const clientIp = await fetchClientIp();

      const record: SubmissionRecord = {
        stt: 1,
        studentName: studentName || 'Học sinh',
        className: className || '',
        totalScore,
        maxScore,
        scoreString,
        startTime: startFormattedTime || endTime,
        endTime,
        totalDuration,
        ipAddress: clientIp,
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

      setActiveSubmission(record);
      setScreen('result');

      if (isTimeout) {
        showPushNotification('Hết giờ làm bài!', `Đã tự động nộp bài cho ${studentName}. Điểm số: ${totalScore}/${maxScore}`);
      } else {
        showPushNotification('Nộp bài thành công!', `Chúc mừng ${studentName} đã hoàn thành với điểm số ${totalScore}/${maxScore}!`);
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

  // Restart / Retake Exam
  const handleRestart = () => {
    setScreen('start');
    setActiveSubmission(null);
    setAnswers({});
    setExistingDraft(null);
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
        onRequestPush={handleRequestPush}
        notificationsEnabled={notificationsEnabled}
      />

      {/* App Body Screens */}
      <main className="flex-1 py-4">
        {screen === 'start' && (
          <StudentStartForm
            config={config}
            totalQuestions={questions.length}
            existingDraft={existingDraft}
            onStartExam={handleStartExam}
            onResumeDraft={handleResumeDraft}
            onDiscardDraft={handleDiscardDraft}
            onAuthorClick={handleAuthorClick}
          />
        )}

        {screen === 'exam' && (
          <ExamScreen
            config={config}
            studentName={studentName}
            className={className}
            questions={questions}
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

      {/* MODAL 0.1: Admin Menu (1. Tạo apps script.., 2. Xuất báo cáo dạng file ảnh, 3. Xuất kết quả theo lớp *.xlsx, 4. Tạo & chỉnh sửa đề thi) */}
      <AdminMenuModal
        isOpen={showAdminMenuModal}
        onClose={() => setShowAdminMenuModal(false)}
        onSelectAppsScript={() => setShowAppsScriptModal(true)}
        onSelectExportImage={() => setShowStudentReportExportModal(true)}
        onSelectExportExcel={() => setShowClassExcelModal(true)}
        onSelectExamEditor={() => setShowExamEditorModal(true)}
      />

      {/* MODAL 1: Apps Script Generator & Config */}
      <AppsScriptModal
        isOpen={showAppsScriptModal}
        onClose={() => setShowAppsScriptModal(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onReloadFromData1={handleReloadFromData1}
      />

      {/* MODAL 1.5: Student Report Image & ZIP Archiving Export */}
      <StudentReportExportModal
        isOpen={showStudentReportExportModal}
        onClose={() => setShowStudentReportExportModal(false)}
        config={config}
        questions={questions}
      />

      {/* MODAL 1.8: Class Excel Export (*.xlsx) */}
      <ClassExcelExportModal
        isOpen={showClassExcelModal}
        onClose={() => setShowClassExcelModal(false)}
        config={config}
        questions={questions}
      />

      {/* MODAL 1.9: Exam Creator & Editor */}
      <ExamEditorModal
        isOpen={showExamEditorModal}
        onClose={() => setShowExamEditorModal(false)}
        config={config}
        questions={questions}
        onSaveExam={handleSaveExamFromEditor}
        onResetToDefault={handleResetExamToDefault}
      />

      {/* MODAL 2: PDF Print & Report (Không có đáp án) */}
      {activeSubmission && (
        <PdfReportModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          submission={activeSubmission}
          config={config}
        />
      )}
    </div>
  );
}
