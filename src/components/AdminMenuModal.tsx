import React, { useMemo } from 'react';
import { X, FileCode2, FileSpreadsheet, ArrowRight, ShieldCheck, FolderArchive, FileEdit, Lock, History, ShieldAlert } from 'lucide-react';
import { AdminAuthSession, SubmissionRecord } from '../types';
import { detectIpViolations } from '../utils/ipViolationService';

interface AdminMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: AdminAuthSession | null;
  history?: SubmissionRecord[];
  onSelectAppsScript: () => void;
  onSelectExportImage: () => void;
  onSelectExportExcel: () => void;
  onSelectExamEditor: () => void;
  onSelectHistory: () => void;
  onSelectViolationWarning?: () => void;
}

export const AdminMenuModal: React.FC<AdminMenuModalProps> = ({
  isOpen,
  onClose,
  session,
  history = [],
  onSelectAppsScript,
  onSelectExportImage,
  onSelectExportExcel,
  onSelectExamEditor,
  onSelectHistory,
  onSelectViolationWarning,
}) => {
  if (!isOpen) return null;

  const canManageAppsScript = session ? session.permissions.canManageAppsScript : true;

  // Calculate duplicate IP stats using robust algorithm
  const violatingGroups = useMemo(() => detectIpViolations(history || []), [history]);
  const violatingIpStats = useMemo(() => {
    return {
      count: violatingGroups.length,
      totalSubmissions: violatingGroups.reduce((acc, g) => acc + g.submissionCount, 0),
    };
  }, [violatingGroups]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl sm:max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {session?.role === 'subadmin' ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/30 backdrop-blur-md text-emerald-100 text-[10px] sm:text-xs font-semibold border border-emerald-300/40">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-200" />
                <span>Đã xác thực: {session.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-[10px] sm:text-xs font-semibold border border-white/20">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                <span>Quyền Cấp cao: Lê Hoà Hiệp</span>
              </div>
            )}
          </div>

          <h3 className="text-base sm:text-xl font-bold tracking-tight">Bảng Điều Khiển Quản Trị</h3>
        </div>

        {/* Options Selection List - Compact & No Subtitles */}
        <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-2.5 max-h-[82vh] overflow-y-auto">
          {/* Option 1: Tạo & Chỉnh sửa đề thi */}
          <button
            onClick={onSelectExamEditor}
            className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-indigo-100 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                1. Tạo & Chỉnh sửa đề thi
              </h4>
            </div>
            <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </button>

          {/* Option 2: Tải phiếu bài làm học sinh (*.png *.zip) */}
          <button
            onClick={onSelectExportImage}
            className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FolderArchive className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                2. Tải phiếu bài làm học sinh (*.png *.zip)
              </h4>
            </div>
            <span className="text-emerald-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </button>

          {/* Option 3: Xuất kết quả theo lớp (*.xlsx *.png) */}
          <button
            onClick={onSelectExportExcel}
            className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-teal-100 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                3. Xuất kết quả theo lớp (*.xlsx *.png)
              </h4>
            </div>
            <span className="text-teal-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </button>

          {/* Option 4: Lịch sử nộp bài */}
          <button
            onClick={onSelectHistory}
            className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-sky-100 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50/80 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <History className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors truncate">
                4. Lịch sử nộp bài
              </h4>
            </div>
            <span className="text-sky-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </button>

          {/* Option 5: Cảnh báo vi phạm (Trùng lặp IP) */}
          <button
            onClick={() => onSelectViolationWarning?.()}
            className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-rose-200 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50/90 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-rose-700 transition-colors truncate">
                  5. Cảnh báo vi phạm
                </h4>
                {violatingIpStats.count > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-600 text-white shadow-xs animate-pulse">
                    {violatingIpStats.count} IP trùng
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                    An toàn
                  </span>
                )}
              </div>
            </div>
            <span className="text-rose-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </button>

          {/* Option 6: Bộ mã Google Apps Script & CSDL */}
          {canManageAppsScript ? (
            <button
              onClick={onSelectAppsScript}
              className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-slate-200 hover:border-sky-500 bg-slate-50/60 hover:bg-sky-50/60 transition-all group flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-sm"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FileCode2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h4 className="text-xs sm:text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors truncate">
                  6. Bộ mã Google Apps Script & Cấu hình CSDL
                </h4>
              </div>
              <span className="text-sky-600 group-hover:translate-x-1 transition-transform flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
            </button>
          ) : (
            <div className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2.5 sm:gap-3 opacity-75 select-none cursor-not-allowed">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-300 text-slate-600 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <h4 className="text-xs sm:text-base font-bold text-slate-500 truncate">
                    6. Bộ mã Google Apps Script & Cấu hình CSDL
                  </h4>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Chỉ Cấp cao
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 sm:px-5 sm:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
          <span className="truncate">Tác giả: <strong>Lê Hoà Hiệp - 0983.676.470</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer flex-shrink-0 ml-2"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
