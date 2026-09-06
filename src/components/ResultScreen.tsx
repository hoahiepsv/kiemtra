import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Database,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Question, SubmissionRecord, ExamConfig } from '../types';
import { playCompletionFanfare } from '../utils/audio';
import { formatExamDateTime, formatExamDuration } from '../utils/dateUtils';

interface ResultScreenProps {
  config: ExamConfig;
  submission: SubmissionRecord;
  questions: Question[];
  onRestart?: () => void;
  onOpenPdfReport: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  config,
  submission,
  questions,
  onOpenPdfReport,
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Trigger celebration effects
  useEffect(() => {
    playCompletionFanfare();
    if (submission.totalScore >= 7.0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#fbbf24', '#34d399'],
      });
    }
  }, [submission.totalScore]);

  const correctAnswersCount = submission.questionResults.filter((q) => q.isCorrect).length;

  const formattedScoreDetails =
    submission.questionResults && submission.questionResults.length > 0
      ? submission.questionResults
          .map((q, idx) => {
            const isBlank = !q.studentAnswer || q.studentAnswer.trim() === '' || q.studentAnswer === '-';
            return `Câu ${idx + 1}: ${isBlank ? '-' : `${q.earnedPoints}đ`}`;
          })
          .join(' - ')
      : submission.scoreString
      ? submission.scoreString
          .trim()
          .split(/\s+/)
          .map((part, idx) => {
            const colonIdx = part.indexOf(':');
            const val = colonIdx !== -1 ? part.substring(colonIdx + 1) : part;
            return `Câu ${idx + 1}: ${val === '-' ? '-' : `${val}đ`}`;
          })
          .join(' - ')
      : '';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Hero Score Banner */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 p-6 sm:p-10 text-white relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide uppercase">
                Hoàn thành kỳ kiểm tra
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {submission.studentName} - Lớp {submission.className}
              </h2>
              <p className="text-sky-100 text-xs sm:text-sm max-w-xl">
                {submission.syncedToData2 ? (
                  <span className="inline-block bg-slate-900/90 text-yellow-300 font-extrabold px-3.5 py-1.5 rounded-lg shadow-sm text-sm border border-yellow-400/50">
                    Đã gửi điểm cho giáo viên
                  </span>
                ) : (
                  'Bài kiểm tra đã được nộp và lưu kết quả thành công vào hệ thống dữ liệu.'
                )}
              </p>
            </div>

            {/* Score card */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-sky-100 shadow-md text-center flex-shrink-0 min-w-[170px]">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-600">
                Tổng điểm đạt được
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-red-600 my-1 font-mono">
                {submission.totalScore}
                <span className="text-xl sm:text-2xl font-bold text-red-500">/{submission.maxScore}</span>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                Đúng {correctAnswersCount} / {questions.length} câu
              </span>
            </div>
          </div>
        </div>

        {/* Exam Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-sky-50/40 border-b border-sky-100 text-xs">
          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Thời gian làm bài:</span>
              <strong className="text-slate-800 text-xs font-mono">
                {formatExamDuration(submission.totalDuration, submission.startTime, submission.endTime)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Bắt đầu - Nộp bài:</span>
              <strong className="text-slate-800 text-xs font-mono">
                {formatExamDateTime(submission.startTime) || '17:02'} - {formatExamDateTime(submission.endTime) || '17:04'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Database className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <strong className="text-xs flex items-center gap-1">
                <Check className={`w-3.5 h-3.5 ${submission.syncedToData2 ? 'text-amber-500' : 'text-emerald-700'}`} />
                {submission.syncedToData2 ? (
                  <span className="text-amber-600 font-extrabold">Đã gửi điểm cho giáo viên</span>
                ) : (
                  <span className="text-emerald-700">Đã lưu hệ thống</span>
                )}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <Award className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Điểm từng câu:</span>
              <strong className="text-slate-700 text-xs font-mono truncate max-w-[150px] block" title={formattedScoreDetails || submission.scoreString}>
                {formattedScoreDetails || submission.scoreString}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Controls: Download Result */}
        <div className="p-4 sm:p-6 flex flex-wrap items-center justify-start gap-3 bg-white">
          <button
            id="btn-download-report"
            onClick={onOpenPdfReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Tải kết quả kiểm tra</span>
          </button>
        </div>
      </div>

      {/* Chi tiết kết quả từng câu hỏi (Không hiển thị đáp án đúng) */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Chi tiết bài làm từng câu hỏi
            </h3>
            <p className="text-xs text-slate-500">
              Bài thi đã hoàn thành và nộp vào hệ thống. Xem lại câu trả lời và số điểm đạt được cho mỗi câu.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Tổng cộng: {questions.length} câu
          </span>
        </div>

        <div className="space-y-3">
          {submission.questionResults.map((result, idx) => {
            const question = questions.find((q) => q.id === result.questionId);
            if (!question) return null;
            const isExpanded = expandedQuestion === result.questionId;

            return (
              <div
                key={result.questionId}
                className={`rounded-xl border transition-all ${
                  result.isCorrect
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-rose-50/30 border-rose-200'
                }`}
              >
                <div
                  onClick={() => setExpandedQuestion(isExpanded ? null : result.questionId)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        result.isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {result.isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Câu {idx + 1}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({question.type} • {question.category})
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-1 mt-0.5">
                        {question.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        result.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {result.earnedPoints} / {result.maxPoints} đ
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details: student answer & points, NO answer key leaked */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100/80 text-xs space-y-2 mt-1">
                    <div className="p-3 bg-white rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">Bài làm của học sinh:</span>
                        <strong
                          className={result.isCorrect ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          {result.studentAnswer || '(Để trống)'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">Kết quả đánh giá:</span>
                        <strong
                          className={result.isCorrect ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          {result.isCorrect ? 'Chính xác' : 'Chưa chính xác'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
