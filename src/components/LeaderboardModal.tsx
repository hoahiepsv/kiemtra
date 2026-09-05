import React, { useState } from 'react';
import { Trophy, Medal, Search, X, Flame } from 'lucide-react';
import { SubmissionRecord } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: SubmissionRecord[];
  currentStudentName?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  submissions,
  currentStudentName,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  // Extract unique classes
  const classes = Array.from(new Set(submissions.map((s) => s.className).filter(Boolean)));

  // Filter & Sort: Score descending, duration ascending
  const filtered = submissions
    .filter((s) => {
      if (selectedClass !== 'all' && s.className.toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }
      if (searchTerm && !s.studentName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.totalDuration.localeCompare(b.totalDuration);
    });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">
                Bảng Xếp Hạng Cá Nhân
              </h3>
              <p className="text-xs text-sky-100">
                Tuyên dương các học sinh có điểm số cao và thời gian hoàn thành xuất sắc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-sky-50/50 border-b border-sky-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên học sinh..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">Lọc theo lớp:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-sky-500 uppercase"
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Podium Top 3 Highlights */}
        {filtered.length >= 3 && selectedClass === 'all' && !searchTerm && (
          <div className="p-4 bg-gradient-to-b from-sky-50/70 to-white border-b border-slate-100 grid grid-cols-3 gap-2 sm:gap-4 text-center">
            {/* Rank 2 */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center">
              <span className="text-xl">🥈</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase">Hạng 2</span>
              <strong className="text-xs sm:text-sm text-slate-800 line-clamp-1 mt-0.5">{filtered[1].studentName}</strong>
              <span className="text-xs font-mono font-extrabold text-sky-600 mt-1">{filtered[1].totalScore} đ</span>
              <span className="text-[10px] text-slate-400">{filtered[1].totalDuration}</span>
            </div>

            {/* Rank 1 */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border-2 border-amber-300 shadow-xs flex flex-col items-center -translate-y-1">
              <span className="text-2xl">👑</span>
              <span className="text-[11px] font-extrabold text-amber-800 uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Quán quân
              </span>
              <strong className="text-xs sm:text-sm text-amber-950 line-clamp-1 mt-0.5">{filtered[0].studentName}</strong>
              <span className="text-sm font-mono font-black text-amber-700 mt-1">{filtered[0].totalScore} đ</span>
              <span className="text-[10px] text-amber-600">{filtered[0].totalDuration}</span>
            </div>

            {/* Rank 3 */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center">
              <span className="text-xl">🥉</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase">Hạng 3</span>
              <strong className="text-xs sm:text-sm text-slate-800 line-clamp-1 mt-0.5">{filtered[2].studentName}</strong>
              <span className="text-xs font-mono font-extrabold text-sky-600 mt-1">{filtered[2].totalScore} đ</span>
              <span className="text-[10px] text-slate-400">{filtered[2].totalDuration}</span>
            </div>
          </div>
        )}

        {/* List Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có dữ liệu bài thi nào khớp với bộ lọc.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item, index) => {
                const rank = index + 1;
                const isCurrent = currentStudentName && item.studentName.toLowerCase() === currentStudentName.toLowerCase();

                let medalBadge = null;
                if (rank === 1) medalBadge = <span className="text-base">🥇</span>;
                else if (rank === 2) medalBadge = <span className="text-base">🥈</span>;
                else if (rank === 3) medalBadge = <span className="text-base">🥉</span>;

                return (
                  <div
                    key={`${item.studentName}-${item.timestamp || index}`}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-sky-100/70 border-sky-300 ring-2 ring-sky-300'
                        : 'bg-white border-slate-200 hover:border-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                        {medalBadge || `#${rank}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs sm:text-sm text-slate-900">
                            {item.studentName}
                          </strong>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded-sm bg-sky-600 text-white text-[10px] font-bold">
                              Bạn
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Lớp: <strong className="text-slate-700 uppercase">{item.className}</strong> • Nộp: {item.endTime || 'Vừa xong'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm sm:text-base font-black font-mono text-sky-600">
                        {item.totalScore} <span className="text-xs font-normal text-slate-400">/10</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Thời gian: {item.totalDuration}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Tổng số thí sinh: <strong>{filtered.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
