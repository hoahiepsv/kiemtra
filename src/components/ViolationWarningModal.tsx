import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  RefreshCw,
  Search,
  Monitor,
  Users,
  UserCheck,
  FileSpreadsheet,
  Eye,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubmissionRecord } from '../types';
import { detectIpViolations, IpViolationGroup } from '../utils/ipViolationService';

interface ViolationWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SubmissionRecord[];
  onSelectSubmission?: (submission: SubmissionRecord) => void;
  onRefreshFromSheet?: () => Promise<void>;
  isSyncing?: boolean;
}

export const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectSubmission,
  onRefreshFromSheet,
  isSyncing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'same_student' | 'shared_ip'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Tự động đồng bộ từ datasheet 2 khi mở modal nếu chưa có đủ dữ liệu
  useEffect(() => {
    if (isOpen && onRefreshFromSheet && (!history || history.length < 5)) {
      onRefreshFromSheet().catch(() => {});
    }
  }, [isOpen]);

  // Áp dụng thuật toán phát hiện IP trùng lặp O(N)
  const violationGroups = useMemo<IpViolationGroup[]>(() => {
    return detectIpViolations(history || []);
  }, [history]);

  // Filter groups based on search & tab filter
  const filteredGroups = useMemo(() => {
    return violationGroups.filter((group) => {
      // Type filter
      if (filterType === 'same_student' && !group.isSameStudentMultipleTimes) return false;
      if (filterType === 'shared_ip' && !group.isMultipleStudentsSharedIp) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();

      if (group.ipAddress.toLowerCase().includes(term)) return true;
      if (group.studentNames.some((n) => n.toLowerCase().includes(term))) return true;
      if (group.classNames.some((c) => c.toLowerCase().includes(term))) return true;

      return false;
    });
  }, [violationGroups, filterType, searchTerm]);

  // Total metrics
  const totalViolatingIps = violationGroups.length;
  const totalViolatingSubmissions = useMemo(
    () => violationGroups.reduce((acc, g) => acc + g.submissionCount, 0),
    [violationGroups]
  );
  const sameStudentGroupsCount = useMemo(
    () => violationGroups.filter((g) => g.isSameStudentMultipleTimes).length,
    [violationGroups]
  );
  const sharedIpGroupsCount = useMemo(
    () => violationGroups.filter((g) => g.isMultipleStudentsSharedIp).length,
    [violationGroups]
  );

  // Copy IP or summary
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Export violations to Excel
  const handleExportExcel = () => {
    if (violationGroups.length === 0) return;

    const rows: Array<Record<string, string | number>> = [];
    let stt = 1;

    violationGroups.forEach((g) => {
      g.submissions.forEach((sub, subIdx) => {
        rows.push({
          'STT': stt++,
          'Địa chỉ IP': g.ipAddress,
          'Lần nộp từ IP': `Lần ${subIdx + 1} / ${g.submissionCount}`,
          'Họ và tên học sinh': sub.studentName,
          'Lớp': sub.className,
          'Số điểm': Number(sub.totalScore) || 0,
          'Điểm tối đa': sub.maxScore || 10,
          'Thời gian nộp bài': sub.endTime || sub.startTime || '',
          'Thời gian làm bài': sub.totalDuration || '',
          'Phân loại vi phạm': g.isSameStudentMultipleTimes
            ? 'Cùng 1 HS làm lại nhiều lần'
            : 'Nhiều HS dùng chung 1 máy tính / IP',
          'Ghi chú': g.studentNames.join(', '),
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Canh_Bao_Trung_Lap_IP');

    // Auto fit column widths
    const maxCols = [
      { wch: 6 },
      { wch: 18 },
      { wch: 16 },
      { wch: 25 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 16 },
      { wch: 30 },
      { wch: 30 },
    ];
    worksheet['!cols'] = maxCols;

    const fileName = `Canh_Bao_Vi_Pham_IP_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Thu gọn trên mobile */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 px-3 py-2 sm:px-6 sm:py-3 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-extrabold text-xs sm:text-base tracking-tight truncate">
                Cảnh Báo Vi Phạm (Trùng Lặp IP)
              </h3>
              <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-bold uppercase bg-white/20 text-white px-1.5 py-0.5 rounded-full border border-white/25 flex-shrink-0">
                Kiểm duyệt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {onRefreshFromSheet && (
              <button
                onClick={onRefreshFromSheet}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Cập nhật bài nộp mới nhất từ Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Đang tải...' : 'Lấy CSDL'}</span>
              </button>
            )}

            {violationGroups.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Xuất Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg sm:rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Quay lại Bảng Quản trị"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Metric Overview Strip - Tinh gọn dạng 4 ô nhỏ trên mobile */}
        <div className="bg-rose-50/70 border-b border-rose-100 p-1.5 sm:p-3 flex-shrink-0">
          <div className="grid grid-cols-4 gap-1 sm:gap-2.5">
            {/* 1. IP vi phạm */}
            <div className="bg-white p-1 sm:p-2.5 rounded-lg sm:rounded-xl border border-rose-200/80 shadow-2xs text-center sm:text-left sm:flex sm:items-center sm:gap-2.5">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-rose-100 text-rose-700 items-center justify-center flex-shrink-0 font-bold">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate leading-tight">IP trùng</p>
                <p className="text-xs sm:text-lg font-black text-rose-700 leading-tight">
                  {totalViolatingIps} <span className="text-[9px] sm:text-xs font-normal text-slate-500 hidden sm:inline">địa chỉ</span>
                </p>
              </div>
            </div>

            {/* 2. Lượt nộp */}
            <div className="bg-white p-1 sm:p-2.5 rounded-lg sm:rounded-xl border border-rose-200/80 shadow-2xs text-center sm:text-left sm:flex sm:items-center sm:gap-2.5">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-amber-100 text-amber-700 items-center justify-center flex-shrink-0 font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate leading-tight">Lượt nộp</p>
                <p className="text-xs sm:text-lg font-black text-amber-700 leading-tight">
                  {totalViolatingSubmissions} <span className="text-[9px] sm:text-xs font-normal text-slate-500 hidden sm:inline">bài</span>
                </p>
              </div>
            </div>

            {/* 3. 1 HS làm lại */}
            <div className="bg-white p-1 sm:p-2.5 rounded-lg sm:rounded-xl border border-rose-200/80 shadow-2xs text-center sm:text-left sm:flex sm:items-center sm:gap-2.5">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-sky-100 text-sky-700 items-center justify-center flex-shrink-0 font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate leading-tight">1 HS làm lại</p>
                <p className="text-xs sm:text-lg font-black text-sky-700 leading-tight">
                  {sameStudentGroupsCount} <span className="text-[9px] sm:text-xs font-normal text-slate-500 hidden sm:inline">vụ</span>
                </p>
              </div>
            </div>

            {/* 4. Chung máy */}
            <div className="bg-white p-1 sm:p-2.5 rounded-lg sm:rounded-xl border border-rose-200/80 shadow-2xs text-center sm:text-left sm:flex sm:items-center sm:gap-2.5">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-purple-100 text-purple-700 items-center justify-center flex-shrink-0 font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate leading-tight">Chung máy</p>
                <p className="text-xs sm:text-lg font-black text-purple-700 leading-tight">
                  {sharedIpGroupsCount} <span className="text-[9px] sm:text-xs font-normal text-slate-500 hidden sm:inline">vụ</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar - Gọn gàng trên mobile */}
        <div className="bg-white px-2.5 py-1.5 sm:px-6 sm:py-2.5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Tab Filters */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({violationGroups.length})
            </button>
            <button
              onClick={() => setFilterType('same_student')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'same_student'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1 HS ({sameStudentGroupsCount})
            </button>
            <button
              onClick={() => setFilterType('shared_ip')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'shared_ip'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chung IP ({sharedIpGroupsCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo IP, tên HS, lớp..."
              className="w-full pl-8 pr-6 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Violations List Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 space-y-2.5 sm:space-y-4 bg-slate-50/50">
          {isSyncing && (!history || history.length === 0) ? (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-rose-200">
              <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Đang đồng bộ dữ liệu bài nộp từ Google Sheets...</h4>
              <p className="text-xs text-slate-500 mt-1">Hệ thống đang quét các địa chỉ IP từ Cột I của datasheet 2.</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              {(!history || history.length === 0) ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Chưa tải được dữ liệu bài nộp
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Thiết bị chưa nhận được danh sách bài nộp từ Google Sheets.
                  </p>
                  {onRefreshFromSheet && (
                    <button
                      onClick={onRefreshFromSheet}
                      disabled={isSyncing}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Đang tải...' : 'Tải dữ liệu từ Google Sheets ngay'}</span>
                    </button>
                  )}
                </>
              ) : violationGroups.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Không phát hiện vi phạm trùng lặp IP nào
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Tất cả các bài thi đã nộp đều xuất phát từ các thiết bị / IP độc lập.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <Filter className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Không tìm thấy IP vi phạm phù hợp
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Vui lòng đổi từ khóa tìm kiếm hoặc chọn tab khác.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredGroups.map((group, groupIdx) => {
              const isSameStudent = group.isSameStudentMultipleTimes;
              const hasScoreImprovement = group.maxScore > group.minScore;

              return (
                <div
                  key={group.ipAddress}
                  className="bg-white rounded-xl sm:rounded-2xl border border-rose-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                >
                  {/* IP Group Header */}
                  <div className="bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-white px-3 py-2 sm:px-5 sm:py-3 border-b border-rose-100 flex flex-wrap items-center justify-between gap-1.5 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-rose-600 text-white flex items-center justify-center text-[11px] sm:text-xs font-bold shadow-xs flex-shrink-0">
                        #{groupIdx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-base font-extrabold text-slate-900 font-mono tracking-tight flex items-center gap-1">
                            <Monitor className="w-3.5 h-3.5 text-rose-600" />
                            {group.ipAddress}
                          </span>

                          <button
                            onClick={() => handleCopyIp(group.ipAddress)}
                            className="p-1 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Sao chép địa chỉ IP"
                          >
                            {copiedIp === group.ipAddress ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-600 mt-0.5">
                          <span>
                            Lớp: <strong className="text-slate-800">{group.classNames.join(', ') || 'Chưa rõ'}</strong>
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[180px] sm:max-w-none">
                            HS: <strong className="text-slate-800">{group.studentNames.join('; ')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      {isSameStudent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          1 HS làm lại ({group.submissionCount} lần)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Chung máy ({group.uniqueStudentsCount} HS)
                        </span>
                      )}

                      {hasScoreImprovement && isSameStudent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-700" />
                          {group.minScore} ➔ {group.maxScore}đ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1. Mobile Card View: Hiển thị gọn gàng trên điện thoại */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {group.submissions.map((sub, sIdx) => {
                      const score = Number(sub.totalScore) || 0;
                      const scoreColor =
                        score >= 8
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : score >= 5
                          ? 'text-sky-700 bg-sky-50 border-sky-200'
                          : 'text-rose-700 bg-rose-50 border-rose-200';

                      return (
                        <div key={`${sub.studentName}-${sub.className}-${sIdx}`} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 truncate">{sub.studentName}</span>
                                <span className="text-[10px] font-semibold text-slate-600 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                                  {sub.className}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{sub.endTime || sub.startTime || 'Chưa ghi nhận'}</span>
                                {sub.totalDuration && <span>• {sub.totalDuration}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded-full font-black text-xs border ${scoreColor}`}>
                              {score}đ
                            </span>
                            {onSelectSubmission && (
                              <button
                                onClick={() => onSelectSubmission(sub)}
                                className="p-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
                                title="Xem bài"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. Desktop Table View: Hiển thị đầy đủ bảng cột trên máy tính */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold">
                          <th className="py-2.5 px-4 w-12 text-center">Lần</th>
                          <th className="py-2.5 px-4">Họ và tên học sinh</th>
                          <th className="py-2.5 px-4 w-20 text-center">Lớp</th>
                          <th className="py-2.5 px-4 w-28 text-center">Số điểm</th>
                          <th className="py-2.5 px-4">Thời gian nộp bài</th>
                          <th className="py-2.5 px-4 w-24 text-center">Thời lượng</th>
                          <th className="py-2.5 px-4 w-28 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.submissions.map((sub, sIdx) => {
                          const score = Number(sub.totalScore) || 0;
                          const scoreColor =
                            score >= 8
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : score >= 5
                              ? 'text-sky-700 bg-sky-50 border-sky-200'
                              : 'text-rose-700 bg-rose-50 border-rose-200';

                          return (
                            <tr
                              key={`${sub.studentName}-${sub.className}-${sub.endTime || sIdx}`}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-2.5 px-4 text-center font-bold text-slate-500">
                                <span className="w-6 h-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-[11px]">
                                  {sIdx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                {sub.studentName}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="font-semibold text-slate-700 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                  {sub.className}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full font-extrabold border text-xs ${scoreColor}`}
                                >
                                  {score} / {sub.maxScore || 10} đ
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {sub.endTime || sub.startTime || 'Chưa ghi nhận'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-600 font-mono text-[11px]">
                                {sub.totalDuration || '--:--'}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {onSelectSubmission && (
                                  <button
                                    onClick={() => onSelectSubmission(sub)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold border border-sky-200 transition-colors cursor-pointer text-[11px]"
                                    title="Xem chi tiết phiếu bài thi học sinh"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Xem bài</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary footer note */}
                  <div className="bg-slate-50/70 px-3 py-1.5 sm:px-5 sm:py-2 text-[10px] sm:text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
                    <span className="truncate">
                      {isSameStudent
                        ? `* HS ${group.studentNames[0]} làm lại ${group.submissionCount} lần.`
                        : `* Có ${group.uniqueStudentsCount} HS nộp bài từ cùng 1 IP này.`}
                    </span>
                    <span className="font-semibold text-slate-600 flex-shrink-0 ml-2">
                      {group.submissionCount} bài làm
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] sm:text-xs flex-shrink-0">
          <div className="text-slate-500 truncate">
            Tổng: <strong className="text-slate-800">{totalViolatingIps}</strong> IP (
            <strong className="text-rose-700">{totalViolatingSubmissions}</strong> bài nộp)
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {violationGroups.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
