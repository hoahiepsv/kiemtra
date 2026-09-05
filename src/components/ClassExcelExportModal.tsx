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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { fetchSubmissionsFromData2, getSubmissionHistory } from '../utils/syncService';

interface ClassExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  questions: Question[];
}

// Dữ liệu mẫu hỗ trợ giáo viên kiểm tra ngay khi chưa có dữ liệu nộp bài thực tế
const SAMPLE_STUDENTS: SubmissionRecord[] = [
  {
    stt: 1,
    studentName: 'Nguyễn Văn An',
    className: '6A',
    totalScore: 10,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1 10:1 11:1 12:1 13:1',
    startTime: '8:00 05/09/2026',
    endTime: '8:14 05/09/2026',
    totalDuration: '00:14',
    ipAddress: '192.168.1.15',
    timestamp: Date.now() - 3600000 * 2,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 2,
    studentName: 'Trần Thị Mai',
    className: '6A',
    totalScore: 9.0,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:- 10:1 11:1 12:1 13:0',
    startTime: '8:02 05/09/2026',
    endTime: '8:15 05/09/2026',
    totalDuration: '00:13',
    ipAddress: '192.168.1.18',
    timestamp: Date.now() - 3600000 * 3,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 3,
    studentName: 'Phạm Minh Tuấn',
    className: '6A',
    totalScore: 7.5,
    maxScore: 10,
    scoreString: '1:1 2:1 3:- 4:1 5:1 6:0 7:1 8:1 9:1 10:0.5 11:1 12:0 13:0',
    startTime: '8:01 05/09/2026',
    endTime: '8:15 05/09/2026',
    totalDuration: '00:14',
    ipAddress: '192.168.1.20',
    timestamp: Date.now() - 3600000 * 4,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 4,
    studentName: 'Lê Quốc Bảo',
    className: '6B',
    totalScore: 8.5,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:0.5 5:1 6:1 7:1 8:1 9:1 10:1 11:0 12:1 13:0',
    startTime: '8:05 05/09/2026',
    endTime: '8:18 05/09/2026',
    totalDuration: '00:13',
    ipAddress: '192.168.1.22',
    timestamp: Date.now() - 3600000 * 5,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 5,
    studentName: 'Vũ Hải Yến',
    className: '6B',
    totalScore: 6.0,
    maxScore: 10,
    scoreString: '1:1 2:0 3:- 4:1 5:0 6:1 7:1 8:0 9:1 10:1 11:- 12:0 13:1',
    startTime: '8:06 05/09/2026',
    endTime: '8:20 05/09/2026',
    totalDuration: '00:14',
    ipAddress: '192.168.1.25',
    timestamp: Date.now() - 3600000 * 6,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 6,
    studentName: 'Đặng Ngọc Ánh',
    className: '6C',
    totalScore: 9.5,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1 10:1 11:1 12:0.5 13:1',
    startTime: '8:10 05/09/2026',
    endTime: '8:23 05/09/2026',
    totalDuration: '00:13',
    ipAddress: '192.168.1.30',
    timestamp: Date.now() - 3600000 * 7,
    syncedToData2: true,
    questionResults: [],
  },
];

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
      let fetched: SubmissionRecord[] = [];
      if (config.data2Url && config.data2Url.trim()) {
        fetched = await fetchSubmissionsFromData2(config.data2Url);
      }

      const localHistory = getSubmissionHistory();

      // Kết hợp dữ liệu (loại bỏ trùng lặp dựa trên Tên + Lớp + Thời điểm)
      const combinedMap = new Map<string, SubmissionRecord>();

      fetched.forEach((item) => {
        const key = `${item.studentName}_${item.className}_${item.endTime}`;
        combinedMap.set(key, item);
      });

      localHistory.forEach((item) => {
        const key = `${item.studentName}_${item.className}_${item.endTime}`;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, item);
        }
      });

      let finalResult = Array.from(combinedMap.values());

      // Nếu chưa có kết quả nào, bổ sung dữ liệu mẫu
      if (finalResult.length === 0) {
        finalResult = SAMPLE_STUDENTS;
      }

      // Đánh số thứ tự
      finalResult.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setStudents(finalResult);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bài làm:', err);
      setStudents(SAMPLE_STUDENTS);
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
      s.studentName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      s.className.toLowerCase().includes(searchKeyword.toLowerCase());
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
    tableHeader.push('IP máy tính');

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
      row.push(s.totalDuration || '00:15');
      row.push(s.startTime || '');
      row.push(s.endTime || '');
      row.push(s.ipAddress || '');

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
    widths.push({ wch: 16 }); // IP máy

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg sm:text-xl tracking-tight">
                  Xuất Kết Quả Theo Lớp Dạng File *.xlsx
                </h3>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-emerald-100">
                  Microsoft Excel
                </span>
              </div>
              <p className="text-emerald-100 text-xs mt-0.5">
                Tổng hợp bảng điểm, phân loại học lực và chi tiết từng câu hỏi (câu bỏ trống ghi nhận 1:- tương đương 0đ)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {/* Success Banner */}
          {exportSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between">
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

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Lọc theo lớp */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn lớp:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedClass('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedClass === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedClass === cls
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Lớp {cls} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tìm kiếm & Làm mới */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên học sinh..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={loadSubmissions}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại dữ liệu từ Google Sheets data2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Quick Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Sĩ số nộp bài
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
                {totalCount} <span className="text-xs font-normal text-slate-500">em</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Lớp: {selectedClass === 'all' ? 'Toàn bộ' : selectedClass}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Điểm trung bình
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {avgScore} <span className="text-xs font-normal text-slate-400">/ 10</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Cao nhất: {maxScore} | Thấp: {minScore}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Giỏi (≥ 8.0 đ)
              </span>
              <div className="text-2xl font-black text-sky-700 mt-1 font-mono">
                {excellentCount} <span className="text-xs font-normal text-slate-400">em</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Tỷ lệ: {totalCount > 0 ? Math.round((excellentCount / totalCount) * 100) : 0}%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Khá & Đạt (≥ 5.0 đ)
              </span>
              <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
                {goodCount + passCount}{' '}
                <span className="text-xs font-normal text-slate-400">em</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Chưa đạt: {failCount} em
              </span>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Tùy chọn tải về file Excel (*.xlsx)</span>
              </h4>
              <p className="text-emerald-800 text-xs mt-0.5">
                Định dạng chuẩn bảng tính, tương thích hoàn toàn với Microsoft Excel, Google Sheets, LibreOffice
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút 1: Xuất lớp đang chọn */}
              <button
                type="button"
                onClick={handleExportSelectedClass}
                disabled={isExporting || filteredStudents.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedClass === 'all'
                    ? 'Xuất Excel Danh Sách Đang Xem'
                    : `Xuất Excel Lớp ${selectedClass} (.xlsx)`}
                </span>
              </button>

              {/* Nút 2: Xuất toàn bộ lớp mỗi lớp 1 Sheet */}
              <button
                type="button"
                onClick={handleExportAllClassesMultiSheet}
                disabled={isExporting || students.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-800/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Xuất file gồm Sheet Tổng Hợp và mỗi lớp một Sheet riêng"
              >
                <Layers className="w-4 h-4" />
                <span>Xuất Tất Cả Các Lớp (Đa Sheet)</span>
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Xem trước danh sách (
                {selectedClass === 'all' ? 'Tất cả các lớp' : `Lớp ${selectedClass}`} -{' '}
                {filteredStudents.length} học sinh)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {questions.length} câu hỏi • Thang 10 điểm
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-2.5 text-center w-12">STT</th>
                    <th className="p-2.5 min-w-[160px]">Họ và tên</th>
                    <th className="p-2.5 text-center w-16">Lớp</th>
                    <th className="p-2.5 text-center w-24">Tổng điểm</th>
                    <th className="p-2.5 text-center w-24">Xếp loại</th>
                    <th className="p-2.5 text-center w-24">Số câu đúng</th>
                    <th className="p-2.5 min-w-[200px]">Chi tiết câu (1:.. 2:..)</th>
                    <th className="p-2.5 text-center w-28">Thời gian</th>
                    <th className="p-2.5 text-center w-32">Nộp lúc</th>
                    <th className="p-2.5 text-center w-28">IP máy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
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
                          <td className="p-2.5 text-center font-bold text-slate-600 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {s.studentName}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-700 uppercase">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100">
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
                              {s.totalScore}
                            </span>
                            <span className="text-[11px] font-normal text-slate-400">/10</span>
                          </td>
                          <td className="p-2.5 text-center">
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
                          <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                            {correctCount} / {questions.length}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600 max-w-[220px] truncate" title={s.scoreString}>
                            {s.scoreString || '-'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {s.totalDuration || '-'}
                          </td>
                          <td className="p-2.5 text-center text-[11px] text-slate-600">
                            {s.endTime || '-'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[10px] text-slate-400">
                            {s.ipAddress || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hệ thống Quản trị & Báo cáo • Bản quyền: <strong>{config.copyrightText}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
