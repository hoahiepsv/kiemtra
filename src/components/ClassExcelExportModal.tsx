import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Users,
  CheckCircle2,
  BarChart3,
  Award,
  Clock,
  Layers,
  Sparkles,
  ChevronDown,
  Globe,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { fetchSubmissionsFromData2, getSubmissionHistory } from '../utils/syncService';
import { formatExamDateTime, formatExamDuration } from '../utils/dateUtils';
import { matchSearchQuery } from '../utils/gradeService';

interface ClassExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  questions: Question[];
}

// Dữ liệu mẫu học sinh (đã dọn sạch)
const SAMPLE_STUDENTS: SubmissionRecord[] = [];

export const ClassExcelExportModal: React.FC<ClassExcelExportModalProps> = ({
  isOpen,
  onClose,
  config,
  questions,
}) => {
  const [students, setStudents] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Tải danh sách bài nộp từ Google Sheets hoặc lịch sử
  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      let finalResult: SubmissionRecord[] = [];
      if (config.data2Url && config.data2Url.trim()) {
        const fetched = await fetchSubmissionsFromData2(config.data2Url);
        finalResult = fetched || [];
      } else {
        const localHistory = getSubmissionHistory();
        finalResult = localHistory.length > 0 ? localHistory : [];
      }

      // Đánh số thứ tự và sắp xếp mới nhất lên đầu
      finalResult.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setStudents(finalResult);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bài làm:', err);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubmissions();
      setExportSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lấy danh sách lớp học duy nhất
  const classList: string[] = Array.from(
    new Set(students.map((s) => (s.className || '').trim().toUpperCase()))
  )
    .filter((c): c is string => Boolean(c))
    .sort();

  // Lọc học sinh theo lớp và từ khoá tìm kiếm - Không phân biệt hoa thường, khoảng cách và dấu tiếng Việt
  const filteredStudents = students.filter((s) => {
    const sClass = (s.className || '').trim().toUpperCase();
    const matchClass = selectedClass === 'all' || sClass === selectedClass;
    const matchSearch =
      !searchKeyword.trim() ||
      matchSearchQuery(s.studentName, searchKeyword) ||
      matchSearchQuery(s.className, searchKeyword);
    return matchClass && matchSearch;
  });

  // Tính số câu đúng và danh sách điểm từng câu của học sinh
  const parseScoreString = (scoreStr: string) => {
    const parts = (scoreStr || '').trim().split(/\s+/);
    const scoreMap = new Map<number, string>();
    let correctCount = 0;

    parts.forEach((p) => {
      const [order, pts] = p.split(':');
      if (order && pts !== undefined) {
        const o = parseInt(order, 10);
        scoreMap.set(o, pts);
        if (pts !== '-' && parseFloat(pts) > 0) {
          correctCount++;
        }
      }
    });

    return { scoreMap, correctCount };
  };

  // Đánh giá xếp loại học lực
  const getGradeRank = (score: number) => {
    if (score >= 9.0) return 'Xuất sắc';
    if (score >= 8.0) return 'Giỏi';
    if (score >= 6.5) return 'Khá';
    if (score >= 5.0) return 'Trung bình';
    return 'Chưa đạt';
  };

  // Thống kê nhanh của danh sách đang chọn
  const totalCount = filteredStudents.length;
  const avgScore =
    totalCount > 0
      ? (
          filteredStudents.reduce((acc, s) => acc + (s.totalScore || 0), 0) / totalCount
        ).toFixed(2)
      : '0.00';
  const maxScore =
    totalCount > 0
      ? Math.max(...filteredStudents.map((s) => s.totalScore || 0)).toFixed(1)
      : '0.0';
  const minScore =
    totalCount > 0
      ? Math.min(...filteredStudents.map((s) => s.totalScore || 0)).toFixed(1)
      : '0.0';

  const excellentCount = filteredStudents.filter((s) => s.totalScore >= 8.0).length;
  const goodCount = filteredStudents.filter(
    (s) => s.totalScore >= 6.5 && s.totalScore < 8.0
  ).length;
  const passCount = filteredStudents.filter(
    (s) => s.totalScore >= 5.0 && s.totalScore < 6.5
  ).length;
  const failCount = filteredStudents.filter((s) => s.totalScore < 5.0).length;

  // Xây dựng cấu trúc hàng (Array of Arrays) cho một Sheet Excel
  const buildSheetData = (items: SubmissionRecord[], sheetTitlePrefix: string) => {
    const numQuestions = questions.length > 0 ? questions.length : 13;
    const todayStr = new Date().toLocaleDateString('vi-VN');

    // Các dòng tiêu đề đầu trang
    const rows: (string | number)[][] = [];

    rows.push([config.schoolName || 'TRƯỜNG HỌC THCS']);
    rows.push([`BẢNG TỔNG HỢP KẾT QUẢ KIỂM TRA: ${(config.examName || 'BÀI KIỂM TRA').toUpperCase()}`]);
    rows.push([
      `Môn: ${config.subject || 'Toán học'}`,
      `Thời gian: ${config.durationMinutes} phút`,
      `Ngày xuất: ${todayStr}`,
      `Phạm vi: ${sheetTitlePrefix}`,
    ]);
    rows.push([]); // Dòng trống

    // Header bảng dữ liệu
    const tableHeader: (string | number)[] = [
      'STT',
      'Họ và tên học sinh',
      'Lớp',
      'Tổng điểm (10đ)',
      'Xếp loại',
      'Số câu đúng',
    ];

    // Thêm các cột cho từng câu hỏi: Câu 1, Câu 2...
    for (let i = 1; i <= numQuestions; i++) {
      tableHeader.push(`Câu ${i}`);
    }

    tableHeader.push('Chi tiết điểm');
    tableHeader.push('Thời gian làm bài');
    tableHeader.push('Bắt đầu');
    tableHeader.push('Nộp bài');

    rows.push(tableHeader);

    // Điền dữ liệu học sinh
    items.forEach((s, idx) => {
      const { scoreMap, correctCount } = parseScoreString(s.scoreString);
      const row: (string | number)[] = [
        idx + 1,
        s.studentName,
        s.className,
        s.totalScore,
        getGradeRank(s.totalScore),
        `${correctCount}/${numQuestions}`,
      ];

      // Điền điểm từng câu
      for (let i = 1; i <= numQuestions; i++) {
        const val = scoreMap.get(i);
        if (val === undefined || val === '-') {
          row.push('-'); // Câu bỏ trống lưu dạng 1:- tương đương 0đ
        } else {
          row.push(parseFloat(val) || 0);
        }
      }

      row.push(s.scoreString || '');
      row.push(formatExamDuration(s.totalDuration, s.startTime, s.endTime));
      row.push(formatExamDateTime(s.startTime) || '');
      row.push(formatExamDateTime(s.endTime) || '');

      rows.push(row);
    });

    // Thêm dòng thống kê cuối bảng
    rows.push([]);
    const classTotal = items.length;
    const classAvg =
      classTotal > 0
        ? (items.reduce((acc, s) => acc + (s.totalScore || 0), 0) / classTotal).toFixed(2)
        : '0.00';
    const classMax =
      classTotal > 0 ? Math.max(...items.map((s) => s.totalScore || 0)).toFixed(1) : '0';
    const classMin =
      classTotal > 0 ? Math.min(...items.map((s) => s.totalScore || 0)).toFixed(1) : '0';

    rows.push(['THỐNG KÊ CHUNG:']);
    rows.push(['Sĩ số bài nộp:', classTotal, 'Điểm trung bình:', classAvg]);
    rows.push(['Điểm cao nhất:', classMax, 'Điểm thấp nhất:', classMin]);
    rows.push([
      'Giỏi (>=8đ):',
      items.filter((s) => s.totalScore >= 8.0).length,
      'Khá (6.5 - 7.9đ):',
      items.filter((s) => s.totalScore >= 6.5 && s.totalScore < 8.0).length,
    ]);
    rows.push([
      'Trung bình (5 - 6.4đ):',
      items.filter((s) => s.totalScore >= 5.0 && s.totalScore < 6.5).length,
      'Chưa đạt (<5đ):',
      items.filter((s) => s.totalScore < 5.0).length,
    ]);

    return rows;
  };

  // Cấu hình độ rộng các cột trong Sheet Excel
  const getColWidths = (numQuestions: number) => {
    const widths = [
      { wch: 6 }, // STT
      { wch: 24 }, // Họ và tên
      { wch: 8 }, // Lớp
      { wch: 15 }, // Tổng điểm
      { wch: 12 }, // Xếp loại
      { wch: 14 }, // Số câu đúng
    ];

    for (let i = 0; i < numQuestions; i++) {
      widths.push({ wch: 8 }); // Câu 1, Câu 2...
    }

    widths.push({ wch: 25 }); // Chi tiết điểm
    widths.push({ wch: 16 }); // Thời gian làm bài
    widths.push({ wch: 18 }); // Bắt đầu
    widths.push({ wch: 18 }); // Nộp bài

    return widths;
  };

  // Xuất file Excel cho lớp đang chọn
  const handleExportSelectedClass = () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();
      const numQuestions = questions.length > 0 ? questions.length : 13;

      const titlePrefix =
        selectedClass === 'all' ? 'Toàn bộ học sinh' : `Lớp ${selectedClass}`;
      const sheetName =
        selectedClass === 'all'
          ? 'Tong_Hop'
          : `Lop_${selectedClass.replace(/[^a-zA-Z0-9]/g, '')}`;

      const rows = buildSheetData(filteredStudents, titlePrefix);
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Định dạng độ rộng cột
      ws['!cols'] = getColWidths(numQuestions);

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const today = new Date();
      const dateTag = `${today.getDate().toString().padStart(2, '0')}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getFullYear()}`;
      const fileName =
        selectedClass === 'all'
          ? `KetQua_TongHop_${dateTag}.xlsx`
          : `KetQua_Lop_${selectedClass}_${dateTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setExportSuccessMessage(`Đã xuất file thành công: ${fileName}`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng kiểm tra lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // Xuất toàn bộ các lớp (Mỗi lớp 1 Sheet + 1 Sheet Tổng hợp)
  const handleExportAllClassesMultiSheet = () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();
      const numQuestions = questions.length > 0 ? questions.length : 13;

      // 1. Sheet Tổng hợp
      const overallRows = buildSheetData(students, 'Toàn bộ học sinh đã nộp');
      const wsOverall = XLSX.utils.aoa_to_sheet(overallRows);
      wsOverall['!cols'] = getColWidths(numQuestions);
      XLSX.utils.book_append_sheet(wb, wsOverall, 'Tong_Hop_Chung');

      // 2. Sheet riêng cho từng lớp
      classList.forEach((cls) => {
        const classStudents = students.filter(
          (s) => (s.className || '').trim().toUpperCase() === cls
        );
        if (classStudents.length > 0) {
          const sheetName = `Lop_${cls.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
          const classRows = buildSheetData(classStudents, `Lớp ${cls}`);
          const wsClass = XLSX.utils.aoa_to_sheet(classRows);
          wsClass['!cols'] = getColWidths(numQuestions);
          XLSX.utils.book_append_sheet(wb, wsClass, sheetName);
        }
      });

      const today = new Date();
      const dateTag = `${today.getDate().toString().padStart(2, '0')}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getFullYear()}`;
      const fileName = `KetQua_TheoLop_Full_${dateTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setExportSuccessMessage(`Đã xuất file Excel đa lớp thành công: ${fileName}`);
    } catch (err) {
      console.error('Lỗi xuất Excel đa lớp:', err);
      alert('Không thể xuất file Excel. Vui lòng kiểm tra lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[96vh] sm:h-[92vh] max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Thu gọn & Gắn nút xuất Excel trực tiếp */}
        <div className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between relative flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-200" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-bold text-xs sm:text-base tracking-tight truncate">
                Xuất Kết Quả Theo Lớp (*.xlsx)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Nút Xuất Excel nhanh trên Header (Desktop) */}
            <button
              type="button"
              onClick={handleExportSelectedClass}
              disabled={isExporting || filteredStudents.length === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title={selectedClass === 'all' ? 'Xuất Excel danh sách đang xem' : `Xuất Excel Lớp ${selectedClass}`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span>{selectedClass === 'all' ? 'Xuất DS Đang Xem' : `Xuất Lớp ${selectedClass}`}</span>
            </button>

            <button
              type="button"
              onClick={handleExportAllClassesMultiSheet}
              disabled={isExporting || students.length === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Xuất file gồm Sheet Tổng Hợp và mỗi lớp một Sheet riêng"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Xuất Tất Cả Lớp</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Quay lại Bảng Quản trị"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {exportSuccessMessage && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
            <button
              onClick={() => setExportSuccessMessage(null)}
              className="text-xs text-emerald-600 hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Toolbar & Filter Bar - Tinh gọn trong 1 dải duy nhất */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0 space-y-2">
          {/* Row 1: Chọn lớp + Tìm kiếm & Làm mới */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Lớp:</span>
              <button
                type="button"
                onClick={() => setSelectedClass('all')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedClass === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tất cả ({students.length})
              </button>
              {classList.map((cls) => {
                const count = students.filter(
                  (s) => (s.className || '').trim().toUpperCase() === cls
                ).length;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedClass === cls
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Lớp {cls} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm & Làm mới */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên HS..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={loadSubmissions}
                disabled={isLoading}
                className="p-1 sm:px-2.5 sm:py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                title="Tải lại dữ liệu từ Google Sheets data2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Row 2: Mini Stats Strip - Siêu gọn gàng tiết kiệm diện tích */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 pt-1.5 border-t border-slate-200/80 text-[11px] sm:text-xs text-slate-600">
            <div className="flex items-center gap-2 sm:gap-3.5 flex-wrap font-medium">
              <span>Sĩ số: <strong className="text-slate-900 font-bold">{totalCount}</strong> em</span>
              <span>•</span>
              <span>ĐTB: <strong className="text-emerald-700 font-bold">{avgScore}</strong>/10</span>
              <span>•</span>
              <span>Giỏi (≥8đ): <strong className="text-sky-700 font-bold">{excellentCount}</strong> ({totalCount > 0 ? Math.round((excellentCount / totalCount) * 100) : 0}%)</span>
              <span>•</span>
              <span>Khá & Đạt: <strong className="text-amber-700 font-bold">{goodCount + passCount}</strong></span>
              {failCount > 0 && (
                <>
                  <span>•</span>
                  <span>Chưa đạt: <strong className="text-rose-600 font-bold">{failCount}</strong></span>
                </>
              )}
            </div>

            {/* Nút xuất trên mobile */}
            <div className="flex items-center gap-1.5 sm:hidden w-full justify-end pt-1">
              <button
                type="button"
                onClick={handleExportSelectedClass}
                disabled={isExporting || filteredStudents.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                <span>Xuất {selectedClass === 'all' ? 'DS' : `Lớp ${selectedClass}`}</span>
              </button>
              <button
                type="button"
                onClick={handleExportAllClassesMultiSheet}
                disabled={isExporting || students.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-800 text-white text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Layers className="w-3 h-3" />
                <span>Tất cả các lớp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Body - Chiếm toàn bộ không gian còn lại (flex-1) */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10 shadow-2xs">
              <tr>
                <th className="p-2 sm:p-2.5 text-center w-10 sm:w-12">STT</th>
                <th className="p-2 sm:p-2.5 min-w-[140px] sm:min-w-[160px]">Họ và tên</th>
                <th className="p-2 sm:p-2.5 text-center w-14 sm:w-16">Lớp</th>
                <th className="p-2 sm:p-2.5 text-center w-20 sm:w-24">Tổng điểm</th>
                <th className="p-2 sm:p-2.5 text-center w-20 sm:w-24">Xếp loại</th>
                <th className="p-2 sm:p-2.5 text-center w-20 sm:w-24">Số câu đúng</th>
                <th className="p-2 sm:p-2.5 min-w-[180px] sm:min-w-[200px]">Chi tiết câu (1:.. 2:..)</th>
                <th className="p-2 sm:p-2.5 text-center w-24 sm:w-28">Thời gian</th>
                <th className="p-2 sm:p-2.5 text-center w-28 sm:w-32">Nộp lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Không có học sinh nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const { correctCount } = parseScoreString(s.scoreString);
                  const isHigh = s.totalScore >= 8.0;
                  const isLow = s.totalScore < 5.0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 sm:p-2.5 text-center font-bold text-slate-600 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 sm:p-2.5 font-bold text-slate-900">
                        {s.studentName}
                      </td>
                      <td className="p-2 sm:p-2.5 text-center font-bold text-slate-700 uppercase">
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px]">
                          {s.className}
                        </span>
                      </td>
                      <td className="p-2 sm:p-2.5 text-center font-mono font-black text-sm">
                        <span
                          className={
                            isHigh
                              ? 'text-emerald-600'
                              : isLow
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }
                        >
                          {String(s.totalScore).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-normal text-slate-400">/10</span>
                      </td>
                      <td className="p-2 sm:p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHigh
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLow
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {getGradeRank(s.totalScore)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-2.5 text-center font-mono font-semibold text-slate-700">
                        {correctCount} / {questions.length}
                      </td>
                      <td className="p-2 sm:p-2.5 font-mono text-[11px] text-slate-600 max-w-[220px] truncate" title={s.scoreString}>
                        {s.scoreString || '-'}
                      </td>
                      <td className="p-2 sm:p-2.5 text-center font-mono text-slate-600">
                        {formatExamDuration(s.totalDuration, s.startTime, s.endTime)}
                      </td>
                      <td className="p-2 sm:p-2.5 text-center text-[11px] text-slate-600 font-mono">
                        {formatExamDateTime(s.endTime) || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="truncate text-[11px] sm:text-xs">
            Danh sách: <strong className="text-slate-800">{filteredStudents.length}</strong> / {students.length} học sinh
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
