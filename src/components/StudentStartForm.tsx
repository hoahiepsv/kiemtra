import React, { useState, useEffect } from 'react';
import { Play, Clock, BookOpen, School, AlertCircle, Sparkles, RotateCcw, CheckCircle2, Globe } from 'lucide-react';
import { ExamConfig, DraftExam } from '../types';
import { fetchClientIp } from '../utils/ipService';

interface StudentStartFormProps {
  config: ExamConfig;
  totalQuestions: number;
  existingDraft: DraftExam | null;
  onStartExam: (studentName: string, className: string) => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onAuthorClick?: () => void;
}

export const StudentStartForm: React.FC<StudentStartFormProps> = ({
  config,
  totalQuestions,
  existingDraft,
  onStartExam,
  onResumeDraft,
  onDiscardDraft,
  onAuthorClick,
}) => {
  const [studentName, setStudentName] = useState(existingDraft?.studentInfo.fullName || '');
  const [className, setClassName] = useState(existingDraft?.studentInfo.className || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientIp, setClientIp] = useState<string>('');
  const [isLoadingIp, setIsLoadingIp] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    fetchClientIp().then((ip) => {
      if (isMounted) {
        setClientIp(ip);
        setIsLoadingIp(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ và Tên của học sinh!');
      return;
    }
    if (!className.trim()) {
      setErrorMessage('Vui lòng nhập Lớp của học sinh!');
      return;
    }
    setErrorMessage('');
    onStartExam(studentName.trim(), className.trim());
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Draft Recovery Alert */}
      {existingDraft && (
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
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onDiscardDraft}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Hủy bài cũ
            </button>
            <button
              onClick={onResumeDraft}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
            >
              Làm tiếp ngay
            </button>
          </div>
        </div>
      )}

      {/* Main Start Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        {/* Card Header with Soft Light Blue Gradient */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 px-6 py-6 text-white text-center sm:text-left relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-2">
                <School className="w-3.5 h-3.5" />
                <span>{config.schoolName}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {config.examName}
              </h2>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center flex-shrink-0 self-center sm:self-auto">
              <span className="text-[11px] uppercase tracking-wider text-sky-200 block font-medium">
                Thời gian làm bài
              </span>
              <span className="text-2xl font-black text-white block">
                {config.durationMinutes} <span className="text-sm font-normal">phút</span>
              </span>
            </div>
          </div>
        </div>

        {/* Exam Information Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 sm:p-6 bg-sky-50/50 border-b border-sky-100 text-xs">
          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <BookOpen className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Môn học:</span>
              <strong className="text-slate-800 text-xs">{config.subject}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Quy mô đề:</span>
              <strong className="text-slate-800 text-xs">{totalQuestions} câu hỏi (Trắc nghiệm + Tự luận)</strong>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Hình thức:</span>
              <strong className="text-slate-800 text-xs">Tự động tính giờ & Lưu điểm</strong>
            </div>
          </div>
        </div>

        {/* Student Inputs Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
              <span>Thông tin thí sinh tham gia</span>
              <span
                className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200"
                title="Địa chỉ IP thiết bị bạn đang sử dụng (dạng: 113.169.89.135, ...)"
              >
                IP của bạn: <strong>{isLoadingIp ? 'Đang nhận diện...' : (clientIp || '113.169.89.135')}</strong>
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vui lòng điền chính xác Họ tên và Lớp
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
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
                onChange={(e) => setClassName(e.target.value)}
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
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-sky-500/25 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>BẮT ĐẦU LÀM BÀI</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Hệ thống đánh giá năng lực trực tuyến • Bản quyền:{' '}
          <strong className="text-slate-700 font-semibold">{config.copyrightText}</strong>
        </div>
      </div>
    </div>
  );
};
