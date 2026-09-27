import React, { useState, useMemo } from 'react';
import { History, X, Trash2, Calendar, Clock, Eye, RefreshCw, FileSpreadsheet, FileText, CheckCircle2, Search } from 'lucide-react';
import { SubmissionRecord } from '../types';
import { matchSearchQuery } from '../utils/gradeService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SubmissionRecord[];
  onSelectSubmission: (submission: SubmissionRecord) => void;
  onClearHistory?: () => void;
  onDeleteSubmission?: (submission: SubmissionRecord) => void;
  onRefreshFromSheet?: () => Promise<void>;
  isSyncing?: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectSubmission,
  onClearHistory,
  onDeleteSubmission,
  onRefreshFromSheet,
  isSyncing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    return history.filter(
      (record) =>
        matchSearchQuery(record.studentName, searchTerm) ||
        matchSearchQuery(record.className, searchTerm)
    );
  }, [history, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 px-6 py-4 sm:py-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Lịch Sử Nộp Bài Học Sinh
                </h3>
                <span className="text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FileSpreadsheet className="w-2.5 h-2.5" />
                  Cơ sở dữ liệu
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5">
                Dữ liệu được tự động lấy từ Cơ sở dữ liệu sau khi giáo viên đăng nhập
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefreshFromSheet && (
              <button
                onClick={onRefreshFromSheet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Lấy dữ liệu mới nhất từ Cơ sở dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Đang tải...' : 'Lấy từ Cơ sở dữ liệu'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar info & Search */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>Tổng số bài nộp: <strong className="text-slate-900">{history.length}</strong> bài</span>
            {history.length > 0 && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã đồng bộ từ Cơ sở dữ liệu
              </span>
            )}
          </div>
          {history.length > 0 && (
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên học sinh, lớp..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Body list */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-100/50">
          {history.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Chưa có bài nộp nào trong Cơ sở dữ liệu</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Hệ thống tự động đồng bộ danh sách bài nộp từ Cơ sở dữ liệu sau khi giáo viên đăng nhập.
              </p>
              {onRefreshFromSheet && (
                <button
                  onClick={onRefreshFromSheet}
                  disabled={isSyncing}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang đồng bộ...' : 'Tải dữ liệu từ Cơ sở dữ liệu ngay'}</span>
                </button>
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">
                Không tìm thấy bài nộp nào khớp với từ khóa &ldquo;<strong>{searchTerm}</strong>&rdquo;
              </p>
            </div>
          ) : (
            filteredHistory.map((record, index) => (
              <div
                key={`${record.timestamp}-${record.studentName}-${index}`}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center border border-slate-200">
                      {record.stt || index + 1}
                    </span>
                    <strong className="text-sm sm:text-base text-slate-900 font-extrabold">
                      {record.studentName}
                    </strong>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 uppercase">
                      Lớp {record.className}
                    </span>
                    {record.ipAddress && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                        IP: {record.ipAddress}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {record.totalDuration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {record.endTime || record.startTime}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 max-w-[280px] truncate" title={record.scoreString}>
                      {record.scoreString}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black font-serif text-red-600">
                      {String(record.totalScore).replace('.', ',')}
                      <span className="text-xs text-slate-400 font-sans font-normal ml-0.5">/{record.maxScore || 10}đ</span>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectSubmission(record);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer border border-blue-200 shadow-2xs active:scale-95"
                    title="Mở xem bài kiểm tra chuẩn mẫu học sinh Việt Nam"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem phiếu bài thi</span>
                  </button>

                  {onDeleteSubmission && (
                    <button
                      onClick={() => onDeleteSubmission(record)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                      title="Xóa bài nộp này khỏi danh sách"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
