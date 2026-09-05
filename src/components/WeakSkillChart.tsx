import React from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';
import { SkillStat } from '../types';

interface WeakSkillChartProps {
  skills: SkillStat[];
}

export const WeakSkillChart: React.FC<WeakSkillChartProps> = ({ skills }) => {
  const weakSkills = skills.filter((s) => s.status === 'weak');
  const averageSkills = skills.filter((s) => s.status === 'average');
  const goodSkills = skills.filter((s) => s.status === 'good');

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-600" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Biểu đồ phân tích kỹ năng yếu & Năng lực học tập
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá chi tiết mức độ thông thạo từng chủ đề và phát hiện lỗ hổng kiến thức cần bồi dưỡng.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium">Vững vàng (≥85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 font-medium">Trung bình</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600 font-medium">Cần bổ trợ (&lt;60%)</span>
          </div>
        </div>
      </div>

      {/* Weak skills alert banner if any */}
      {weakSkills.length > 0 ? (
        <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-900 block">
              Phát hiện {weakSkills.length} mảng kiến thức cần cải thiện:
            </strong>
            <p className="text-rose-700 mt-0.5">
              Học sinh cần chú ý ôn tập thêm ở các chủ đề:{' '}
              <strong className="text-rose-900">
                {weakSkills.map((w) => w.name).join(', ')}
              </strong>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Rất tốt!</strong> Em không có kỹ năng nào ở mức yếu. Các nội dung kiểm tra đều đạt tỷ lệ hoàn thành cao.
          </span>
        </div>
      )}

      {/* Visual Bar Performance Charts */}
      <div className="space-y-4">
        {skills.map((skill) => {
          let barColor = 'bg-emerald-500';
          let textColor = 'text-emerald-700';
          let badgeText = 'Thành thạo';

          if (skill.status === 'weak') {
            barColor = 'bg-rose-500';
            textColor = 'text-rose-700';
            badgeText = 'Kỹ năng yếu';
          } else if (skill.status === 'average') {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-700';
            badgeText = 'Cần rèn luyện';
          }

          return (
            <div key={skill.name} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-sky-200 transition-all">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{skill.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      skill.status === 'weak'
                        ? 'bg-rose-100 text-rose-800'
                        : skill.status === 'average'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {badgeText}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-700">
                  <span className={textColor}>{skill.earnedPoints}</span>
                  <span className="text-slate-400">/{skill.totalPoints} đ</span>
                  <span className="ml-1 text-slate-500 font-normal">({skill.percentage}%)</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.max(5, skill.percentage)}%` }}
                />
              </div>

              {/* Targeted Recommendation */}
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                <HelpCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span>{skill.recommendation}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
