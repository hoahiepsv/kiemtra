import React from 'react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { VietnameseExamPaper, ExamPaperTheme } from './VietnameseExamPaper';

interface StudentReportCardProps {
  submission: SubmissionRecord;
  config: ExamConfig;
  questions: Question[];
  theme?: ExamPaperTheme;
  showCorrectAnswers?: boolean;
  isTeacherMode?: boolean;
  isExportingImage?: boolean;
  onToggleEssayCorrect?: (orderNumber: number, isCorrect: boolean) => void;
  onSaveRegradedScore?: () => void;
  hasUnsavedChanges?: boolean;
  isSaveSuccessful?: boolean;
  isSaving?: boolean;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  submission,
  config,
  questions,
  theme = 'navy',
  showCorrectAnswers = false,
  isTeacherMode = false,
  isExportingImage = false,
  onToggleEssayCorrect,
  onSaveRegradedScore,
  hasUnsavedChanges = false,
  isSaveSuccessful = false,
  isSaving = false,
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
        isTeacherMode={isTeacherMode}
        isExportingImage={isExportingImage}
        onToggleEssayCorrect={onToggleEssayCorrect}
        onSaveRegradedScore={onSaveRegradedScore}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaveSuccessful={isSaveSuccessful}
        isSaving={isSaving}
      />
    </div>
  );
};
