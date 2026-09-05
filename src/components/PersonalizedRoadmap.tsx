import React, { useState } from 'react';
import { Compass, Sparkles, CheckCircle, ArrowRight, BookOpen, Clock, Lightbulb } from 'lucide-react';
import { RoadmapStep } from '../utils/analysisService';

interface PersonalizedRoadmapProps {
  steps: RoadmapStep[];
  studentName: string;
  totalScore: number;
}

export const PersonalizedRoadmap: React.FC<PersonalizedRoadmapProps> = ({
  steps,
  studentName,
  totalScore,
}) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCompletedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-600" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Lộ trình học tập cá nhân hóa dành cho {studentName}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kế hoạch ôn tập 3 giai đoạn được thiết kế tự động dựa trên kết quả làm bài ({totalScore}/10 điểm).
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Mục tiêu bứt phá điểm 10</span>
        </div>
      </div>

      {/* 3 Steps Timeline */}
      <div className="space-y-6 relative before:absolute before:top-4 before:bottom-4 before:left-4 sm:before:left-6 before:w-0.5 before:bg-sky-100">
        {steps.map((step, idx) => {
          return (
            <div key={step.stepNumber} className="relative flex items-start gap-4 sm:gap-6">
              {/* Step indicator circle */}
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 shadow-sm shadow-sky-400/30 z-10">
                {step.stepNumber}
              </div>

              {/* Step Card Content */}
              <div className="flex-1 bg-sky-50/40 rounded-xl p-4 sm:p-5 border border-sky-100 hover:border-sky-200 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      {step.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-white border border-sky-200 text-sky-700">
                      {step.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{step.duration}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  {step.description}
                </p>

                {/* Action items checklist */}
                <div className="space-y-2">
                  {step.items.map((item, itemIdx) => {
                    const itemId = `${step.stepNumber}-${itemIdx}`;
                    const isChecked = !!completedItems[itemId];
                    return (
                      <div
                        key={itemId}
                        onClick={() => toggleCheck(itemId)}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-200 text-slate-500 line-through'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-sm mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                        <span className="leading-relaxed font-medium">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational pedagogical note */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200/80 flex items-start gap-3 text-xs text-slate-700">
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sky-900 block mb-0.5">
            Lời khuyên từ Giáo viên (Lê Hoà Hiệp):
          </strong>
          <span>
            "Học tập là một quá trình liên tục. Mỗi câu trả lời chưa đúng hôm nay chính là cơ hội quý giá để em hiểu sâu hơn về bản chất vấn đề. Hãy kiên trì hoàn thành danh sách kiểm tra trên nhé!"
          </span>
        </div>
      </div>
    </div>
  );
};
