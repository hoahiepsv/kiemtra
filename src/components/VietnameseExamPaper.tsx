import React from 'react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { formatExamDateTime, formatExamDuration, formatVietnameseFullDate } from '../utils/dateUtils';
import { parseScoreStringDetailed } from '../utils/scoreStringUtils';

export type ExamPaperTheme = 'navy' | 'vintage' | 'emerald' | 'burgundy';

interface VietnameseExamPaperProps {
  submission: SubmissionRecord;
  config: ExamConfig;
  questions: Question[];
  theme?: ExamPaperTheme;
  showCorrectAnswers?: boolean;
}

export function scoreToVietnameseWords(score: number): string {
  if (score === undefined || score === null || isNaN(score)) return 'Không điểm';
  const rounded = Math.round(score * 100) / 100;
  const digits = ['Không', 'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười'];

  const whole = Math.floor(rounded);
  const decimal = Math.round((rounded - whole) * 100);

  let wholeStr = '';
  if (whole >= 0 && whole <= 10) {
    wholeStr = digits[whole];
  } else {
    wholeStr = String(whole);
  }

  if (decimal === 0) {
    return `${wholeStr} điểm`;
  }

  if (decimal === 50 || decimal === 5) {
    return `${wholeStr} phẩy năm điểm`;
  }
  if (decimal === 25) {
    return `${wholeStr} phẩy hai lăm điểm`;
  }
  if (decimal === 75) {
    return `${wholeStr} phẩy bảy lăm điểm`;
  }

  return `${wholeStr} phẩy ${decimal} điểm`;
}

