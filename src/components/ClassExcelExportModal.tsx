import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  Layers,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Calendar,
  School,
  GraduationCap,
  Clock,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { fetchSubmissionsFromData2, getSubmissionHistory } from '../utils/syncService';
import { formatExamDateTime, formatExamDuration } from '../utils/dateUtils';
import { matchSearchQuery, autoRegradeAllSubmissions } from '../utils/gradeService';

interface ClassExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  questions: Question[];
}

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
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Ref chứa bảng điểm để chụp xuất file ảnh sắc nét
  const imageExportRef = useRef<HTMLDivElement>(null);

  // Tải danh sách bài nộp từ Google Sheets data2 hoặc lịch sử cục bộ
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

      // Sắp xếp mới nhất lên đầu
      finalResult.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Tự động nhận diện và tính lại điểm cho các câu tự luận có đáp án tương đương (3TB=3072GB, 3072GB, 1.234...)
      if (questions && questions.length > 0 && finalResult.length > 0) {
        const { updatedList } = autoRegradeAllSubmissions(finalResult, questions);
        finalResult = updatedList;
      }

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

  // Lọc học sinh theo lớp và từ khoá tìm kiếm
  const filteredStudents = students.filter((s) => {
    const sClass = (s.className || '').trim().toUpperCase();
    const matchClass = selectedClass === 'all' || sClass === selectedClass;
    const matchSearch =
      !searchKeyword.trim() ||
      matchSearchQuery(s.studentName, searchKeyword) ||
      matchSearchQuery(s.className, searchKeyword);
    return matchClass && matchSearch;
  });

  // Đánh giá xếp loại học lực theo thang điểm 10
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

  /**
   * Xây dựng dữ liệu Sheet Excel CHUẨN ĐÚNG 7 CỘT theo yêu cầu:
   * 1. STT
   * 2. Họ tên
   * 3. Lớp
   * 4. Tổng điểm
   * 5. Xếp loại
   * 6. Thời gian
   * 7. Nộp lúc
   */
  const buildSheetData = (items: SubmissionRecord[], sheetTitlePrefix: string) => {
    const todayStr = new Date().toLocaleDateString('vi-VN');
    const rows: (string | number)[][] = [];

    // Tiêu đề đầu trang
    rows.push([config.schoolName || 'TRƯỜNG THCS VÕ VĂN KIỆT']);
    rows.push([`BẢNG KẾT QUẢ KIỂM TRA: ${(config.examName || 'BÀI KIỂM TRA').toUpperCase()}`]);
    rows.push([
      `Môn: ${config.subject || 'Tin học'}`,
      `Thời gian: ${config.durationMinutes} phút`,
      `Ngày xuất: ${todayStr}`,
      `Phạm vi: ${sheetTitlePrefix}`,
    ]);
    rows.push([]); // Dòng trống

    // Header bảng - ĐÚNG CHUẨN 7 CỘT THEO YÊU CẦU
    const tableHeader: (string | number)[] = [
      'STT',
      'Họ tên',
      'Lớp',
      'Tổng điểm',
      'Xếp loại',
      'Thời gian',
      'Nộp lúc',
    ];
    rows.push(tableHeader);

    // Điền dữ liệu học sinh
    items.forEach((s, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        s.studentName,
        s.className,
        s.totalScore,
        getGradeRank(s.totalScore),
        formatExamDuration(s.totalDuration, s.startTime, s.endTime),
        formatExamDateTime(s.endTime) || '',
      ];
      rows.push(row);
    });

    // Thống kê cuối bảng
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
    rows.push(['Sĩ số bài nộp:', classTotal, '', 'Điểm trung bình:', classAvg]);
    rows.push(['Điểm cao nhất:', classMax, '', 'Điểm thấp nhất:', classMin]);
    rows.push([
      'Giỏi (>=8đ):',
      items.filter((s) => s.totalScore >= 8.0).length,
      '',
      'Khá (6.5 - 7.9đ):',
      items.filter((s) => s.totalScore >= 6.5 && s.totalScore < 8.0).length,
    ]);
    rows.push([
      'Trung bình (5 - 6.4đ):',
      items.filter((s) => s.totalScore >= 5.0 && s.totalScore < 6.5).length,
      '',
      'Chưa đạt (<5đ):',
      items.filter((s) => s.totalScore < 5.0).length,
    ]);

    return rows;
  };

  // Cấu hình độ rộng 7 cột trong Sheet Excel
  const getColWidths = () => [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ tên
    { wch: 10 }, // Lớp
    { wch: 14 }, // Tổng điểm
    { wch: 14 }, // Xếp loại
    { wch: 16 }, // Thời gian
    { wch: 22 }, // Nộp lúc
  ];

  // 1. Xuất file Excel (.xlsx) cho lớp đang chọn (Đúng 7 cột)
  const handleExportSelectedClass = () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      const titlePrefix =
        selectedClass === 'all' ? 'Toàn bộ học sinh' : `Lớp ${selectedClass}`;
      const sheetName =
        selectedClass === 'all'
          ? 'Tong_Hop'
          : `Lop_${selectedClass.replace(/[^a-zA-Z0-9]/g, '')}`;

      const rows = buildSheetData(filteredStudents, titlePrefix);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = getColWidths();

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const today = new Date();
      const dateTag = `${today.getDate().toString().padStart(2, '0')}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getFullYear()}`;
      const fileName =
        selectedClass === 'all'
          ? `KetQua_TongHop_${dateTag}.xlsx`
          : `KetQua_Lop_${selectedClass}_${dateTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setExportSuccessMessage(`Đã xuất file Excel thành công: ${fileName}`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng kiểm tra lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Xuất toàn bộ các lớp (Mỗi lớp 1 Sheet + 1 Sheet Tổng hợp, đều đúng 7 cột)
  const handleExportAllClassesMultiSheet = () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      // Sheet Tổng hợp
      const overallRows = buildSheetData(students, 'Toàn bộ học sinh đã nộp');
      const wsOverall = XLSX.utils.aoa_to_sheet(overallRows);
      wsOverall['!cols'] = getColWidths();
      XLSX.utils.book_append_sheet(wb, wsOverall, 'Tong_Hop_Chung');

      // Sheet riêng từng lớp
      classList.forEach((cls) => {
        const classStudents = students.filter(
          (s) => (s.className || '').trim().toUpperCase() === cls
        );
        if (classStudents.length > 0) {
          const sheetName = `Lop_${cls.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
          const classRows = buildSheetData(classStudents, `Lớp ${cls}`);
          const wsClass = XLSX.utils.aoa_to_sheet(classRows);
          wsClass['!cols'] = getColWidths();
          XLSX.utils.book_append_sheet(wb, wsClass, sheetName);
        }
      });

      const today = new Date();
      const dateTag = `${today.getDate().toString().padStart(2, '0')}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getFullYear()}`;
      const fileName = `KetQua_TheoLop_Full_${dateTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setExportSuccessMessage(`Đã xuất file Excel tất cả các lớp thành công: ${fileName}`);
    } catch (err) {
      console.error('Lỗi xuất Excel đa lớp:', err);
      alert('Không thể xuất file Excel. Vui lòng kiểm tra lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Xuất kết quả dạng FILE ẢNH (*.png) để gửi Zalo / Phụ huynh
  const handleExportImage = async () => {
    if (!imageExportRef.current || filteredStudents.length === 0) return;
    try {
      setIsExportingImage(true);
      // Đợi render hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(imageExportRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Độ phân giải cao sắc nét (Retina)
        backgroundColor: '#ffffff',
      });

      const today = new Date();
      const dateTag = `${today.getDate().toString().padStart(2, '0')}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getFullYear()}`;
      const classTag = selectedClass === 'all' ? 'TongHop' : `Lop_${selectedClass}`;
      const fileName = `BangDiem_${classTag}_${dateTag}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      setExportSuccessMessage(`Đã xuất file ảnh bảng điểm thành công: ${fileName}`);
    } catch (err) {
      console.error('Lỗi khi xuất ảnh bảng điểm:', err);
      alert('Không thể xuất file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[96vh] sm:h-[92vh] max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between relative flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-200" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-bold text-xs sm:text-base tracking-tight truncate">
                Xuất Kết Quả Theo Lớp (*.xlsx & Ảnh)
              </h3>
            </div>
          </div>

          {/* Action buttons on Desktop Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Nút Xuất File Ảnh (*.png) */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExportingImage || filteredStudents.length === 0}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Xuất bảng điểm dạng file ảnh sắc nét để gửi Zalo / Facebook"
            >
              {isExportingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>{isExportingImage ? 'Đang tạo ảnh...' : 'Xuất File Ảnh (*.png)'}</span>
            </button>

            {/* Nút Xuất Excel nhanh */}
            <button
              type="button"
              onClick={handleExportSelectedClass}
              disabled={isExporting || filteredStudents.length === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title={selectedClass === 'all' ? 'Xuất Excel danh sách đang xem' : `Xuất Excel Lớp ${selectedClass}`}
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-200" />}
              <span>{selectedClass === 'all' ? 'Xuất Excel DS' : `Xuất Excel ${selectedClass}`}</span>
            </button>

            {/* Nút Xuất Tất cả lớp */}
            <button
              type="button"
              onClick={handleExportAllClassesMultiSheet}
              disabled={isExporting || students.length === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Xuất file Excel gồm Sheet Tổng Hợp và mỗi lớp một Sheet riêng"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất Cả Lớp</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Thông báo xuất file thành công */}
        {exportSuccessMessage && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between flex-shrink-0 animate-in fade-in">
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

        {/* TOOLBAR & BỘ LỌC */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0 space-y-2">
          
          {/* Row 1: Chọn lớp (Dạng mũi tên sổ xuống cho gọn gàng trên mọi thiết bị) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            
            {/* Lọc theo lớp dạng mũi tên sổ xuống cho gọn gàng */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Lọc theo lớp:
              </span>
              <div className="relative w-full sm:w-72">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full appearance-none pl-3.5 pr-10 py-1.5 sm:py-2 bg-white border-2 border-emerald-500/50 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">📁 Tất cả các lớp ({students.length} học sinh)</option>
                  {classList.map((cls) => {
                    const count = students.filter(
                      (s) => (s.className || '').trim().toUpperCase() === cls
                    ).length;
                    return (
                      <option key={cls} value={cls}>
                        🎓 Lớp {cls} ({count} học sinh)
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Ô tìm kiếm & Nút làm mới */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên học sinh..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 sm:py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={loadSubmissions}
                disabled={isLoading}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                title="Tải lại dữ liệu từ Google Sheets data2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Row 2: Thống kê mini */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 pt-1.5 border-t border-slate-200/80 text-[11px] sm:text-xs text-slate-600">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-medium">
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

            {/* Các nút xuất tài liệu trên Mobile */}
            <div className="flex items-center gap-1 sm:hidden w-full justify-between pt-1">
              <button
                type="button"
                onClick={handleExportImage}
                disabled={isExportingImage || filteredStudents.length === 0}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500 text-amber-950 text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isExportingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                <span>Xuất Ảnh</span>
              </button>
              <button
                type="button"
                onClick={handleExportSelectedClass}
                disabled={isExporting || filteredStudents.length === 0}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportAllClassesMultiSheet}
                disabled={isExporting || students.length === 0}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-teal-800 text-white text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Layers className="w-3 h-3" />
                <span>Tất cả lớp</span>
              </button>
            </div>
          </div>
        </div>

        {/* BẢNG HIỂN THỊ TRÊN MÀN HÌNH - CHUẨN 7 CỘT */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10 shadow-2xs">
              <tr>
                <th className="p-2.5 text-center w-12">STT</th>
                <th className="p-2.5 min-w-[160px]">Họ tên</th>
                <th className="p-2.5 text-center w-16">Lớp</th>
                <th className="p-2.5 text-center w-24">Tổng điểm</th>
                <th className="p-2.5 text-center w-24">Xếp loại</th>
                <th className="p-2.5 text-center w-28">Thời gian</th>
                <th className="p-2.5 text-center w-36">Nộp lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Không có học sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isHigh = s.totalScore >= 8.0;
                  const isLow = s.totalScore < 5.0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 text-center font-bold text-slate-600 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {s.studentName}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-700 uppercase">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                          {s.className}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-sm">
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
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {formatExamDuration(s.totalDuration, s.startTime, s.endTime)}
                      </td>
                      <td className="p-2.5 text-center text-[11px] text-slate-600 font-mono">
                        {formatExamDateTime(s.endTime) || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
            <span>
              Đã lọc: <strong className="text-slate-800 font-bold">{filteredStudents.length}</strong> / {students.length} học sinh
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VÙNG CHỤP ẢNH BẢNG ĐIỂM SẮC NÉT (DÀNH CHO XUẤT FILE ẢNH *.PNG) */}
      {/* ========================================================================= */}
      <div
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '920px' }}
        aria-hidden="true"
      >
        <div
          ref={imageExportRef}
          className="bg-white p-7 text-slate-900 font-sans"
          style={{ width: '920px' }}
        >
          {/* Header Bảng Điểm */}
          <div className="border-b-2 border-emerald-600 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  {config.schoolName || 'TRƯỜNG THCS VÕ VĂN KIỆT'}
                </p>
                <h1 className="text-xl font-black text-emerald-800 uppercase tracking-tight mt-0.5">
                  BẢNG KẾT QUẢ KIỂM TRA: {config.examName || 'BÀI KIỂM TRA'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Môn học: <span className="font-bold text-slate-900">{config.subject || 'Tin học'}</span> | Thời gian: {config.durationMinutes} phút
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black text-sm border border-emerald-200">
                  {selectedClass === 'all' ? 'TỔNG HỢP CÁC LỚP' : `LỚP ${selectedClass}`}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Thống kê vắn tắt */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sĩ số bài nộp</span>
                <span className="text-base font-black text-slate-900">{totalCount} em</span>
              </div>
              <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Điểm trung bình</span>
                <span className="text-base font-black text-emerald-800">{avgScore} / 10</span>
              </div>
              <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-sky-700 block">Giỏi (≥8.0đ)</span>
                <span className="text-base font-black text-sky-800">{excellentCount} em ({totalCount > 0 ? Math.round((excellentCount / totalCount) * 100) : 0}%)</span>
              </div>
              <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Điểm cao nhất</span>
                <span className="text-base font-black text-amber-800">{maxScore} đ</span>
              </div>
            </div>
          </div>

          {/* Bảng Dữ Liệu 7 Cột Chuẩn */}
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white font-bold">
                <th className="p-2 border border-slate-700 text-center w-10">STT</th>
                <th className="p-2 border border-slate-700 min-w-[200px]">Họ tên</th>
                <th className="p-2 border border-slate-700 text-center w-16">Lớp</th>
                <th className="p-2 border border-slate-700 text-center w-20">Tổng điểm</th>
                <th className="p-2 border border-slate-700 text-center w-24">Xếp loại</th>
                <th className="p-2 border border-slate-700 text-center w-24">Thời gian</th>
                <th className="p-2 border border-slate-700 text-center w-36">Nộp lúc</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => {
                const isHigh = s.totalScore >= 8.0;
                const isLow = s.totalScore < 5.0;
                return (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                  >
                    <td className="p-2 border border-slate-200 text-center font-bold font-mono text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-900">
                      {s.studentName}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-700 uppercase">
                      {s.className}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-black text-sm">
                      <span className={isHigh ? 'text-emerald-700' : isLow ? 'text-rose-600' : 'text-amber-700'}>
                        {String(s.totalScore).replace('.', ',')}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
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
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">
                      {formatExamDuration(s.totalDuration, s.startTime, s.endTime)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-600 text-[11px]">
                      {formatExamDateTime(s.endTime) || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Bảng Điểm */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ứng dụng kiểm tra trực tuyến • Bản quyền: {config.copyrightText || 'Lê Hoà Hiệp'}</span>
            <span>Tổng cộng: {filteredStudents.length} học sinh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
