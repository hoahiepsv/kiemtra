import React, { useRef, useState } from 'react';
import { X, Download, Loader2, CheckCircle2, Printer, Palette, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { VietnameseExamPaper, ExamPaperTheme } from './VietnameseExamPaper';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionRecord;
  config: ExamConfig;
  questions?: Question[];
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  config,
  questions = [],
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ExamPaperTheme>('navy');

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

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
        height: scrollHeight,
        width: scrollWidth,
        style: {
          height: `${scrollHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
        },
      });

      const safeName = (submission.studentName || 'HocSinh')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const safeClass = (submission.className || 'Lop').replace(/[^a-zA-Z0-9]/g, '_');

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
          {/* Sub Toolbar */}
          <div className="w-full max-w-[820px] flex items-center justify-between pb-3 text-xs text-slate-600 print:hidden">
            <span className="font-serif italic text-slate-500 text-[11px]">
              Giao diện trang giấy thi học sinh • Con điểm đỏ và lời phê của giáo viên
            </span>
          </div>

          {/* Capturable Vietnamese Exam Paper */}
          <div
            ref={reportRef}
            className="w-full flex justify-center bg-white shadow-md print:shadow-none print:w-full"
          >
            <VietnameseExamPaper
              submission={submission}
              config={config}
              questions={questions}
              theme={selectedTheme}
              showCorrectAnswers={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