export const VietnameseExamPaper: React.FC<VietnameseExamPaperProps> = ({
  submission,
  config,
  questions,
  theme = 'navy',
  showCorrectAnswers = false,
}) => {
  // Reconstruct question results
  const questionResults = React.useMemo(() => {
    if (submission.questionResults && submission.questionResults.length > 0) {
      return submission.questionResults;
    }
    const { answerMap, scoreMap, items } = parseScoreStringDetailed(submission.scoreString || '');
    if (questions && questions.length > 0) {
      return questions.map((q, idx) => {
        const order = q.orderNumber || idx + 1;
        const rawAns = answerMap.has(order) ? answerMap.get(order)! : '';
        const hasScore = scoreMap.has(order);
        const earned = hasScore ? scoreMap.get(order)! : (submission.totalScore > 0 ? q.points : 0);
        const isCorrect = earned > 0;
        return {
          questionId: q.id,
          orderNumber: order,
          studentAnswer: rawAns,
          correctAnswer: q.correctAnswer,
          isCorrect,
          earnedPoints: earned,
          maxPoints: q.points,
          category: q.category || 'Kiến thức chung',
        };
      });
    }
    return items.map((it) => ({
      questionId: it.orderNumber,
      orderNumber: it.orderNumber,
      studentAnswer: it.studentAnswer,
      correctAnswer: '',
      isCorrect: it.isCorrect,
      earnedPoints: it.earnedPoints,
      maxPoints: it.earnedPoints > 0 ? it.earnedPoints : 1,
      category: 'Kiến thức chung',
    }));
  }, [submission, questions]);

  // Separate Multiple Choice and Essay questions
  const mcResults = React.useMemo(() => {
    return questionResults.filter((qr) => {
      const q = questions.find((item) => item.id === qr.questionId);
      return !q || q.type === 'Trắc nghiệm 1 đáp án';
    });
  }, [questionResults, questions]);

  const essayResults = React.useMemo(() => {
    return questionResults.filter((qr) => {
      const q = questions.find((item) => item.id === qr.questionId);
      return q && q.type === 'Tự luận';
    });
  }, [questionResults, questions]);

  const correctCount = questionResults.filter((q) => q.isCorrect).length;
  const totalQuestions = questionResults.length || questions.length || 1;

  // Teacher feedback based on score
  const teacherRemark = React.useMemo(() => {
    const ratio = submission.totalScore / (submission.maxScore || 10);
    if (ratio >= 0.9) {
      return 'Em làm bài rất xuất sắc! Nắm vững toàn bộ kiến thức trọng tâm, tư duy logic nhanh và chính xác. Thầy/Cô rất khen ngợi em!';
    }
    if (ratio >= 0.8) {
      return 'Bài làm rất tốt, hoàn thành đầy đủ các phần kiểm tra. Em hãy duy trì phong độ và rèn luyện thêm tính cẩn thận nhé!';
    }
    if (ratio >= 0.65) {
      return 'Em có ý thức làm bài tốt, nắm được kiến thức cơ bản. Cần chú ý đọc kỹ yêu cầu đề bài và rèn thêm phần tính toán / tự luận.';
    }
    if (ratio >= 0.5) {
      return 'Đã đạt yêu cầu bài kiểm tra. Em cần dành thêm thời gian ôn luyện lý thuyết và thực hành làm lại các câu bị sai.';
    }
    return 'Bài làm chưa đạt kết quả tốt. Em cần xem lại toàn bộ bài học, tích cực hỏi thầy/cô và làm bài bồi dưỡng để cải thiện điểm số.';
  }, [submission.totalScore, submission.maxScore]);

  // Subject name formatted for teacher seal: "Giáo viên bộ môn {Môn} đã chấm"
  const subjectDisplay = React.useMemo(() => {
    if (!config.subject || !config.subject.trim()) return 'TIN HỌC';
    return config.subject.replace(/^(MÔN|Môn)\s*[:：]?\s*/i, '').trim();
  }, [config.subject]);

  // Formatted completed date: "Ngày ... tháng ... năm ..." (thời gian lúc học sinh làm xong bài)
  const completedDateDisplay = React.useMemo(() => {
    return formatVietnameseFullDate(submission.endTime, submission.timestamp);
  }, [submission.endTime, submission.timestamp]);

  // Palette settings for polite/elegant school colors
  const themeStyles = {
    navy: {
      border: 'border-blue-900',
      doubleBorder: 'border-blue-950',
      headerBg: 'bg-blue-900',
      headerText: 'text-blue-900',
      subText: 'text-blue-800',
      bannerBg: 'bg-blue-50/70',
      line: 'border-blue-900/30',
      accentBg: 'bg-blue-900/5',
      accentText: 'text-blue-950',
      sealColor: 'border-rose-600 text-rose-600',
    },
    vintage: {
      border: 'border-amber-950',
      doubleBorder: 'border-amber-950',
      headerBg: 'bg-amber-900',
      headerText: 'text-amber-950',
      subText: 'text-amber-900',
      bannerBg: 'bg-amber-50/60',
      line: 'border-amber-900/30',
      accentBg: 'bg-amber-900/5',
      accentText: 'text-amber-950',
      sealColor: 'border-red-700 text-red-700',
    },
    emerald: {
      border: 'border-emerald-900',
      doubleBorder: 'border-emerald-950',
      headerBg: 'bg-emerald-900',
      headerText: 'text-emerald-950',
      subText: 'text-emerald-900',
      bannerBg: 'bg-emerald-50/60',
      line: 'border-emerald-900/30',
      accentBg: 'bg-emerald-900/5',
      accentText: 'text-emerald-950',
      sealColor: 'border-rose-600 text-rose-600',
    },
    burgundy: {
      border: 'border-rose-950',
      doubleBorder: 'border-rose-950',
      headerBg: 'bg-rose-900',
      headerText: 'text-rose-950',
      subText: 'text-rose-900',
      bannerBg: 'bg-rose-50/60',
      line: 'border-rose-900/30',
      accentBg: 'bg-rose-900/5',
      accentText: 'text-rose-950',
      sealColor: 'border-red-700 text-red-700',
    },
  }[theme];

  return (
    <div
      id="vietnamese-exam-paper"
      className={`w-full max-w-[820px] mx-auto bg-[#fefefe] text-slate-800 p-6 sm:p-9 font-serif border-4 border-double ${themeStyles.doubleBorder} shadow-lg relative print:shadow-none print:border-2 print:p-6 print:max-w-none print:w-full`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Delicate inner decorative border */}
      <div className={`border border-dashed ${themeStyles.line} p-4 sm:p-5`}>
        {/* HEADER SECTION: Vietnamese Standard Exam Paper Header */}
        <div className="grid grid-cols-12 gap-3 pb-4 border-b-2 border-slate-900 text-xs leading-relaxed">
          {/* Top Left: School & Student info */}
          <div className="col-span-7 space-y-1 pr-2">
            <p className="font-extrabold uppercase text-[13px] tracking-wide text-slate-900">
              {config.schoolName || 'TRƯỜNG THCS VÕ VĂN KIỆT'}
            </p>
            <div className="pt-1 space-y-1">
              <p className="text-slate-800">
                Họ và tên thí sinh:{' '}
                <strong className="text-slate-950 uppercase font-sans text-sm font-black underline decoration-slate-400 underline-offset-4">
                  {submission.studentName}
                </strong>
              </p>
              <div className="flex items-center gap-6">
                <p className="text-slate-800">
                  Lớp:{' '}
                  <strong className="text-slate-950 font-sans text-sm font-extrabold uppercase">
                    {submission.className}
                  </strong>
                </p>
                <p className="text-slate-800">
                  SBD :{' '}
                  <strong className="text-slate-950 font-mono text-xs sm:text-[13px] font-bold tracking-tight">
                    {submission.ipAddress || '113.169.89.135'}
                  </strong>
                </p>
              </div>
              <p className="text-slate-700 italic text-[11px] pt-0.5">
                {completedDateDisplay}
              </p>
            </div>
          </div>

          {/* Top Right: Exam Title, Subject, Duration */}
          <div className="col-span-5 text-right pl-2 border-l border-slate-300 space-y-0.5">
            <h2 className="font-extrabold uppercase text-[13px] tracking-wide text-slate-900">
              {config.examName || 'BÀI KIỂM TRA ĐỊNH KỲ'}
            </h2>
            <p className="font-bold text-slate-900 text-xs">
              MÔN: <span className="uppercase">{config.subject}</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Thời gian làm bài: <strong className="text-slate-800">{config.durationMinutes} phút</strong>
            </p>
            <p className="text-[10px] text-slate-500 italic">
              (Không kể thời gian phát đề)
            </p>
          </div>
        </div>

        {/* FAMOUS VIETNAMESE EXAM SCORE & TEACHER REMARK BOX */}
        <div className="my-4 border-2 border-slate-900 text-xs">
          <div className="grid grid-cols-12 divide-x-2 divide-slate-900">
            {/* LEFT BOX: SCORE (Bằng số & Bằng chữ) */}
            <div className="col-span-4 flex flex-col">
              <div className="py-1 bg-slate-100 text-center font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 text-xs">
                ĐIỂM
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-400 border-b border-slate-400 text-[11px] text-center bg-slate-50/60 font-semibold py-0.5">
                <div>Bằng số</div>
                <div>Bằng chữ</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-400 flex-1 min-h-[78px] items-center">
                {/* Score Number in authentic red pen ink */}
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <span className="font-serif font-black text-4xl sm:text-5xl text-red-600 tracking-tight leading-none drop-shadow-2xs">
                    {String(submission.totalScore).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans mt-0.5 font-bold">
                    /{submission.maxScore || 10} đ
                  </span>
                </div>
                {/* Score in words */}
                <div className="p-2 flex items-center justify-center text-center">
                  <span className="font-bold text-red-700 italic text-xs leading-snug">
                    {scoreToVietnameseWords(submission.totalScore)}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT BOX: LỜI PHÊ CỦA THẦY CÔ GIÁO */}
            <div className="col-span-8 flex flex-col justify-between">
              <div className="py-1 bg-slate-100 text-center font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 text-xs">
                LỜI PHÊ CỦA THẦY CÔ GIÁO
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                <p className="font-serif italic text-slate-800 text-[12px] leading-relaxed text-justify px-1">
                  &ldquo;{teacherRemark}&rdquo;
                </p>
                {/* Dotted lines typical of Vietnamese test paper */}
                <div className="space-y-1 text-slate-300 select-none text-[11px] overflow-hidden whitespace-nowrap">
                  <div>....................................................................................................................................................</div>
                  <div>....................................................................................................................................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER TITLE: BÀI LÀM */}
        <div className="text-center my-3">
          <span className="inline-block px-6 py-0.5 font-black uppercase tracking-widest text-slate-900 text-sm border-b-2 border-slate-900">
            BÀI LÀM
          </span>
          <div className="text-[11px] text-slate-500 mt-1 font-sans">
            (Đúng {correctCount}/{totalQuestions} câu • Tỷ lệ hoàn thành:{' '}
            <strong className="text-slate-800">{Math.round((submission.totalScore / (submission.maxScore || 10)) * 100)}%</strong>)
          </div>
        </div>

        {/* SECTION I: TRẮC NGHIỆM */}
        {mcResults.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                I. PHẦN TRẮC NGHIỆM ({mcResults.length} câu)
              </h3>
              <span className="text-[11px] text-slate-600 italic">
                (Phiếu trả lời trắc nghiệm của học sinh)
              </span>
            </div>

            {/* Standard Vietnamese Multiple Choice Answer Matrix (Bảng trả lời trắc nghiệm ô tròn) */}
            <div className="border border-slate-800 rounded-sm overflow-x-auto mb-3 bg-white">
              <table className="w-full text-center border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                    <td className="p-1 px-2 border-r border-slate-400 text-[11px] font-serif font-extrabold bg-slate-200 whitespace-nowrap min-w-[70px]">
                      Câu
                    </td>
                    {mcResults.map((r, idx) => (
                      <td key={r.questionId || idx} className="p-1 border-r border-slate-300 font-bold min-w-[36px] text-[11px]">
                        {r.orderNumber || idx + 1}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {/* Selected Answer Row */}
                  <tr className="bg-white">
                    <td className="p-1 px-2 border-r border-slate-400 text-[10px] font-serif font-bold text-slate-700 bg-slate-50 whitespace-nowrap">
                      HS chọn
                    </td>
                    {mcResults.map((r, idx) => {
                      const isBlank = !r.studentAnswer || r.studentAnswer.trim() === '' || r.studentAnswer === '-';
                      return (
                        <td
                          key={r.questionId || idx}
                          className={`p-1 border-r border-slate-300 font-mono font-black text-xs ${
                            isBlank
                              ? 'text-slate-300 font-normal'
                              : r.isCorrect
                              ? 'text-blue-900 bg-blue-50/50'
                              : 'text-red-600 bg-red-50/40'
                          }`}
                        >
                          {isBlank ? '-' : r.studentAnswer}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Evaluation Row (Kết quả: Đúng / Sai) */}
                  <tr className="bg-slate-50/70 text-[10px] font-bold">
                    <td className="p-0.5 px-2 border-r border-slate-400 text-[10px] font-serif font-bold text-slate-700 bg-slate-100 whitespace-nowrap">
                      Kết quả
                    </td>
                    {mcResults.map((r, idx) => (
                      <td
                        key={r.questionId || idx}
                        className={`p-0.5 border-r border-slate-300 font-extrabold text-[10px] ${
                          r.isCorrect ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {r.isCorrect ? 'Đúng' : 'Sai'}
                      </td>
                    ))}
                  </tr>
                  {/* Correct Answer Row - CHỈ HIỂN THỊ KHI GIÁO VIÊN BẬT */}
                  {showCorrectAnswers && (
                    <tr className="bg-emerald-50 text-[10px] font-mono font-bold text-emerald-900">
                      <td className="p-0.5 px-2 border-r border-slate-400 text-[10px] font-serif font-bold text-emerald-900 bg-emerald-100">
                        Đ/A chuẩn
                      </td>
                      {mcResults.map((r, idx) => {
                        const qObj = questions.find((q) => q.id === r.questionId);
                        return (
                          <td key={r.questionId || idx} className="p-0.5 border-r border-slate-300 font-black text-emerald-800">
                            {r.correctAnswer || qObj?.correctAnswer || '-'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {/* Score per question */}
                  <tr className="text-[10px] font-mono text-slate-600">
                    <td className="p-0.5 px-2 border-r border-slate-400 text-[10px] font-serif text-slate-600 bg-slate-50">
                      Điểm
                    </td>
                    {mcResults.map((r, idx) => (
                      <td key={r.questionId || idx} className="p-0.5 border-r border-slate-300 font-semibold">
                        {String(r.earnedPoints).replace('.', ',')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION II: TỰ LUẬN (If any essay questions exist) */}
        {essayResults.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                II. PHẦN TỰ LUẬN ({essayResults.length} câu)
              </h3>
              <span className="text-[11px] text-slate-600 italic">
                (Nội dung bài làm do học sinh điền/trình bày)
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {essayResults.map((r, idx) => {
                const qObj = questions.find((q) => q.id === r.questionId);
                const isBlank = !r.studentAnswer || r.studentAnswer.trim() === '' || r.studentAnswer === '-';
                return (
                  <div
                    key={r.questionId || idx}
                    className="p-3 bg-white rounded-sm border border-slate-300 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">
                        Câu {r.orderNumber || idx + 1}:{' '}
                        <span className="font-normal text-slate-800">
                          {qObj?.content || `Câu hỏi tự luận`}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`font-sans font-extrabold text-[10px] px-2 py-0.5 rounded border ${
                            r.isCorrect
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}
                        >
                          {r.isCorrect ? 'Đúng' : 'Sai'}
                        </span>
                        <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {String(r.earnedPoints).replace('.', ',')} / {String(r.maxPoints).replace('.', ',')} đ
                        </span>
                      </div>
                    </div>

                    <div
                      className={`pl-3 border-l-2 p-2 rounded-xs ${
                        r.isCorrect
                          ? 'border-emerald-600 bg-emerald-50/25'
                          : 'border-red-500 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          Bài làm của học sinh:
                        </span>
                        <span
                          className={`text-[10px] font-extrabold ${
                            r.isCorrect ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          Kết quả: {r.isCorrect ? 'Đúng' : 'Sai'}
                        </span>
                      </div>
                      {isBlank ? (
                        <p className="italic text-slate-400 text-xs">(Học sinh không điền câu trả lời)</p>
                      ) : (
                        <p className="font-medium text-slate-900 font-sans whitespace-pre-wrap leading-relaxed">
                          {r.studentAnswer}
                        </p>
                      )}
                    </div>

                    {/* Essay answer key - CHỈ HIỂN THỊ KHI GIÁO VIÊN BẬT */}
                    {showCorrectAnswers && (r.correctAnswer || qObj?.correctAnswer) && (
                      <div className="pl-3 border-l-2 border-emerald-600 bg-emerald-50/60 p-2 rounded-xs text-xs">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">
                          Đáp án chuẩn / Gợi ý của đề thi:
                        </span>
                        <p className="font-semibold text-emerald-950 font-sans">
                          {r.correctAnswer || qObj?.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* METADATA SUMMARY BAR: Polite Exam timestamps */}
        <div className="pt-2 pb-3 border-t border-slate-300 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-sans gap-2">
          <div>
            Bắt đầu làm bài: <strong className="text-slate-800 font-mono">{formatExamDateTime(submission.startTime) || '17:02'}</strong>
            {' • '}
            Nộp bài: <strong className="text-slate-800 font-mono">{formatExamDateTime(submission.endTime) || '17:04'}</strong>
          </div>
          <div>
            Thời lượng: <strong className="text-slate-800 font-mono">{formatExamDuration(submission.totalDuration, submission.startTime, submission.endTime)}</strong>
            {submission.ipAddress && (
              <>
                {' • '}
                IP: <strong className="text-slate-800 font-mono text-[10px]">{submission.ipAddress}</strong>
              </>
            )}
          </div>
        </div>

        {/* FOOTER SIGNATURES: Authentic Vietnamese Exam Paper Signature Section */}
        <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-4 text-xs font-serif mt-2">
          {/* Parent Signature */}
          <div className="text-center flex flex-col justify-between min-h-[90px]">
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wide">
                Ý KIẾN CỦA PHỤ HUYNH HỌC SINH
              </p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">
                (Ký và ghi rõ họ tên)
              </p>
            </div>
            <div className="h-10 flex items-end justify-center">
              <span className="text-slate-300 text-[10px] select-none">....................................................</span>
            </div>
          </div>

          {/* Teacher Signature with Official Red Stamp */}
          <div className="text-center flex flex-col justify-between min-h-[90px] relative">
            <div>
              <p className="text-[11px] text-slate-600 italic">
                {completedDateDisplay}
              </p>
              <p className="font-bold text-slate-900 uppercase tracking-wide mt-0.5">
                GIÁO VIÊN CHẤM BÀI
              </p>
              <p className="text-[10px] text-slate-500 italic">
                (Ký và ghi rõ họ tên)
              </p>
            </div>

            {/* Authentic Red Stamp Badge: "Giáo viên bộ môn {Môn} đã chấm" */}
            <div
              className="absolute right-0 sm:right-4 bottom-1 opacity-90 rotate-[-6deg] pointer-events-none select-none max-w-[210px]"
              title={`Giáo viên bộ môn ${subjectDisplay} đã chấm`}
            >
              <div className="border-2 border-red-600 text-red-600 rounded-md px-2.5 py-1 text-center shadow-2xs bg-white/85">
                <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-tight text-red-700">
                  GIÁO VIÊN BỘ MÔN {subjectDisplay.toUpperCase()}
                </div>
                <div className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-red-700 mt-0.5">
                  ★ ĐÃ CHẤM ★
                </div>
              </div>
            </div>

            <div className="h-10 flex items-end justify-center">
              <span className="text-slate-300 text-[10px] select-none">....................................................</span>
            </div>
          </div>
        </div>

        {/* COPYRIGHT & SYSTEM NOTICE */}
        <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-sans">
          <span>Hệ thống Kiểm Tra Đánh Giá Năng Lực Trực Tuyến • Tác giả phần mềm: </span>
          <strong className="text-slate-600">{config.copyrightText || 'Lê Hoà Hiệp - 0983.676.470'}</strong>
        </div>
      </div>
    </div>
  );
};
