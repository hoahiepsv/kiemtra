import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FolderArchive,
  Download,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Users,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Trash2,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import {
  getSubmissionHistory,
  fetchSubmissionsFromData2,
  syncSubmissionsFromSheetToHistory,
  deleteSubmissionFromHistory,
  updateSubmissionInHistory,
  sendSubmissionToData2,
} from '../utils/syncService';
import { matchSearchQuery, overrideEssayGrade, autoRegradeAllSubmissions } from '../utils/gradeService';
import { StudentReportCard } from './StudentReportCard';
import { formatExamDateTime, formatExamDuration } from '../utils/dateUtils';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

interface StudentReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  questions: Question[];
}

// Sample fallback students in case database is freshly opened and empty
const SAMPLE_STUDENTS: SubmissionRecord[] = [];

export const StudentReportExportModal: React.FC<StudentReportExportModalProps> = ({
  isOpen,
  onClose,
  config,
  questions,
}) => {
  const [students, setStudents] = useState<SubmissionRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [loadSource, setLoadSource] = useState<'sheet' | 'local' | 'sample'>('local');

  // Preview single student card
  const [previewStudent, setPreviewStudent] = useState<SubmissionRecord | null>(null);
  const [previewHasUnsavedChanges, setPreviewHasUnsavedChanges] = useState(false);
  const [isPreviewSaving, setIsPreviewSaving] = useState(false);
  const [previewSaveSuccess, setPreviewSaveSuccess] = useState(false);

  // Modal xác nhận xóa học sinh
  const [studentToDelete, setStudentToDelete] = useState<SubmissionRecord | null>(null);

  const getStudentKey = (s: SubmissionRecord) =>
    `${s.stt ?? ''}_${String(s.studentName || '').toLowerCase().trim()}_${String(s.className || '').toLowerCase().trim()}_${s.endTime || ''}_${s.timestamp || ''}`;

  const handleSavePreviewStudent = async () => {
    if (!previewStudent) return;
    setIsPreviewSaving(true);
    try {
      const targetName = String(previewStudent.studentName || '').toLowerCase().trim();
      const targetClass = String(previewStudent.className || '').toLowerCase().trim();
      const targetKey = getStudentKey(previewStudent);

      setStudents((prev) => {
        let foundIdx = prev.findIndex((s) => getStudentKey(s) === targetKey);
        if (foundIdx === -1 && previewStudent.stt !== undefined && previewStudent.stt !== null && Number(previewStudent.stt) > 0) {
          foundIdx = prev.findIndex((s) => Number(s.stt) === Number(previewStudent.stt));
        }
        if (foundIdx === -1 && previewStudent.endTime) {
          foundIdx = prev.findIndex(
            (s) =>
              String(s.studentName || '').toLowerCase().trim() === targetName &&
              String(s.className || '').toLowerCase().trim() === targetClass &&
              s.endTime === previewStudent.endTime
          );
        }
        if (foundIdx === -1) {
          foundIdx = prev.findIndex(
            (s) =>
              String(s.studentName || '').toLowerCase().trim() === targetName &&
              String(s.className || '').toLowerCase().trim() === targetClass
          );
        }

        if (foundIdx !== -1) {
          const next = [...prev];
          next[foundIdx] = previewStudent;
          return next;
        }
        return [previewStudent, ...prev];
      });

      updateSubmissionInHistory(previewStudent);
      if (config.data2Url) {
        await sendSubmissionToData2(config.data2Url, previewStudent, { isUpdate: true });
      }
      setPreviewHasUnsavedChanges(false);
      setPreviewSaveSuccess(true);
      setTimeout(() => {
        setPreviewSaveSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Lỗi khi lưu điểm:', err);
    } finally {
      setIsPreviewSaving(false);
    }
  };

  // ĐẶC QUYỀN GIÁO VIÊN: Tùy chọn hiện/ẩn đáp án chuẩn khi xuất phiếu ảnh
  const [includeCorrectAnswers, setIncludeCorrectAnswers] = useState(false);

  // Active rendering student for html-to-image capture
  const [capturingStudent, setCapturingStudent] = useState<SubmissionRecord | null>(null);
  const captureCardRef = useRef<HTMLDivElement>(null);

  // Progress state during mass zip generation
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: '',
  });

  // Load students data on open
  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen, config.data2Url]);

  const loadStudents = async () => {
    setIsLoading(true);
    let loadedList: SubmissionRecord[] = [];

    // 1. Tự động lấy trực tiếp từ Cơ sở dữ liệu - NGUỒN CHUẨN XÁC DUY NHẤT
    if (config.data2Url && config.data2Url.trim()) {
      try {
        const sheetData = await fetchSubmissionsFromData2(config.data2Url);
        // Cơ sở dữ liệu là nguồn chính thống: chỉ lấy đúng các học sinh có trong Cơ sở dữ liệu.
        // Tuyệt đối không merge các bài nộp thử nghiệm rác trên máy (sda, HIỆP, wew, dsd...).
        loadedList = sheetData || [];
        setLoadSource('sheet');
        syncSubmissionsFromSheetToHistory(loadedList);
      } catch (err) {
        console.warn('Cannot fetch from Google Sheet data2:', err);
      }
    } else {
      // Chỉ khi chưa cấu hình Google Sheets data2 mới dùng lịch sử nộp bài trên thiết bị
      const localList = getSubmissionHistory();
      if (localList.length > 0) {
        loadedList = localList;
        setLoadSource('local');
      }
    }

    // Tự động nhận diện và tính lại điểm cho các câu tự luận có đáp án tương đương (3TB=3072GB, 3072GB, 1.234...)
    if (questions && questions.length > 0 && loadedList.length > 0) {
      const { updatedList } = autoRegradeAllSubmissions(loadedList, questions);
      loadedList = updatedList;
    }

    setStudents(loadedList);
    // Mặc định không đánh dấu (chọn) học sinh nào theo yêu cầu người dùng
    setSelectedIds(new Set());
    setIsLoading(false);
  };

  const handleDeleteSingleStudent = (student: SubmissionRecord) => {
    const key = getStudentKey(student);
    setStudents((prev) => prev.filter((s) => getStudentKey(s) !== key));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    deleteSubmissionFromHistory(student.studentName, student.className, student.endTime);
  };

  // Filtered students list - Không phân biệt hoa thường, khoảng cách và dấu tiếng Việt
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      !searchKeyword.trim() ||
      matchSearchQuery(s.studentName, searchKeyword) ||
      matchSearchQuery(s.className, searchKeyword);
    const sClass = String(s.className || '').trim().toUpperCase();
    const matchClass =
      selectedClass === 'all' ||
      selectedClass === 'ALL' ||
      sClass === selectedClass.toUpperCase();
    return matchSearch && matchClass;
  });

  // Unique classes for filter (được chuẩn hóa chữ in hoa & sắp xếp)
  const classOptions = useMemo(() => {
    return Array.from(
      new Set(students.map((s) => String(s.className || '').trim().toUpperCase()))
    )
      .filter(Boolean)
      .sort();
  }, [students]);

  // Vị trí học sinh xem trước để chuyển tới lui
  const previewIndex = useMemo(() => {
    if (!previewStudent || filteredStudents.length === 0) return -1;
    return filteredStudents.findIndex((s) => getStudentKey(s) === getStudentKey(previewStudent));
  }, [previewStudent, filteredStudents]);

  const hasPrevPreview = previewIndex > 0;
  const hasNextPreview = previewIndex !== -1 && previewIndex < filteredStudents.length - 1;
  const prevPreviewStudent = hasPrevPreview ? filteredStudents[previewIndex - 1] : null;
  const nextPreviewStudent = hasNextPreview ? filteredStudents[previewIndex + 1] : null;

  const navigatePreview = (target: SubmissionRecord | null) => {
    if (!target) return;
    if (previewHasUnsavedChanges) {
      handleSavePreviewStudent();
    }
    setPreviewStudent(target);
    setPreviewHasUnsavedChanges(false);
    setPreviewSaveSuccess(false);
  };

  // Hỗ trợ phím mũi tên khi xem trước
  useEffect(() => {
    if (!previewStudent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && hasPrevPreview && prevPreviewStudent) {
        e.preventDefault();
        navigatePreview(prevPreviewStudent);
      } else if (e.key === 'ArrowRight' && hasNextPreview && nextPreviewStudent) {
        e.preventDefault();
        navigatePreview(nextPreviewStudent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewStudent, hasPrevPreview, hasNextPreview, prevPreviewStudent, nextPreviewStudent, previewHasUnsavedChanges]);

  // Toggle selection
  const handleToggleSelect = (key: string) => {
    const next = new Set(selectedIds);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredStudents.forEach((s) => next.add(getStudentKey(s)));
      setSelectedIds(next);
    }
  };

  // Helper safe file name
  const getSafeFileName = (name: string, className: string) => {
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    const cleanClass = className.replace(/[^a-zA-Z0-9]/g, '_');
    return `BaoCao_${cleanName}_${cleanClass}.png`;
  };

  // Capture single student image data url
  const captureStudentCard = async (student: SubmissionRecord): Promise<string> => {
    setCapturingStudent(student);
    // Wait for DOM update & fonts
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (document.fonts) {
      await document.fonts.ready;
    }

    if (!captureCardRef.current) {
      throw new Error('Capture card container not found in DOM');
    }

    const node = captureCardRef.current;
    const scrollHeight = node.scrollHeight;
    const scrollWidth = node.scrollWidth || 800;

    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true,
      height: scrollHeight,
      width: scrollWidth,
      style: {
        height: `${scrollHeight}px`,
        maxHeight: 'none',
        overflow: 'visible',
      },
    });

    return dataUrl;
  };

  // Download 1 student image
  const handleExportSingle = async (student: SubmissionRecord) => {
    setIsExporting(true);
    setExportProgress({ current: 1, total: 1, message: `Đang tạo ảnh báo cáo cho ${student.studentName}...` });

    try {
      const dataUrl = await captureStudentCard(student);
      const fileName = getSafeFileName(student.studentName, student.className);

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi tạo ảnh học sinh:', err);
      alert('Có lỗi xảy ra khi tạo ảnh báo cáo. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
      setCapturingStudent(null);
    }
  };

  // Main Export: If 1 student -> PNG, if multiple -> ZIP
  const handleMainExport = async () => {
    const selectedList = students.filter((s) => selectedIds.has(getStudentKey(s)));
    if (selectedList.length === 0) return;

    // If only 1 student: download PNG directly
    if (selectedList.length === 1) {
      await handleExportSingle(selectedList[0]);
      return;
    }

    // If multiple students: generate ZIP file containing images
    setIsExporting(true);
    const total = selectedList.length;
    const zip = new JSZip();

    try {
      for (let i = 0; i < total; i++) {
        const student = selectedList[i];
        setExportProgress({
          current: i + 1,
          total,
          message: `Đang tạo ảnh (${i + 1}/${total}): ${student.studentName} - Lớp ${student.className}...`,
        });

        const dataUrl = await captureStudentCard(student);
        // Extract base64
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const fileName = getSafeFileName(student.studentName, student.className);
        zip.file(fileName, base64Data, { base64: true });
      }

      setExportProgress({
        current: total,
        total,
        message: `Đang nén file ZIP (${total} báo cáo học sinh)...`,
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      const timeStr = new Date().toISOString().slice(0, 10);
      link.download = `BaoCao_KetQua_${config.subject.replace(/[^a-zA-Z0-9]/g, '_')}_${timeStr}.zip`;
      link.href = zipUrl;
      link.click();
      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error('Lỗi khi nén file zip:', err);
      alert('Có lỗi xảy ra trong quá trình xuất file nén. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
      setCapturingStudent(null);
    }
  };

  if (!isOpen) return null;

  const selectedCount = students.filter((s) => selectedIds.has(getStudentKey(s))).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[96vh] sm:h-[90vh] max-h-[96vh] sm:max-h-[800px] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Thu gọn & Xoá chú thích */}
        <div className="px-3 py-2 sm:px-6 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 flex-shrink-0">
              <FolderArchive className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="font-bold text-xs sm:text-base tracking-tight truncate">
              Xuất Báo Cáo Học Sinh (PNG / ZIP)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Quay lại Bảng Quản trị"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search, Filter & Actions Toolbar - Tinh gọn 2 hàng */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0 space-y-1.5 sm:space-y-2">
          {/* Hàng 1: Tìm kiếm + Lọc lớp + Nút làm mới từ CSDL */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <div className="relative flex-1 min-w-[150px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên học sinh, lớp..."
                className="w-full pl-8 pr-2.5 py-1 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            <div className="w-32 sm:w-44 flex-shrink-0 relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full appearance-none pl-2.5 pr-7 py-1 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="all">Tất cả lớp ({classOptions.length})</option>
                {classOptions.map((cls) => {
                  const count = students.filter(
                    (s) => (s.className || "").trim().toUpperCase() === cls
                  ).length;
                  return (
                    <option key={cls} value={cls}>
                      Lớp {cls} ({count})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={loadStudents}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors shadow-2xs text-xs flex-shrink-0"
              title="Lấy dữ liệu bài nộp mới nhất từ CSDL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              <span className="hidden sm:inline">{isLoading ? "Đang tải..." : "Lấy từ CSDL"}</span>
            </button>
          </div>

          {/* Hàng 2: Chọn tất cả + Hiện đáp án đúng + Số lượng đã chọn */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer text-xs"
            >
              {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedIds.size === filteredStudents.length && filteredStudents.length > 0
                  ? "Bỏ chọn tất cả"
                  : `Chọn tất cả (${filteredStudents.length} HS)`}
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              {/* ĐẶC QUYỀN GIÁO VIÊN: Bật/tắt hiện đáp án chuẩn */}
              <label
                className={`flex items-center gap-1.5 cursor-pointer select-none px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border transition-all text-xs font-semibold ${
                  includeCorrectAnswers
                    ? "bg-amber-100 border-amber-400 text-amber-950 shadow-2xs"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
                title="Bật/Tắt hiển thị cột đáp án chuẩn trên phiếu ảnh"
              >
                <input
                  type="checkbox"
                  checked={includeCorrectAnswers}
                  onChange={(e) => setIncludeCorrectAnswers(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                />
                <span className="text-[11px] sm:text-xs">Hiện Đ/A đúng</span>
              </label>

              <span className="text-slate-500 text-[11px] sm:text-xs">
                Đã chọn: <strong className="text-emerald-700 font-bold">{selectedCount}</strong>/{filteredStudents.length}
              </span>
            </div>
          </div>
        </div>

        {/* Student Table List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                {searchKeyword || selectedClass !== 'all'
                  ? 'Không tìm thấy học sinh nào phù hợp bộ lọc'
                  : 'Cơ sở dữ liệu chưa có bài nộp nào'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                {searchKeyword || selectedClass !== 'all'
                  ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc chọn lớp khác.'
                  : 'Hệ thống chỉ hiển thị đúng các bài nộp thực tế từ Cơ sở dữ liệu. Các bài nộp thử nghiệm cũ trên máy (sda, HIỆP, wew, dsd...) đã được dọn sạch để đảm bảo dữ liệu chuẩn xác.'}
              </p>
              <button
                onClick={loadStudents}
                disabled={isLoading}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Đang tải...' : 'Lấy lại từ Cơ sở dữ liệu'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const key = getStudentKey(student);
                const isSelected = selectedIds.has(key);

                return (
                  <div
                    key={key}
                    className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-400 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox & Student Name & Class - Luôn thấy rõ ràng đầy đủ trên mobile */}
                    <div
                      onClick={() => handleToggleSelect(key)}
                      className="flex items-start sm:items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <button
                        type="button"
                        className="text-emerald-600 flex-shrink-0 cursor-pointer mt-0.5 sm:mt-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-emerald-100 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        {/* HỌ VÀ TÊN + LỚP HỌC SINH */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                            {student.studentName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                            Lớp {student.className}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 font-mono">
                          <span>Nộp: {formatExamDateTime(student.endTime) || 'Chưa rõ'}</span>
                          <span className="hidden xs:inline">•</span>
                          <span>Thời lượng: {formatExamDuration(student.totalDuration, student.startTime, student.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score Badge & Action buttons - Tách thành hàng dưới tiện thao tác trên mobile */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0">
                      <div className="flex items-center sm:text-right gap-1.5 sm:gap-0 sm:block">
                        <span className="text-base sm:text-lg font-black text-rose-600 font-serif leading-none">
                          {String(student.totalScore).replace('.', ',')}
                          <span className="text-[10px] sm:text-xs font-normal text-slate-400 font-sans ml-0.5">/{student.maxScore || 10}đ</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium hidden sm:block">Tổng điểm</span>
                      </div>

                      {/* Action buttons per student */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewStudent(student)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer active:scale-95"
                          title="Xem trước phiếu báo cáo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>

                        <button
                          onClick={() => handleExportSingle(student)}
                          disabled={isExporting}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Tải riêng ảnh của học sinh này"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Tải ảnh</span>
                        </button>

                        {/* Delete single student button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentToDelete(student);
                          }}
                          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Xóa học sinh này khỏi danh sách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer sticky bar */}
        <div className="px-3 py-2 sm:px-6 sm:py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-600 truncate">
            <span>
              Đã chọn: <strong className="text-slate-900">{selectedCount}</strong> học sinh.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              Đóng
            </button>

            <button
              onClick={handleMainExport}
              disabled={selectedCount === 0 || isExporting}
              className={`px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                selectedCount === 0 || isExporting
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : selectedCount === 1
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-sky-500/25'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25'
              }`}
            >
              {selectedCount === 0 ? (
                <span>Chưa chọn học sinh</span>
              ) : selectedCount === 1 ? (
                <>
                  <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Tải 1 ảnh (PNG)</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Tải ZIP ({selectedCount} HS)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Overlay when mass generating / zipping */}
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-4">
              <FolderArchive className="w-7 h-7 text-emerald-300 animate-pulse" />
            </div>
            <h4 className="text-lg font-bold">Đang xử lý xuất dữ liệu...</h4>
            <p className="text-xs text-emerald-100 mt-1 max-w-sm">{exportProgress.message}</p>

            {/* Progress Bar */}
            <div className="w-64 h-3 bg-white/20 rounded-full mt-4 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-300"
                style={{
                  width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-emerald-200 mt-2">
              {exportProgress.current} / {exportProgress.total} hoàn tất
            </span>
          </div>
        )}
      </div>

      {/* Offscreen rendering container for capturing high-res card to PNG */}
      <div
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          opacity: 1,
          pointerEvents: 'none',
        }}
      >
        {capturingStudent && (
          <div ref={captureCardRef}>
            <StudentReportCard
              submission={capturingStudent}
              config={config}
              questions={questions}
              showCorrectAnswers={includeCorrectAnswers}
            />
          </div>
        )}
      </div>

      {/* Single Student Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4">
          {/* Nút mũi tên TRÁI - Học sinh trước (bên trái) */}
          {filteredStudents.length > 1 && (
            <button
              type="button"
              onClick={() => navigatePreview(prevPreviewStudent)}
              disabled={!hasPrevPreview}
              aria-label="Học sinh trước"
              className={`fixed left-1.5 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-70 w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-emerald-600 shadow-2xl border-2 border-slate-200/80 transition-all flex items-center justify-center ${
                !hasPrevPreview
                  ? 'opacity-25 cursor-not-allowed pointer-events-none'
                  : 'cursor-pointer hover:scale-110 active:scale-95 hover:border-emerald-400'
              }`}
              title={
                prevPreviewStudent
                  ? `Học sinh trước: ${prevPreviewStudent.studentName} (${prevPreviewStudent.className}) - Phím ←`
                  : 'Không có học sinh trước'
              }
            >
              <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8 stroke-[2.5]" />
            </button>
          )}

          {/* Nút mũi tên PHẢI - Học sinh kế tiếp (bên phải) */}
          {filteredStudents.length > 1 && (
            <button
              type="button"
              onClick={() => navigatePreview(nextPreviewStudent)}
              disabled={!hasNextPreview}
              aria-label="Học sinh kế tiếp"
              className={`fixed right-1.5 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-70 w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-emerald-600 shadow-2xl border-2 border-slate-200/80 transition-all flex items-center justify-center ${
                !hasNextPreview
                  ? 'opacity-25 cursor-not-allowed pointer-events-none'
                  : 'cursor-pointer hover:scale-110 active:scale-95 hover:border-emerald-400'
              }`}
              title={
                nextPreviewStudent
                  ? `Học sinh kế tiếp: ${nextPreviewStudent.studentName} (${nextPreviewStudent.className}) - Phím →`
                  : 'Không có học sinh sau'
              }
            >
              <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8 stroke-[2.5]" />
            </button>
          )}

          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 sm:px-5 sm:py-3 bg-slate-800 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-bold text-xs truncate">
                  {previewStudent.studentName} &bull; Lớp {previewStudent.className}
                </span>
              </div>

              {/* Thanh chuyển nhanh học sinh trên Header */}
              {filteredStudents.length > 1 && previewIndex !== -1 && (
                <div className="flex items-center gap-1 bg-slate-700/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-600 text-xs flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigatePreview(prevPreviewStudent)}
                    disabled={!hasPrevPreview}
                    className="p-0.5 sm:p-1 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Học sinh trước (Phím ←)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-slate-200 text-[10px] sm:text-[11px] px-0.5 sm:px-1 select-none">
                    HS <strong className="text-white font-bold">{previewIndex + 1}</strong>/{filteredStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigatePreview(nextPreviewStudent)}
                    disabled={!hasNextPreview}
                    className="p-0.5 sm:p-1 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Học sinh kế tiếp (Phím →)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                <label className="flex items-center gap-1 text-xs text-amber-200 cursor-pointer bg-slate-700 hover:bg-slate-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-600 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={includeCorrectAnswers}
                    onChange={(e) => setIncludeCorrectAnswers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer accent-amber-500"
                  />
                  <span className="font-semibold text-[10px] sm:text-xs">Hiện Đ/A</span>
                </label>
                <button
                  onClick={() => setPreviewStudent(null)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                  title="Đóng xem trước"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-100 flex justify-center">
              <div className="scale-[0.45] xs:scale-[0.6] sm:scale-[0.85] origin-top">
                <StudentReportCard
                  submission={previewStudent}
                  config={config}
                  questions={questions}
                  showCorrectAnswers={includeCorrectAnswers}
                  isTeacherMode={true}
                  onToggleEssayCorrect={async (orderNumber, isCorrect) => {
                    const updated = overrideEssayGrade(previewStudent, questions, orderNumber, isCorrect);
                    setPreviewStudent(updated);
                    const qResult = updated.questionResults?.find((q) => q.orderNumber === orderNumber);
                    const newScore = qResult !== undefined ? qResult.earnedPoints : (isCorrect ? 1 : 0);

                    const updatedList = updateSubmissionInHistory(updated);
                    setStudents(updatedList);
                    if (config.data2Url) {
                      await sendSubmissionToData2(config.data2Url, updated, {
                        isUpdate: true,
                        targetOrderNumber: orderNumber,
                        questionScore: newScore,
                        isCorrect: isCorrect,
                      });
                    }
                    setPreviewHasUnsavedChanges(false);
                    setPreviewSaveSuccess(true);
                    setTimeout(() => setPreviewSaveSuccess(false), 3500);
                  }}
                  onSaveRegradedScore={handleSavePreviewStudent}
                  hasUnsavedChanges={previewHasUnsavedChanges}
                  isSaveSuccessful={previewSaveSuccess}
                  isSaving={isPreviewSaving}
                />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng xem trước
                </button>

                {filteredStudents.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigatePreview(prevPreviewStudent)}
                      disabled={!hasPrevPreview}
                      className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
                      title="Học sinh trước (Phím ←)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigatePreview(nextPreviewStudent)}
                      disabled={!hasNextPreview}
                      className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
                      title="Học sinh sau (Phím →)"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePreviewStudent}
                  disabled={isPreviewSaving}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 ${
                    previewSaveSuccess
                      ? 'bg-emerald-600 text-white'
                      : previewHasUnsavedChanges
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                  }`}
                  title="Lưu điểm đã chấm lại vào hệ thống"
                >
                  {isPreviewSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : previewSaveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Đã lưu thành công!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu cập nhật điểm cho hs</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    handleExportSingle(previewStudent);
                    setPreviewStudent(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh này về máy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA HỌC SINH */}
      {studentToDelete && (
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
                  Thầy/cô có chắc chắn muốn xóa học sinh này khỏi danh sách báo cáo? Hành động này sẽ đồng thời xóa bài làm đã lưu trong hệ thống.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-700">
                    Họ và tên: <span className="text-sky-700 font-extrabold">{studentToDelete.studentName}</span>
                  </div>
                  <div className="text-slate-600">
                    Lớp: <span className="font-semibold text-slate-800">{studentToDelete.className || 'Chưa rõ'}</span> &bull; Điểm số:{' '}
                    <span className="font-black text-rose-600">{String(studentToDelete.totalScore).replace('.', ',')} đ</span>
                  </div>
                  {studentToDelete.endTime && (
                    <div className="text-slate-400 text-[11px]">
                      Thời gian nộp: {studentToDelete.endTime}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteSingleStudent(studentToDelete);
                  setStudentToDelete(null);
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
