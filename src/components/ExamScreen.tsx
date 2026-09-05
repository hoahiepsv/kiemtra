import React, { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  CheckCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  HelpCircle,
  Eye,
  Check,
  Grid,
} from 'lucide-react';
import { Question, StudentAnswer, ExamConfig } from '../types';
import { playSelectSound, playTimerWarningSound } from '../utils/audio';

interface ExamScreenProps {
  config: ExamConfig;
  studentName: string;
  className: string;
  questions: Question[];
  answers: Record<number, StudentAnswer>;
  onAnswerChange: (questionId: number, answer: Partial<StudentAnswer>) => void;
  remainingSeconds: number;
  lastSavedText: string;
  onSaveDraftManual: () => void;
  onSubmitExam: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  config,
  studentName,
  className,
  questions,
  answers,
  onAnswerChange,
  remainingSeconds,
  lastSavedText,
  onSaveDraftManual,
  onSubmitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);

  const currentQuestion = questions[currentIndex] || questions[0];
  const currentAnswer = answers[currentQuestion.id] || { questionId: currentQuestion.id };

  // Timer format (mm:ss)
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalSeconds = config.durationMinutes * 60;
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  // Audio cue when 5 minutes or 1 minute remaining
  useEffect(() => {
    if (remainingSeconds === 300 || remainingSeconds === 60) {
      playTimerWarningSound();
    }
  }, [remainingSeconds]);

  // Answered questions count
  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'Tự luận') {
      return !!ans.essayAnswer && ans.essayAnswer.trim() !== '';
    }
    return !!ans.selectedOption;
  }).length;

  const isQuestionAnswered = (q: Question): boolean => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'Tự luận') return !!ans.essayAnswer && ans.essayAnswer.trim() !== '';
    return !!ans.selectedOption;
  };

  const handleSelectOption = (opt: string) => {
    playSelectSound();
    onAnswerChange(currentQuestion.id, { selectedOption: opt });
  };

  const handleEssayChange = (val: string) => {
    onAnswerChange(currentQuestion.id, { essayAnswer: val });
  };

  const handleToggleFlag = () => {
    onAnswerChange(currentQuestion.id, { isFlagged: !currentAnswer.isFlagged });
  };

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Floating Control Bar */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 mb-6 sticky top-16 z-30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Student details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
              {className}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Thí sinh:</span>
              <strong className="text-slate-800 text-sm">{studentName}</strong>
            </div>
          </div>

          {/* Timer with dynamic warning colors */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
              remainingSeconds <= 120
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                : remainingSeconds <= 300
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}
          >
            <Clock className={`w-5 h-5 ${remainingSeconds <= 120 ? 'text-rose-600' : 'text-sky-600'}`} />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                Thời gian còn lại
              </span>
              <span className="text-lg font-black tracking-tight font-mono">{timeFormatted}</span>
            </div>
          </div>

          {/* Quick Actions: Review & Save Draft */}
          <div className="flex items-center gap-2">
            {/* Auto-save status */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lastSavedText || 'Đã lưu nháp tự động'}</span>
            </div>

            <button
              onClick={onSaveDraftManual}
              title="Nhấn để lưu nháp ngay lập tức"
              className="p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors border border-slate-200 md:hidden cursor-pointer"
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Persistent NÚT XEM LẠI as requested in prompt */}
            <button
              id="btn-review-questions"
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4" />
              <span>Nút xem lại ({answeredCount}/{questions.length})</span>
            </button>

            {/* Direct Submit Button */}
            <button
              id="btn-submit-header"
              onClick={() => setShowConfirmSubmitModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-xs cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all duration-1000 ${
              remainingSeconds <= 120 ? 'bg-rose-500' : 'bg-sky-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Panel (3 cols on desktop) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 sm:p-8">
            {/* Question metadata badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide bg-sky-100 text-sky-800">
                  Câu {currentIndex + 1} / {questions.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                  {currentQuestion.type}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  {currentQuestion.points} điểm
                </span>
              </div>

              {/* Bookmark / Flag for review button */}
              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentAnswer.isFlagged
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${currentAnswer.isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{currentAnswer.isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu câu này'}</span>
              </button>
            </div>

            {/* Question Content */}
            <div className="mb-8">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQuestion.content}
              </h3>
            </div>

            {/* Answer Options */}
            {currentQuestion.type === 'Trắc nghiệm 1 đáp án' ? (
              <div className="space-y-3">
                {[
                  { key: 'A', text: currentQuestion.optionA },
                  { key: 'B', text: currentQuestion.optionB },
                  { key: 'C', text: currentQuestion.optionC },
                  { key: 'D', text: currentQuestion.optionD },
                ].map(({ key, text }) => {
                  if (!text && !key) return null;
                  const isSelected = currentAnswer.selectedOption?.toUpperCase() === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectOption(key)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/90 border-sky-500 shadow-sm shadow-sky-100 ring-2 ring-sky-200'
                          : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="text-sm font-medium text-slate-800 pt-1 leading-relaxed">
                        {text || `Đáp án ${key}`}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-sky-600 ml-auto flex-shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Tự luận answer box */
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100">
                  <span className="text-xs font-bold text-sky-900 block mb-1">
                    Hướng dẫn nhập phần tự luận:
                  </span>
                  <p className="text-xs text-slate-600">
                    Vui lòng nhập kết quả số hoặc câu trả lời ngắn vào ô bên dưới (Ví dụ: 1000, 2000, 3000...).
                  </p>
                </div>

                <textarea
                  value={currentAnswer.essayAnswer || ''}
                  onChange={(e) => handleEssayChange(e.target.value)}
                  placeholder="Nhập câu trả lời hoặc số kết quả của bạn tại đây..."
                  rows={4}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 text-sm font-medium text-slate-900 transition-all outline-none resize-y bg-white"
                />
              </div>
            )}

            {/* Bottom Nav inside Question Panel */}
            <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100 gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              {isLastQuestion ? (
                <button
                  id="btn-submit-last-question"
                  onClick={() => setShowConfirmSubmitModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Nộp bài thi</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Question Navigator (Always accessible to review & edit) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Bảng câu hỏi
                </h4>
              </div>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                {answeredCount}/{questions.length} đã làm
              </span>
            </div>

            {/* Quick Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-sky-500" />
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-200" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400" />
                <span>Xem lại ⭐</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs border-2 border-sky-600" />
                <span>Đang xem</span>
              </div>
            </div>

            {/* Question numbers grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const answered = isQuestionAnswered(q);
                const isCurrent = idx === currentIndex;
                const isFlagged = answers[q.id]?.isFlagged;

                let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (answered) {
                  btnStyle = 'bg-sky-500 text-white border-sky-600 hover:bg-sky-600 shadow-xs';
                }
                if (isFlagged) {
                  btnStyle = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                }
                if (isCurrent) {
                  btnStyle += ' ring-2 ring-sky-600 ring-offset-2';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer border ${btnStyle}`}
                  >
                    {q.orderNumber}
                  </button>
                );
              })}
            </div>

            {/* Bottom prompt to review */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Mở danh sách xem lại chi tiết
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: BẢNG XEM LẠI CÁC CÂU HỎI ĐÃ QUA */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-sky-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <h3 className="font-bold text-base">Xem lại & Chỉnh sửa các câu hỏi</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Nhấn vào bất kỳ câu hỏi nào bên dưới để mở lại câu đó và chỉnh sửa đáp án đã chọn:
              </p>

              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const answered = isQuestionAnswered(q);
                  const ans = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowReviewModal(false);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        answered
                          ? 'bg-sky-50/50 border-sky-200 hover:bg-sky-100/60'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            answered ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {q.orderNumber}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {q.content}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {q.type} • {q.points} điểm
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ans?.isFlagged && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            ⭐ Xem lại
                          </span>
                        )}
                        {answered ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã làm: {q.type === 'Tự luận' ? ans.essayAnswer : ans.selectedOption}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Chưa làm
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors cursor-pointer"
              >
                Đóng & Tiếp tục làm bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XÁC NHẬN NỘP BÀI ("Bạn chắc chắn muốn nộp bài? - Đúng / Không") */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Bạn chắc chắn muốn nộp bài?
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mb-4">
              Sau khi nộp, bạn <strong>không thể chỉnh sửa</strong> bài làm nữa. Hệ thống sẽ lưu kết quả và tính điểm ngay lập tức.
            </p>

            {/* Completion summary badge */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs text-slate-700">
              {answeredCount === questions.length ? (
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Bạn đã hoàn thành đầy đủ {questions.length}/{questions.length} câu hỏi!</span>
                </div>
              ) : (
                <div className="text-amber-800">
                  ⚠️ Lưu ý: Bạn mới làm <strong>{answeredCount} / {questions.length}</strong> câu. Vẫn còn <strong>{questions.length - answeredCount}</strong> câu chưa có câu trả lời!
                </div>
              )}
            </div>

            {/* Exact buttons requested: Đúng - Không */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-confirm-submit-no"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Không (Làm tiếp)
              </button>

              <button
                id="btn-confirm-submit-yes"
                onClick={() => {
                  setShowConfirmSubmitModal(false);
                  onSubmitExam();
                }}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 transition-colors shadow-md shadow-sky-500/25 cursor-pointer"
              >
                Đúng (Nộp bài)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
