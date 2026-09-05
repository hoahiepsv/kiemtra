import React, { useRef, useState } from 'react';
import { X, ShieldCheck, Award, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SubmissionRecord, ExamConfig } from '../types';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionRecord;
  config: ExamConfig;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  config,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const correctCount = submission.questionResults?.filter((q) => q.isCorrect).length ?? 0;
  const totalQuestionsCount = submission.questionResults?.length ?? 0;
  const percentage = Math.round((submission.totalScore / (submission.maxScore || 10)) * 100);

  const getGradeEvaluation = (score: number, max: number) => {
    const ratio = score / (max || 10);
    if (ratio >= 0.9) return { label: 'Xuất sắc', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (ratio >= 0.8) return { label: 'Giỏi', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (ratio >= 0.65) return { label: 'Khá', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (ratio >= 0.5) return { label: 'Đạt yêu cầu', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Cần cố gắng thêm', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const grade = getGradeEvaluation(submission.totalScore, submission.maxScore || 10);

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
      const scrollWidth = node.scrollWidth || 760;

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
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
      link.download = `KetQua_${safeName}_${safeClass}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi khi xuất ảnh báo cáo:', err);
      alert('Không thể tạo file ảnh báo cáo. Vui lòng thử lại.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:block">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Action Header bar (Hidden in print) */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 px-5 py-3.5 text-white flex items-center justify-between print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">
              Phiếu kết quả kiểm tra
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Tải về dạng ảnh */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-75"
              title="Tải kết quả kiểm tra dạng file ảnh chất lượng cao đầy đủ thông tin"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Đang tạo ảnh...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã tải ảnh!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-sky-600" />
                  <span>Tải kết quả kiểm tra</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with centered Report Card */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Printable & Capturable Report Body (Full height, never clipped) */}
          <div
            ref={reportRef}
            className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 h-auto print:border-none print:shadow-none print:p-4 print:rounded-none"
          >
            {/* Header of Certificate */}
            <div className="text-center pb-5 border-b-2 border-sky-600 mb-5">
              <div className="flex items-center justify-center text-xs font-extrabold uppercase tracking-widest text-sky-700 mb-1">
                <span>{config.schoolName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
                PHIẾU KẾT QUẢ {config.examName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Môn thi: <strong className="text-slate-800">{config.subject}</strong> • Thời gian quy định: {config.durationMinutes} phút
              </p>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-sky-50/50 border border-sky-100 text-xs mb-5">
              <div>
                <span className="text-slate-400 block text-[11px]">Họ và tên thí sinh:</span>
                <strong className="text-slate-900 text-sm">{submission.studentName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lớp:</span>
                <strong className="text-slate-900 text-sm uppercase">{submission.className}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Thời gian làm bài:</span>
                <strong className="text-slate-800 text-xs">{submission.totalDuration} (Bắt đầu: {submission.startTime})</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Thời điểm nộp bài:</span>
                <strong className="text-slate-800 text-xs">{submission.endTime}</strong>
              </div>
              {submission.ipAddress && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">IP máy nộp bài:</span>
                  <strong className="text-slate-800 text-xs font-mono">{submission.ipAddress}</strong>
                </div>
              )}
            </div>

            {/* Score & Evaluation Badge */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50/60 via-rose-50/40 to-red-50/60 border-2 border-red-200 text-center mb-5">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-700">
                  Tổng điểm đạt được
                </span>
                <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${grade.color}`}>
                  {grade.label}
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-red-600 my-1 font-mono tracking-tight">
                {submission.totalScore}
                <span className="text-xl sm:text-2xl font-bold text-red-500">/{submission.maxScore}</span>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-2 border-t border-red-100 mt-2">
                <span>Đúng: <strong className="text-emerald-700 font-bold">{correctCount} / {totalQuestionsCount}</strong> câu</span>
                <span>Tỷ lệ hoàn thành: <strong className="text-sky-800 font-bold">{percentage}%</strong></span>
              </div>
            </div>

            {/* Detailed Question Table */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5">
                Bảng điểm chi tiết từng câu hỏi ({submission.questionResults?.length ?? 0} câu)
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-center w-12">Câu</th>
                      <th className="p-2">Phân loại</th>
                      <th className="p-2 text-center">Bài làm HS</th>
                      <th className="p-2 text-center">Kết quả</th>
                      <th className="p-2 text-right">Điểm đạt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submission.questionResults.map((q) => {
                      const isBlank =
                        !q.studentAnswer ||
                        q.studentAnswer.trim() === '' ||
                        q.studentAnswer === '-';

                      return (
                        <tr key={q.questionId} className={q.isCorrect ? 'bg-white' : 'bg-rose-50/20'}>
                          <td className="p-2 text-center font-bold text-slate-700">{q.orderNumber}</td>
                          <td className="p-2 text-slate-600">{q.category}</td>
                          <td className="p-2 text-center font-mono font-semibold text-slate-800">
                            {isBlank ? '-' : q.studentAnswer}
                          </td>
                          <td className="p-2 text-center">
                            {q.isCorrect ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-100 text-emerald-800">
                                Đúng
                              </span>
                            ) : isBlank ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-100 text-amber-800">
                                Bỏ trống
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-100 text-rose-800">
                                Chưa đúng
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-800">
                            {q.earnedPoints} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher remarks & Signatures */}
            <div className="pt-5 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Nhận xét của Giáo viên:</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 min-h-[65px] leading-relaxed">
                  {submission.totalScore >= 8.5
                    ? 'Học sinh nắm rất vững kiến thức, kỹ năng giải đề nhanh và chính xác. Khen ngợi!'
                    : submission.totalScore >= 6.5
                    ? 'Học sinh có ý thức học tập tốt, hoàn thành cơ bản nội dung. Cần luyện thêm phần tính toán.'
                    : 'Cần tích cực ôn tập lại lý thuyết và làm bài tập bồi dưỡng theo lộ trình cá nhân hóa.'}
                </div>
              </div>

              <div className="text-center flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày xuất phiếu: {submission.endTime}</span>
                  <strong className="text-slate-800 block mt-1 uppercase">Giáo viên phụ trách</strong>
                </div>
                <div className="h-12 sm:h-14 flex items-center justify-center">
                  <span className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</span>
                </div>
              </div>
            </div>

            {/* Copyright & verification footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Hệ thống Kiểm Tra Thường Xuyên • Bản quyền: <strong>{config.copyrightText}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
