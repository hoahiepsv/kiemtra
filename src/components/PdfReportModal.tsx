import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Loader2,
  CheckCircle2,
  Printer,
  Palette,
  FileText,
  Save,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { VietnameseExamPaper, ExamPaperTheme } from './VietnameseExamPaper';
import { overrideEssayGrade } from '../utils/gradeService';

export interface RegradeMeta {
  targetOrderNumber?: number;
  questionScore?: number;
  isCorrect?: boolean;
}

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionRecord;
  config: ExamConfig;
  questions?: Question[];
  isTeacherMode?: boolean;
  onUpdateSubmission?: (updated: SubmissionRecord, meta?: RegradeMeta) => Promise<void> | void;
  submissionsList?: SubmissionRecord[];
  onSelectSubmission?: (sub: SubmissionRecord) => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  config,
  questions = [],
  isTeacherMode = false,
  onUpdateSubmission,
  submissionsList = [],
  onSelectSubmission,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionRecord>(submission);
  const [regradeNotice, setRegradeNotice] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccessful, setIsSaveSuccessful] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ExamPaperTheme>('navy');

  useEffect(() => {
    setCurrentSubmission(submission);
    setHasUnsavedChanges(false);
    setIsSaveSuccessful(false);
  }, [submission]);

  // Tìm vị trí học sinh hiện tại trong danh sách để chuyển tới lui
  const currentIndex = useMemo(() => {
    if (!submissionsList || submissionsList.length === 0) return -1;
    return submissionsList.findIndex((s) => {
      if (s.stt !== undefined && currentSubmission.stt !== undefined && s.stt === currentSubmission.stt) {
        return true;
      }
      const sameName =
        String(s.studentName || '').trim().toLowerCase() ===
        String(currentSubmission.studentName || '').trim().toLowerCase();
      const sameClass =
        String(s.className || '').trim().toLowerCase() ===
        String(currentSubmission.className || '').trim().toLowerCase();
      const sameEndTime = !s.endTime || !currentSubmission.endTime || s.endTime === currentSubmission.endTime;
      return sameName && sameClass && sameEndTime;
    });
  }, [submissionsList, currentSubmission]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && submissionsList.length > 0 && currentIndex < submissionsList.length - 1;
  const prevStudent = hasPrev ? submissionsList[currentIndex - 1] : null;
  const nextStudent = hasNext ? submissionsList[currentIndex + 1] : null;

  const navigateToStudent = (target: SubmissionRecord | null) => {
    if (!target) return;
    if (hasUnsavedChanges) {
      try {
        onUpdateSubmission?.(currentSubmission);
      } catch (err) {
        console.error(err);
      }
    }
    setCurrentSubmission(target);
    setHasUnsavedChanges(false);
    setRegradeNotice(null);
    onSelectSubmission?.(target);
  };

  // Hỗ trợ phím mũi tên bàn phím: ← (Trái) để lùi, → (Phải) để tới
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft' && hasPrev && prevStudent) {
        e.preventDefault();
        navigateToStudent(prevStudent);
      } else if (e.key === 'ArrowRight' && hasNext && nextStudent) {
        e.preventDefault();
        navigateToStudent(nextStudent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, prevStudent, nextStudent, hasUnsavedChanges, currentSubmission]);

  if (!isOpen) return null;

  const handleToggleEssayCorrect = async (orderNumber: number, isCorrect: boolean) => {
    const updated = overrideEssayGrade(currentSubmission, questions, orderNumber, isCorrect);
    setCurrentSubmission(updated);

    // Tính điểm của câu vừa xác nhận
    const qResult = updated.questionResults?.find((q) => q.orderNumber === orderNumber);
    const newScore = qResult !== undefined ? qResult.earnedPoints : (isCorrect ? 1 : 0);

    setRegradeNotice(
      `Đang cập nhật câu ${orderNumber} (${String(newScore).replace('.', ',')} đ) vào datasheet...`
    );

    try {
      if (onUpdateSubmission) {
        await onUpdateSubmission(updated, {
          targetOrderNumber: orderNumber,
          questionScore: newScore,
          isCorrect: isCorrect,
        });
      }
      setHasUnsavedChanges(false);
      setIsSaveSuccessful(true);
      setRegradeNotice(
        `✓ Đã cập nhật câu ${orderNumber} (${isCorrect ? 'ĐÚNG' : 'SAI'}: ${String(newScore).replace('.', ',')} đ) vào datasheet! Tổng điểm: ${String(updated.totalScore).replace('.', ',')} đ.`
      );
      setTimeout(() => {
        setIsSaveSuccessful(false);
      }, 4000);
    } catch (err) {
      console.error('Lỗi khi cập nhật datasheet:', err);
      setRegradeNotice(
        `Đã đổi câu ${orderNumber} thành ${isCorrect ? 'ĐÚNG' : 'SAI'} (Đã lưu máy, đang thử gửi lại datasheet).`
      );
    }
  };

  const handleSaveRegradedScore = async () => {
    setIsSaving(true);
    try {
      if (onUpdateSubmission) {
        await onUpdateSubmission(currentSubmission);
      }
      setHasUnsavedChanges(false);
      setIsSaveSuccessful(true);
      setRegradeNotice(
        `✓ Đã cập nhật toàn bộ kết quả học sinh ${currentSubmission.studentName} (${String(currentSubmission.totalScore).replace('.', ',')} đ) vào datasheet!`
      );
      setTimeout(() => {
        setIsSaveSuccessful(false);
      }, 4000);
    } catch (err) {
      console.error('Lỗi khi lưu điểm:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);
      setIsExportingImage(true);

      // Wait a tick for DOM to update with export view
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (document.fonts) {
        await document.fonts.ready;
      }

      const node = reportRef.current;
      const scrollHeight = node.scrollHeight;
      const scrollWidth = node.scrollWidth || 800;

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        skipFonts: true,
        filter: (domNode) => {
          if (domNode instanceof HTMLElement && domNode.classList?.contains('hide-on-export')) {
            return false;
          }
          return true;
        },
        height: scrollHeight,
        width: scrollWidth,
        style: {
          height: `${scrollHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
        },
      });

      const safeName = (currentSubmission.studentName || 'HocSinh')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const safeClass = (currentSubmission.className || 'Lop').replace(/[^a-zA-Z0-9]/g, '_');

      const link = document.createElement('a');
      link.download = `BaiKiemTra_${safeName}_${safeClass}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi khi xuất ảnh bài kiểm tra:', err);
      alert('Không thể tạo file ảnh bài kiểm tra. Vui lòng thử lại.');
    } finally {
      setIsExportingImage(false);
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const themes: { id: ExamPaperTheme; name: string; dotColor: string }[] = [
    { id: 'navy', name: 'Xanh mực học trò', dotColor: 'bg-blue-800' },
    { id: 'vintage', name: 'Nâu cổ điển', dotColor: 'bg-amber-800' },
    { id: 'emerald', name: 'Xanh rêu sư phạm', dotColor: 'bg-emerald-800' },
    { id: 'burgundy', name: 'Đỏ đô trang nhã', dotColor: 'bg-rose-900' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:block">
      {/* Nút mũi tên TRÁI - Học sinh trước (ở bên trái modal) */}
      {submissionsList.length > 1 && (
        <button
          type="button"
          onClick={() => navigateToStudent(prevStudent)}
          disabled={!hasPrev}
          aria-label="Học sinh trước"
          className={`fixed left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-60 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-sky-600 shadow-2xl border-2 border-slate-200/80 transition-all flex items-center justify-center print:hidden ${
            !hasPrev
              ? 'opacity-25 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer hover:scale-110 active:scale-95 hover:border-sky-400'
          }`}
          title={
            prevStudent
              ? `Học sinh trước: ${prevStudent.studentName} (${prevStudent.className || 'Chưa rõ'}) - Phím ←`
              : 'Không có học sinh trước'
          }
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
        </button>
      )}

      {/* Nút mũi tên PHẢI - Học sinh kế tiếp (ở bên phải modal) */}
      {submissionsList.length > 1 && (
        <button
          type="button"
          onClick={() => navigateToStudent(nextStudent)}
          disabled={!hasNext}
          aria-label="Học sinh kế tiếp"
          className={`fixed right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-60 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-sky-600 shadow-2xl border-2 border-slate-200/80 transition-all flex items-center justify-center print:hidden ${
            !hasNext
              ? 'opacity-25 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer hover:scale-110 active:scale-95 hover:border-sky-400'
          }`}
          title={
            nextStudent
              ? `Học sinh kế tiếp: ${nextStudent.studentName} (${nextStudent.className || 'Chưa rõ'}) - Phím →`
              : 'Không có học sinh sau'
          }
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
        </button>
      )}

      <div className="bg-slate-50 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Action Header bar (Hidden in print) - Gọn gàng, tinh tế */}
        <div className="bg-slate-900 px-4 py-2 sm:py-2.5 text-white flex items-center justify-between gap-2.5 print:hidden flex-shrink-0 border-b border-slate-800">
          {/* Bên trái: Icon, Tiêu đề ngắn gọn và thông tin học sinh */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  Báo cáo bài thi
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
                <span className="text-sky-300 text-xs font-semibold truncate">
                  {currentSubmission.studentName} ({currentSubmission.className || 'Chưa rõ lớp'})
                </span>
              </div>
            </div>
          </div>

          {/* Ở giữa: Thanh chuyển nhanh học sinh */}
          {submissionsList.length > 1 && currentIndex !== -1 && (
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => navigateToStudent(prevStudent)}
                disabled={!hasPrev}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title={prevStudent ? `Học sinh trước: ${prevStudent.studentName} (Phím ←)` : 'Không có học sinh trước'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-white text-[11px] sm:text-xs px-1 select-none">
                {currentIndex + 1}/{submissionsList.length}
              </span>
              <button
                type="button"
                onClick={() => navigateToStudent(nextStudent)}
                disabled={!hasNext}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title={nextStudent ? `Học sinh sau: ${nextStudent.studentName} (Phím →)` : 'Không có học sinh sau'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bên phải: Chọn màu, In, Tải ảnh, Đóng */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Bộ chọn màu dạng tròn gọn */}
            <div className="flex items-center gap-1 bg-slate-800/90 px-1.5 py-1 rounded-lg border border-slate-700 text-xs" title="Đổi màu giao diện bài thi">
              <Palette className="w-3 h-3 text-slate-400" />
              <div className="flex items-center gap-1">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    title={`Màu ${t.name}`}
                    className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${t.dotColor} ${
                      selectedTheme === t.id
                        ? 'ring-2 ring-white scale-110 shadow-xs'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* In */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="In ra giấy (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">In</span>
            </button>

            {/* Tải ảnh */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-75"
              title="Tải ảnh bài kiểm tra (PNG)"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Đang xuất...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Đã tải!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải ảnh</span>
                </>
              )}
            </button>

            {/* Đóng */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with centered Vietnamese Exam Paper */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-200/70 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {/* Capturable Vietnamese Exam Paper */}
          <div
            ref={reportRef}
            className="w-full flex justify-center bg-white shadow-md print:shadow-none print:w-full"
          >
            <VietnameseExamPaper
              submission={currentSubmission}
              config={config}
              questions={questions}
              theme={selectedTheme}
              showCorrectAnswers={false}
              isTeacherMode={isTeacherMode}
              isExportingImage={isExportingImage}
              onToggleEssayCorrect={handleToggleEssayCorrect}
              onSaveRegradedScore={handleSaveRegradedScore}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaveSuccessful={isSaveSuccessful}
              isSaving={isSaving}
            />
          </div>
        </div>

        {/* Teacher Bottom Persistent Action Bar */}
        {isTeacherMode && (
          <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-lg z-20 print:hidden flex-shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="text-xs text-slate-700">
                Học sinh: <strong className="text-slate-900 font-bold">{currentSubmission.studentName}</strong> ({currentSubmission.className})
                {' • '}
                Điểm số sau chấm: <strong className="text-red-600 font-extrabold text-sm">{String(currentSubmission.totalScore).replace('.', ',')} đ</strong>
              </div>
              {hasUnsavedChanges && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  Có thay đổi chưa lưu
                </span>
              )}
              {isSaveSuccessful && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ Đã lưu vào hệ thống
                </span>
              )}
              {regradeNotice && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 animate-in fade-in">
                  {regradeNotice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {submissionsList.length > 1 && (
                <div className="flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    onClick={() => navigateToStudent(prevStudent)}
                    disabled={!hasPrev}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
                    title="Học sinh trước (Phím ←)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToStudent(nextStudent)}
                    disabled={!hasNext}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
                    title="Học sinh sau (Phím →)"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveRegradedScore}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-75 ${
                  isSaveSuccessful
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : hasUnsavedChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : isSaveSuccessful ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Đã lưu thành công!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu cập nhật điểm cho hs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
