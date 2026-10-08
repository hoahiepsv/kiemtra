import React, { useState, useMemo } from 'react';
import { History, X, Trash2, Calendar, Clock, Eye, RefreshCw, FileSpreadsheet, FileText, CheckCircle2, Search, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { SubmissionRecord, ExamConfig } from '../types';
import { matchSearchQuery } from '../utils/gradeService';
import { compareSubmissionsNewestFirst } from '../utils/syncService';
import { isIpBlockedCheck, extractCleanIp, formatBlockedIpString } from '../utils/ipViolationService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SubmissionRecord[];
  onSelectSubmission: (submission: SubmissionRecord) => void;
  onClearHistory?: () => void;
  onDeleteSubmission?: (submission: SubmissionRecord) => void;
  onRefreshFromSheet?: () => Promise<void>;
  onOpenViolations?: () => void;
  isSyncing?: boolean;
  config?: ExamConfig;
  onUpdateConfig?: (updatedConfig: Partial<ExamConfig>) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectSubmission,
  onClearHistory,
  onDeleteSubmission,
  onRefreshFromSheet,
  onOpenViolations,
  isSyncing = false,
  config,
  onUpdateConfig,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingRecord, setDeletingRecord] = useState<SubmissionRecord | null>(null);

  const blockedIpsList = config?.blockedIps || [];

  const handleToggleBlockIpFromHistory = (rawIp: string) => {
    if (!config || !onUpdateConfig) return;
    const clean = extractCleanIp(rawIp);
    if (!clean) return;

    const isCurrentlyBlocked = isIpBlockedCheck(clean, blockedIpsList, true);
    let nextBlocked: string[] = [];
    if (isCurrentlyBlocked) {
      nextBlocked = blockedIpsList.filter((b) => extractCleanIp(b) !== clean);
    } else {
      nextBlocked = [...blockedIpsList, formatBlockedIpString(clean)];
    }
    onUpdateConfig({
      ...config,
      blockedIps: nextBlocked,
    });
  };

  // Count duplicate IPs
  const duplicateIpCount = useMemo(() => {
    const map = new Map<string, number>();
    (history || []).forEach((r) => {
      const ip = (r.ipAddress || '').trim();
      if (ip && ip !== 'Chưa ghi nhận' && ip !== '-' && ip !== 'N/A') {
        map.set(ip, (map.get(ip) || 0) + 1);
      }
    });
    let count = 0;
    map.forEach((c) => {
      if (c > 1) count++;
    });
    return count;
  }, [history]);

  // Luôn sắp xếp MỚI NHẤT -> CŨ NHẤT
  const filteredHistory = useMemo(() => {
    let list = Array.isArray(history) ? [...history] : [];
    list.sort(compareSubmissionsNewestFirst);

    if (!searchTerm.trim()) return list;
    return list.filter(
      (record) =>
        matchSearchQuery(record.studentName, searchTerm) ||
        matchSearchQuery(record.className, searchTerm)
    );
  }, [history, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[96vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Thu gọn & Xoá chú thích */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 px-3 py-2 sm:px-6 sm:py-3.5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-extrabold text-xs sm:text-base tracking-tight truncate">
                Lịch Sử Nộp Bài Học Sinh
              </h3>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-white/20 text-white border border-white/25 px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                <ArrowUpDown className="w-2.5 h-2.5" />
                Mới nhất
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {onRefreshFromSheet && (
              <button
                onClick={onRefreshFromSheet}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Lấy dữ liệu mới nhất từ Cơ sở dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Đang tải...' : 'Lấy từ CSDL'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Quay lại Bảng Quản trị"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar info & Search */}
        <div className="bg-slate-50 px-2.5 py-1.5 sm:px-6 sm:py-2.5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-slate-600 gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] sm:text-xs">
            <span>Tổng số: <strong className="text-slate-900">{history.length}</strong> bài</span>
            {history.length > 0 && (
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                Đã đồng bộ
              </span>
            )}
            {duplicateIpCount > 0 && onOpenViolations && (
              <button
                onClick={onOpenViolations}
                className="text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border border-rose-300 flex items-center gap-1 cursor-pointer transition-colors animate-pulse"
                title="Bấm để xem danh sách IP làm bài trên 1 lần"
              >
                <ShieldAlert className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600" />
                <span>{duplicateIpCount} IP trùng</span>
              </button>
            )}
          </div>
          {history.length > 0 && (
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên HS, lớp..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg sm:rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Body list */}
        <div className="p-2 sm:p-6 overflow-y-auto flex-1 space-y-2 sm:space-y-3 bg-slate-100/50">
          {history.length === 0 ? (
            <div className="text-center py-10 sm:py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Chưa có bài nộp nào trong Cơ sở dữ liệu</h4>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Hệ thống tự động đồng bộ danh sách bài nộp từ Cơ sở dữ liệu sau khi giáo viên đăng nhập.
              </p>
              {onRefreshFromSheet && (
                <button
                  onClick={onRefreshFromSheet}
                  disabled={isSyncing}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang đồng bộ...' : 'Tải dữ liệu từ CSDL ngay'}</span>
                </button>
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">
                Không tìm thấy bài nộp nào khớp với từ khóa &ldquo;<strong>{searchTerm}</strong>&rdquo;
              </p>
            </div>
          ) : (
            filteredHistory.map((record, index) => (
              <div
                key={`${record.timestamp}-${record.studentName}-${index}`}
                className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-[10px] sm:text-xs flex items-center justify-center border border-slate-200 flex-shrink-0">
                      {record.stt || index + 1}
                    </span>
                    <strong className="text-xs sm:text-base text-slate-900 font-extrabold truncate">
                      {record.studentName}
                    </strong>
                    <span className="px-1.5 py-0.2 rounded text-[10px] sm:text-[11px] font-bold bg-sky-100 text-sky-800 uppercase flex-shrink-0">
                      Lớp {record.className}
                    </span>
                    {record.ipAddress && (() => {
                      const cleanIp = extractCleanIp(record.ipAddress);
                      const isBlocked = isIpBlockedCheck(cleanIp, blockedIpsList, true);
                      const displayIpString = isBlocked ? `${cleanIp} - Block` : cleanIp;

                      return (
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1.5 flex-shrink-0 border transition-all ${
                            isBlocked
                              ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                          title={isBlocked ? `IP ${displayIpString} đang bị Giáo viên chặn vào phòng thi` : `IP của thiết bị: ${cleanIp}`}
                        >
                          <span className="flex items-center gap-1">
                            {isBlocked && <span className="text-rose-600">⛔</span>}
                            <span>IP: <strong className={isBlocked ? 'text-rose-900 font-black' : 'text-slate-800'}>{displayIpString}</strong></span>
                          </span>

                          {onUpdateConfig && (
                            isBlocked ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBlockIpFromHistory(cleanIp);
                                }}
                                className="text-slate-600 hover:text-slate-900 hover:bg-rose-200/80 px-1 py-0.2 rounded text-[9px] ml-0.5 cursor-pointer font-sans transition-colors"
                                title="Bấm để GỠ CHẶN cho IP này"
                              >
                                (Gỡ chặn)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBlockIpFromHistory(cleanIp);
                                }}
                                className="text-rose-700 hover:text-white hover:bg-rose-600 px-1.5 py-0.2 rounded border border-rose-300 hover:border-rose-600 text-[9px] font-bold ml-0.5 transition-colors cursor-pointer bg-white"
                                title="Bấm để chặn thủ công IP này (Thêm hậu tố - Block)"
                              >
                                + Chặn (- Block)
                              </button>
                            )
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                      {record.totalDuration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                      {record.endTime || record.startTime}
                    </span>
                    {record.scoreString && (
                      <span className="hidden sm:inline-block text-slate-500 font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 max-w-[280px] truncate" title={record.scoreString}>
                        {record.scoreString}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100 flex-shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-base sm:text-2xl font-black font-serif text-red-600">
                      {String(record.totalScore).replace('.', ',')}
                      <span className="text-[10px] sm:text-xs text-slate-400 font-sans font-normal ml-0.5">/{record.maxScore || 10}đ</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectSubmission(record)}
                      className="flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] sm:text-xs transition-colors cursor-pointer border border-blue-200 shadow-2xs active:scale-95"
                      title="Mở xem bài kiểm tra"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem bài</span>
                    </button>

                    {onDeleteSubmission && (
                      <button
                        onClick={() => setDeletingRecord(record)}
                        className="p-1 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Xoá bản ghi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="truncate">Tổng số: {filteredHistory.length} bài nộp</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA HỌC SINH */}
      {deletingRecord && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-800">
                  Xác nhận xóa học sinh?
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Thầy/cô có chắc chắn muốn xóa bài thi của học sinh này không? Hành động này không thể hoàn tác.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-700">
                    Họ và tên: <span className="text-sky-700 font-extrabold">{deletingRecord.studentName}</span>
                  </div>
                  <div className="text-slate-600">
                    Lớp: <span className="font-semibold text-slate-800">{deletingRecord.className || 'Chưa rõ'}</span> &bull; Điểm số:{' '}
                    <span className="font-black text-rose-600">{String(deletingRecord.totalScore).replace('.', ',')} đ</span>
                  </div>
                  {deletingRecord.endTime && (
                    <div className="text-slate-400 text-[11px]">
                      Thời gian nộp: {deletingRecord.endTime}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSubmission && deletingRecord) {
                    onDeleteSubmission(deletingRecord);
                  }
                  setDeletingRecord(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
