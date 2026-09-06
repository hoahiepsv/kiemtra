import React from 'react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { Award, CheckCircle2, XCircle, Clock, Calendar, School, User, Check, ShieldCheck } from 'lucide-react';
import { formatExamDateTime, formatExamDuration } from '../utils/dateUtils';

interface StudentReportCardProps {
  submission: SubmissionRecord;
  config: ExamConfig;
  questions: Question[];
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  submission,
  config,
  questions,
}) => {
  // Reconstruct or use questionResults
  const questionResults = React.useMemo(() => {
    if (submission.questionResults && submission.questionResults.length > 0) {
      return submission.questionResults;
    }

    // Reconstruct from scoreString if questionResults is empty (e.g. from Google Sheet data2)
    const parts = (submission.scoreString || '').trim().split(/\s+/);
    const scoreMap = new Map<number, number>();
    const blankSet = new Set<number>();
    parts.forEach((p) => {
      const [order, pts] = p.split(':');
      if (order && pts !== undefined) {
        const orderNum = parseInt(order, 10);
        if (pts === '-') {
          blankSet.add(orderNum);
          scoreMap.set(orderNum, 0);
        } else {
          scoreMap.set(orderNum, parseFloat(pts) || 0);
        }
      }
    });

    return questions.map((q, idx) => {
      const order = q.orderNumber || idx + 1;
      const isBlank = blankSet.has(order);
      const earned = scoreMap.get(order) ?? (submission.totalScore > 0 ? q.points : 0);
      return {
        questionId: q.id,
        orderNumber: order,
        studentAnswer: isBlank ? '-' : (earned > 0 ? q.correctAnswer : '-'),
        correctAnswer: q.correctAnswer,
        isCorrect: !isBlank && earned > 0,
        earnedPoints: earned,
        maxPoints: q.points,
        category: q.category || 'Kiến thức chung',
      };
    });
  }, [submission, questions]);

  const correctCount = questionResults.filter((q) => q.isCorrect).length;
  const totalQuestionsCount = questionResults.length || questions.length;
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

  return (
    <div
      id={`student-report-card-${submission.stt || submission.timestamp || submission.studentName}`}
      className="w-[800px] bg-white text-slate-800 p-8 font-sans border border-slate-200 shadow-sm relative mx-auto"
      style={{ minHeight: '1050px' }}
    >
      {/* Decorative top colored bar */}
      <div className="h-2.5 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 -mt-8 -mx-8 mb-6 rounded-t-sm" />

      {/* Official Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start text-xs text-slate-600">
          <div>
            <p className="font-bold uppercase text-slate-800 tracking-wide text-sm">{config.schoolName}</p>
            <p className="mt-0.5 font-medium text-slate-600">{config.subject}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-[11px] italic text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>

        <div className="text-center mt-5">
          <h1 className="text-xl font-extrabold uppercase tracking-wide text-sky-900">
            PHIẾU BÁO CÁO KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC
          </h1>
          <p className="text-xs font-semibold uppercase text-slate-600 mt-1">
            KỲ KIỂM TRA: {config.examName}
          </p>
        </div>
      </div>

      {/* Student Profile & Meta Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Họ và tên thí sinh:</span>
            <strong className="text-slate-900 text-sm uppercase">{submission.studentName}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Lớp học:</span>
            <strong className="text-slate-800 font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded">
              {submission.className}
            </strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Thời gian bắt đầu :</span>
            <span className="text-slate-700 font-mono font-medium">
              {formatExamDateTime(submission.startTime || (submission.totalDuration?.includes('T') ? submission.totalDuration : '')) || '17:02 06/09/2026'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Thời gian nộp bài :</span>
            <span className="text-slate-700 font-mono font-medium">
              {formatExamDateTime(submission.endTime) || '17:04 06/09/2026'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Thời lượng :</span>
            <span className="text-slate-700 font-mono font-medium">
              {formatExamDuration(submission.totalDuration, submission.startTime, submission.endTime)}
            </span>
          </div>
          {submission.ipAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500" title="Địa chỉ IP thiết bị làm bài của thí sinh">
                IP của bạn :
              </span>
              <span className="text-sky-900 font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                {submission.ipAddress}
              </span>
            </div>
          )}
        </div>

        {/* Score Big Card */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 p-4 rounded-xl border border-sky-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-sky-800">Tổng điểm đạt được</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${grade.color}`}>
              {grade.label}
            </span>
          </div>

          <div className="flex items-baseline justify-center my-1 gap-1">
            <span className="text-4xl font-extrabold text-red-600 tracking-tight">
              {submission.totalScore}
            </span>
            <span className="text-xl font-bold text-red-500">/{submission.maxScore || 10}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-sky-100 pt-2">
            <span>Đúng <strong>{correctCount} / {totalQuestionsCount}</strong> câu</span>
            <span>Tỷ lệ hoàn thành: <strong>{percentage}%</strong></span>
          </div>
        </div>
      </div>

      {/* Detailed Question Results Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
          <span>Chi tiết câu hỏi & kết quả làm bài</span>
        </h3>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                <th className="py-2 px-3 text-center w-12">STT</th>
                <th className="py-2 px-3">Phân loại câu hỏi</th>
                <th className="py-2 px-3 text-center w-24">Đáp án chọn</th>
                <th className="py-2 px-3 text-center w-24">Đáp án đúng</th>
                <th className="py-2 px-3 text-center w-20">Kết quả</th>
                <th className="py-2 px-3 text-right w-20">Điểm đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {questionResults.map((q, idx) => (
                <tr key={idx} className={q.isCorrect ? 'bg-white' : 'bg-rose-50/20'}>
                  <td className="py-1.5 px-3 text-center font-bold text-slate-600">
                    Câu {q.orderNumber || idx + 1}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-slate-700 truncate max-w-[220px]">
                    {q.category}
                  </td>
                  <td className="py-1.5 px-3 text-center font-bold text-slate-800">
                    {q.studentAnswer || '-'}
                  </td>
                  <td className="py-1.5 px-3 text-center font-bold text-emerald-700">
                    {q.correctAnswer}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    {q.isCorrect ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-100 text-emerald-800">
                        Đúng
                      </span>
                    ) : !q.studentAnswer || q.studentAnswer === '-' || q.studentAnswer.trim() === '' ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-100 text-amber-800">
                        Bỏ trống
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-100 text-rose-800">
                        Sai
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-800">
                    {q.earnedPoints}đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Comments & Signatures */}
      <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4 mt-auto">
        <div className="text-xs space-y-2">
          <p className="font-bold text-slate-700 uppercase">Nhận xét của giáo viên:</p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 italic text-slate-600 text-[11px] leading-relaxed">
            {submission.totalScore >= 8
              ? 'Học sinh nắm vững kiến thức, tư duy nhanh, bài làm rất tốt. Tiếp tục phát huy!'
              : submission.totalScore >= 5
              ? 'Học sinh có hiểu bài nhưng cần ôn tập kỹ hơn các dạng câu tự luận và lý thuyết cơ bản.'
              : 'Học sinh cần chú ý đọc kỹ đề bài và bổ sung thêm kiến thức ở các câu hỏi chưa đạt.'}
          </div>
        </div>

        <div className="text-center text-xs flex flex-col justify-between">
          <div>
            <p className="text-slate-500 italic text-[11px]">Ngày xuất phiếu: {submission.endTime || '04/09/2026'}</p>
            <p className="font-bold text-slate-800 uppercase mt-1">Giáo viên phụ trách</p>
          </div>
          <div className="h-12 sm:h-14 flex items-center justify-center">
            <span className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</span>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Hệ thống đánh giá năng lực trực tuyến</span>
        <span>Bản quyền: <strong>{config.copyrightText}</strong></span>
      </div>
    </div>
  );
};
