import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Loader2, CheckCircle2, Printer, Palette, FileText, CheckSquare, Save } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { VietnameseExamPaper, ExamPaperTheme } from './VietnameseExamPaper';
import { overrideEssayGrade } from '../utils/gradeService';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionRecord;
  config: ExamConfig;
  questions?: Question[];
  isTeacherMode?: boolean;
  onUpdateSubmission?: (updated: SubmissionRecord) => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  config,
  questions = [],
  isTeacherMode = false,
  onUpdateSubmission,
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

  if (!isOpen) return null;

  const handleToggleEssayCorrect = (orderNumber: number, isCorrect: boolean) => {
    const updated = overrideEssayGrade(currentSubmission, questions, orderNumber, isCorrect);
    setCurrentSubmission(updated);
    setHasUnsavedChanges(true);
    setIsSaveSuccessful(false);
    setRegradeNotice(
      `Đã chuyển câu ${orderNumber} thành ${isCorrect ? 'ĐÚNG' : 'SAI'} (Điểm mới: ${String(updated.totalScore).replace('.', ',')} đ). Bấm 'Lưu cập nhật điểm cho hs' để xác nhận!`
    );
  };

  const handleSaveRegradedScore = async () => {
    setIsSaving(true);
    try {
      onUpdateSubmission?.(currentSubmission);
      setHasUnsavedChanges(false);
      setIsSaveSuccessful(true);
      setRegradeNotice(
        `✓ Đã lưu cập nhật điểm thành công cho học sinh ${currentSubmission.studentName} (${String(currentSubmission.totalScore).replace('.', ',')} đ)!`
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
      <div className="bg-slate-50 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Action Header bar (Hidden in print) */}
        <div className="bg-slate-900 px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-3 print:hidden flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-snug">
                Bản báo cáo kết quả bài kiểm tra
              </h3>
              <p className="text-[11px] text-slate-400">
                Chuẩn biểu mẫu bài kiểm tra học sinh Việt Nam • Định dạng ảnh xuất chuẩn nét
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Color Theme Selector */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <Palette className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <div className="flex items-center gap-1">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    title={`Màu ${t.name}`}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedTheme === t.id
                        ? 'bg-slate-700 text-white shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${t.dotColor}`} />
                    <span className="hidden md:inline">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="In trực tiếp ra giấy khổ A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In bài thi</span>
            </button>

            {/* Download Image Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-75"
              title="Tải ảnh bài kiểm tra chuẩn chất lượng cao PNG"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xuất ảnh...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Đã tải thành công!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh bài kiểm tra (PNG)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with centered Vietnamese Exam Paper */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-200/70 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {/* Sub Toolbar: Guidance for Teacher / Student */}
          <div className="w-full max-w-[820px] flex flex-col gap-2 pb-3 text-xs text-slate-600 print:hidden">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-serif italic text-slate-500 text-[11px]">
                Giao diện trang giấy thi học sinh • Con điểm đỏ và lời phê của giáo viên
              </span>
              {regradeNotice && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300 animate-in fade-in duration-150">
                  {regradeNotice}
                </span>
              )}
            </div>

            {isTeacherMode && (
              <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-2.5 px-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    <strong className="font-bold text-amber-950">Quyền giáo viên:</strong> Tại <strong>Mục II. PHẦN TỰ LUẬN</strong> bên dưới, thầy/cô có thể bấm nút <strong>Đúng</strong> hoặc <strong>Sai</strong> để chấm lại điểm nếu hệ thống nhận diện chưa chính xác. Điểm số và lời phê sẽ tự động cập nhật ngay lập tức.
                  </span>
                </div>
              </div>
            )}
          </div>

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
            </div>

            <div className="flex items-center gap-2">
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
