import React, { useState, useEffect, useMemo } from 'react';
import { Play, Clock, BookOpen, School, AlertCircle, Sparkles, RotateCcw, CheckCircle2, Globe, ShieldAlert } from 'lucide-react';
import { ExamConfig, DraftExam, Question } from '../types';
import { fetchClientIp } from '../utils/ipService';
import { formatStudentName, formatClassName } from '../utils/studentFormatting';
import { isIpBlockedCheck, isIpOverSubmissionLimit, checkAndResetPeriodOnDevice } from '../utils/ipViolationService';
import { checkLiveIpBlockedOnSheet, clearIpHistoryAndDeviceEntries } from '../utils/syncService';
import { checkExamDateStatus, getExamPeriodKey } from '../utils/examDateService';

interface StudentStartFormProps {
  config: ExamConfig;
  totalQuestions?: number;
  questions?: Question[];
  mcCount?: number;
  essayCount?: number;
  existingDraft: DraftExam | null;
  onStartExam: (studentName: string, className: string) => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onAuthorClick?: () => void;
  onUpdateBlockedIps?: (blockedIps: string[]) => void;
}

export const StudentStartForm: React.FC<StudentStartFormProps> = ({
  config,
  totalQuestions,
  questions,
  mcCount,
  essayCount,
  existingDraft,
  onStartExam,
  onResumeDraft,
  onDiscardDraft,
  onAuthorClick,
  onUpdateBlockedIps,
}) => {
  const calculatedMcCount =
    mcCount !== undefined
      ? mcCount
      : questions
      ? questions.filter((q) => q.type === 'Trắc nghiệm 1 đáp án').length
      : 0;
  const calculatedTfCount = questions
    ? questions.filter((q) => q.type === 'Đúng / Sai').length
    : 0;
  const calculatedEssayCount =
    essayCount !== undefined
      ? essayCount
      : questions
      ? questions.filter((q) => q.type === 'Tự luận').length
      : 0;
  const [studentName, setStudentName] = useState(existingDraft?.studentInfo.fullName || '');
  const [className, setClassName] = useState(existingDraft?.studentInfo.className || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientIp, setClientIp] = useState<string>('');
  const [isLoadingIp, setIsLoadingIp] = useState<boolean>(true);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState<boolean>(false);
  // Trạng thái kiểm tra thời gian thực từ Google Sheet data2: null = đang tải/chưa rõ, false = được mở chặn, true = bị chặn
  const [liveBlockedState, setLiveBlockedState] = useState<boolean | null>(null);

  // Phân tích trạng thái ngày làm bài (ô D3) và khóa định danh kỳ kiểm tra
  const dateStatus = useMemo(() => checkExamDateStatus(config.examDateRange), [config.examDateRange]);
  const examPeriodKey = useMemo(
    () => getExamPeriodKey(config),
    [config.examDateRange, config.examName, config.subject]
  );
  // Kỳ thi chỉ mở khi: Không bị tắt thủ công (J1) VÀ đang trong hạn ngày thi (D3)
  const isEffectiveExamActive = config.isExamActive !== false && dateStatus.isExamAllowed;

  // Tự động nhận diện thay đổi kỳ kiểm tra để tính lại số lần từ đầu cho học sinh
  useEffect(() => {
    checkAndResetPeriodOnDevice(examPeriodKey);
  }, [examPeriodKey]);

  // Tra soát trạng thái chặn:
  // Nếu có Google Sheets data2: data2 là quyết định tối cao!
  // Khi data2 đã xác nhận MỞ CHẶN (liveBlockedState === false) -> chắc chắn KHÔNG CHẶN!
  const isDeviceBlocked = useMemo(() => {
    if (!isEffectiveExamActive) return false;

    if (config.data2Url && config.enableIpBlocking !== false) {
      if (liveBlockedState === false) {
        return false; // Đã được giáo viên mở chặn trên Google Sheet data2!
      }
      if (liveBlockedState === true) {
        return true; // Đang bị chặn trên Google Sheet data2!
      }
      // Khi chưa có kết quả live: chỉ chặn nếu IP nằm trong danh sách chặn hiện tại
      return isIpBlockedCheck(clientIp, config.blockedIps, config.enableIpBlocking ?? true);
    }

    // Nếu chạy độc lập không cấu hình data2 (offline): kiểm tra giới hạn trên máy
    const isManuallyBlocked = isIpBlockedCheck(clientIp, config.blockedIps, config.enableIpBlocking ?? true);
    const isOverLimit = isIpOverSubmissionLimit(
      clientIp,
      config.maxSubmissionsPerIp,
      config.enableIpBlocking ?? true,
      config.examDateRange,
      examPeriodKey
    );
    return isManuallyBlocked || isOverLimit;
  }, [clientIp, config.blockedIps, config.enableIpBlocking, config.maxSubmissionsPerIp, config.examDateRange, config.data2Url, examPeriodKey, isEffectiveExamActive, liveBlockedState]);

  // Kiểm tra 1 lần duy nhất ngay khi mở ứng dụng xem SBD/IP này có bị chặn hay không
  useEffect(() => {
    let isMounted = true;
    fetchClientIp().then(async (ip) => {
      if (!isMounted) return;
      setClientIp(ip);
      setIsLoadingIp(false);

      if (ip && config.data2Url && config.enableIpBlocking !== false) {
        try {
          const liveCheck = await checkLiveIpBlockedOnSheet(
            config.data2Url,
            ip,
            config.examDateRange,
            config.maxSubmissionsPerIp,
            config.enableIpBlocking !== false
          );
          if (isMounted) {
            setLiveBlockedState(liveCheck.isBlocked);
            if (onUpdateBlockedIps) {
              onUpdateBlockedIps(liveCheck.blockedList);
            }
            if (!liveCheck.isBlocked) {
              // Giáo viên đã MỞ CHẶN trên data2: xóa sạch lịch sử JSON và bộ đếm cũ trên máy
              clearIpHistoryAndDeviceEntries(ip);
              setErrorMessage('');
            }
          }
        } catch {}
      }
    });
    return () => {
      isMounted = false;
    };
  }, [config.data2Url, config.enableIpBlocking, config.examDateRange, config.maxSubmissionsPerIp, onUpdateBlockedIps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formatStudentName(studentName);
    const cleanClass = formatClassName(className);

    if (!cleanName) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ và Tên của học sinh!');
      return;
    }
    if (!cleanClass) {
      setErrorMessage('Vui lòng nhập Lớp của học sinh!');
      return;
    }
    if (!questions || questions.length === 0) {
      setErrorMessage('Đề thi hiện chưa có câu hỏi. Giáo viên vui lòng vào mục Quản trị để đồng bộ đề thi từ Google Sheets (data1) hoặc tạo câu hỏi!');
      return;
    }

    setIsCheckingSecurity(true);
    setErrorMessage('');

    // 1. Xác thực địa chỉ IP thiết bị (nếu IP chưa tải xong thì đợi tải)
    let currentCheckIp = clientIp;
    if (!currentCheckIp) {
      try {
        currentCheckIp = await fetchClientIp();
        if (currentCheckIp) setClientIp(currentCheckIp);
      } catch {}
    }

    // 2. KIỂM TRA THỜI GIAN THỰC VỚI GOOGLE SHEET (DATA2) ĐẦU TIÊN:
    // Google Sheet là nguồn chân lý duy nhất, giải quyết triệt để lỗi mở chặn nhưng máy HS không vào được
    if (config.data2Url && config.enableIpBlocking !== false && currentCheckIp) {
      try {
        const liveCheck = await checkLiveIpBlockedOnSheet(
          config.data2Url,
          currentCheckIp,
          config.examDateRange,
          config.maxSubmissionsPerIp,
          config.enableIpBlocking !== false
        );
        setLiveBlockedState(liveCheck.isBlocked);

        // Đồng bộ danh sách mới nhất về máy học sinh (nếu mở chặn, danh sách sẽ không còn IP này)
        if (onUpdateBlockedIps) {
          onUpdateBlockedIps(liveCheck.blockedList);
        }

        if (liveCheck.isBlocked) {
          setIsCheckingSecurity(false);
          setErrorMessage(
            `⛔ Thí sinh (SBD: ${currentCheckIp}) đã bị tạm khóa vì đã vi phạm quy định trên Google Sheet. Vui lòng liên hệ Giáo viên bộ môn để được mở khóa!`
          );
          return;
        } else {
          // Giáo viên đã MỞ CHẶN trên Google Sheet thành công!
          // Xóa sạch lịch sử JSON và bộ đếm cũ trên máy để học sinh tiếp tục làm bài
          clearIpHistoryAndDeviceEntries(currentCheckIp);
          setErrorMessage('');
        }
      } catch (err) {
        console.warn('Live IP check warning:', err);
        // Nếu không kết nối được tới Sheet, kiểm tra RAM phòng ngừa
        if (isDeviceBlocked || isIpBlockedCheck(currentCheckIp, config.blockedIps, config.enableIpBlocking ?? true)) {
          setIsCheckingSecurity(false);
          setErrorMessage('⛔ Thiết bị này đang nằm trong danh sách tạm khóa!');
          return;
        }
      }
    } else if (!config.data2Url && config.enableIpBlocking !== false) {
      // Chỉ khi chạy chế độ offline không có data2 mới kiểm tra giới hạn trên máy
      if (isIpOverSubmissionLimit(currentCheckIp, config.maxSubmissionsPerIp, config.enableIpBlocking ?? true, config.examDateRange, examPeriodKey)) {
        setIsCheckingSecurity(false);
        setErrorMessage(
          `⛔ Thí sinh (SBD: ${currentCheckIp || clientIp || 'SBD'}) đã bị tạm khóa vì đã vi phạm quy định làm quá số lần cho phép (${config.maxSubmissionsPerIp || 1} lần)!`
        );
        return;
      }
    }

    setIsCheckingSecurity(false);
    setStudentName(cleanName);
    setClassName(cleanClass);
    setErrorMessage('');
    onStartExam(cleanName, cleanClass);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Cảnh báo tạm khóa do vi phạm quy chế */}
      {isDeviceBlocked && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-md flex items-start gap-3.5 animate-in fade-in">
          <div className="p-2.5 rounded-xl bg-rose-600 text-white flex-shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-rose-950 uppercase tracking-tight">
                TẠM KHÓA VÌ ĐÃ VI PHẠM QUY ĐỊNH
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-200 text-rose-900 border border-rose-400 font-mono shadow-2xs">
                SBD: {clientIp || 'SBD'} [Chặn]
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-rose-900 bg-white/90 p-2.5 rounded-xl border border-rose-200 shadow-2xs flex items-center gap-1.5">
                <span>👉</span>
                <span>Vui lòng liên hệ trực tiếp với <strong>Giáo viên bộ môn</strong> để được kiểm tra và mở khóa làm bài!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft Recovery Alert */}
      {existingDraft && config.isExamActive !== false && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Phát hiện bài làm chưa hoàn thành!
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Học sinh <strong>{existingDraft.studentInfo.fullName}</strong> ({existingDraft.studentInfo.className}) còn bài làm dở dang lúc {existingDraft.lastSavedAt} (còn {Math.floor(existingDraft.remainingSeconds / 60)} phút {existingDraft.remainingSeconds % 60} giây).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:flex-center">
            <button
              onClick={onDiscardDraft}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Hủy bài cũ
            </button>
            <button
              onClick={onResumeDraft}
              disabled={isDeviceBlocked}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
            >
              Làm tiếp ngay
            </button>
          </div>
        </div>
      )}

      {/* Thông báo khi bài kiểm tra ở trạng thái TẮT (thủ công ở ô J1 hoặc tự động tắt sau ngày hết hạn D3) */}
      {!isEffectiveExamActive ? (
        <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-xl p-8 sm:p-12 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl border border-amber-200/60 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase mb-3">
            HIỆN TẠI KHÔNG CÓ BÀI KIỂM TRA NÀO
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            {dateStatus.status === 'expired'
              ? `Kỳ kiểm tra đã kết thúc vào ngày ${dateStatus.endDateFormatted} (Hệ thống đã tự động đóng bài kiểm tra). Học sinh vui lòng đợi giáo viên thông báo mở bài kiểm tra hoặc chọn đợt thi mới!`
              : dateStatus.status === 'not_started'
              ? `Chưa đến thời gian làm bài kiểm tra (Thời gian mở từ ngày: ${dateStatus.startDateFormatted}). Học sinh vui lòng quay lại sau!`
              : 'Hệ thống bài kiểm tra hiện đang tạm đóng. Học sinh vui lòng đợi giáo viên thông báo mở bài kiểm tra!'}
          </p>
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            {config.schoolName} • Bản quyền: {config.copyrightText}
          </div>
        </div>
      ) : (
        /* Main Start Card */
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          {/* Card Header with Soft Gradient - Thu gọn theo yêu cầu */}
          <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 px-3.5 py-2.5 sm:px-5 sm:py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sky-100 text-[10px] sm:text-xs font-semibold mb-0.5">
                <School className="w-3.5 h-3.5 flex-shrink-0 text-sky-200" />
                <span className="truncate">{config.schoolName}</span>
              </div>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-white uppercase truncate">
                {config.examName}
              </h2>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 border border-white/20 text-right flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 text-sky-200 flex-shrink-0" />
              <div>
                <span className="text-[9px] uppercase tracking-wider text-sky-100 block font-medium leading-none">
                  Thời gian
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-mono leading-tight">
                  {config.durationMinutes} phút
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Information Chips - Thu gọn gọn gàng */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 sm:p-4 bg-sky-50/50 border-b border-sky-100 text-xs">
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-sky-100 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">Môn học:</span>
              <strong className="text-slate-800 text-xs truncate block">{config.subject}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-sky-100 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">Cấu trúc:</span>
              <strong className="text-slate-800 text-xs truncate block">
                {[
                  calculatedMcCount > 0 ? `${calculatedMcCount} TN 4 lựa chọn` : null,
                  calculatedTfCount > 0 ? `${calculatedTfCount} Đúng/Sai` : null,
                  calculatedEssayCount > 0 ? `${calculatedEssayCount} Tự luận` : null,
                ].filter(Boolean).join(' + ') || `${questions?.length || 0} câu`}
              </strong>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-sky-100 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">Hình thức:</span>
              <strong className="text-slate-800 text-xs truncate block">Tự động tính giờ & Lưu điểm</strong>
            </div>
          </div>
        </div>

        {/* Student Inputs Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
              <span>Thông tin thí sinh tham gia</span>
              <span
                className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                  isDeviceBlocked
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
                title="Số báo danh mạng của thiết bị"
              >
                <Globe className="w-3.5 h-3.5 opacity-70" />
                <span>Số báo danh: </span>
                <strong>{isLoadingIp ? 'Đang nhận diện...' : (clientIp || 'Đang kết nối')}</strong>
                {isDeviceBlocked && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold ml-1">ĐÃ CHẶN</span>}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vui lòng điền chính xác Họ tên và Lớp của học sinh
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Họ và Tên học sinh <span className="text-rose-500">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onBlur={() => {
                  if (studentName.trim()) {
                    setStudentName(formatStudentName(studentName));
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-medium transition-all bg-white"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="student-class" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Lớp <span className="text-rose-500">*</span>
              </label>
              <input
                id="student-class"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value.toUpperCase())}
                onBlur={() => {
                  if (className.trim()) {
                    setClassName(formatClassName(className));
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-medium transition-all bg-white uppercase"
              />
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="rounded-xl bg-sky-50/60 p-4 border border-sky-100 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-900">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span>Quy chế và Lưu ý khi làm bài:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[12px]">
              <li>Hệ thống <strong>tự động lưu nháp</strong> từng giây để không mất bài ngay cả khi rớt mạng.</li>
              <li>Bạn luôn có <strong>Nút Xem lại</strong> để rà soát và đổi đáp án các câu trước đó.</li>
              <li>Hết thời gian ({config.durationMinutes || 20} phút), hệ thống sẽ <strong>tự động khóa bài và nộp</strong>.</li>
            </ul>
          </div>

          {/* Submit/Start Button */}
          <button
            id="btn-start-exam"
            type="submit"
            disabled={isDeviceBlocked || isCheckingSecurity}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all ${
              isDeviceBlocked
                ? 'bg-rose-700 text-white opacity-90 shadow-rose-700/25 cursor-not-allowed'
                : isCheckingSecurity
                ? 'bg-sky-400 text-white cursor-wait'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-500/25 cursor-pointer'
            }`}
          >
            {isCheckingSecurity ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang kiểm tra bảo mật...</span>
              </>
            ) : isDeviceBlocked ? (
              <>
                <ShieldAlert className="w-5 h-5" />
                <span>TẠM KHÓA</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>BẮT ĐẦU LÀM BÀI</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Hệ thống đánh giá năng lực trực tuyến • Bản quyền:{' '}
          <strong className="text-slate-700 font-semibold">{config.copyrightText}</strong>
        </div>
      </div>
      )}
    </div>
  );
};
