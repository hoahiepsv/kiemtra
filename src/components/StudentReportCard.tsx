import React from 'react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { VietnameseExamPaper, ExamPaperTheme } from './VietnameseExamPaper';

interface StudentReportCardProps {
  submission: SubmissionRecord;
  config: ExamConfig;
  questions: Question[];
  theme?: ExamPaperTheme;
  showCorrectAnswers?: boolean;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  submission,
  config,
  questions,
  theme = 'navy',
  showCorrectAnswers = false,
}) => {
  return (
    <div
      id={`student-report-card-${submission.stt || submission.timestamp || submission.studentName}`}
      className="w-[820px] bg-white text-slate-800 p-2 font-sans relative mx-auto"
    >
      <VietnameseExamPaper
        submission={submission}
        config={config}
        questions={questions}
        theme={theme}
        showCorrectAnswers={showCorrectAnswers}
      />
    </div>
  );
};
