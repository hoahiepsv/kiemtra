import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { SubmissionRecord, ExamConfig, Question } from '../types';
import { getSubmissionHistory } from '../utils/syncService';
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
const SAMPLE_STUDENTS: SubmissionRecord[] = [
  {
    stt: 1,
    studentName: 'Nguyễn Văn An',
    className: '6A',
    totalScore: 10,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1 10:1',
    startTime: '8:00 04/09/2026',
    endTime: '8:14 04/09/2026',
    totalDuration: '00:14',
    timestamp: Date.now() - 3600000 * 2,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 2,
    studentName: 'Trần Thị Mai',
    className: '6A',
    totalScore: 9,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:0 10:1',
    startTime: '8:02 04/09/2026',
    endTime: '8:15 04/09/2026',
    totalDuration: '00:13',
    timestamp: Date.now() - 3600000 * 3,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 3,
    studentName: 'Lê Quốc Bảo',
    className: '6B',
    totalScore: 8.5,
    maxScore: 10,
    scoreString: '1:1 2:1 3:1 4:0.5 5:1 6:1 7:1 8:1 9:1 10:1',
    startTime: '8:05 04/09/2026',
    endTime: '8:18 04/09/2026',
    totalDuration: '00:13',
    timestamp: Date.now() - 3600000 * 4,
    syncedToData2: true,
    questionResults: [],
  },
  {
    stt: 4,
    studentName: 'Phạm Thuỳ Linh',
    className: '6B',
    totalScore: 7.5,
    maxScore: 10,
    scoreString: '1:1 2:1 3:0 4:1 5:1 6:1 7:0.5 8:1 9:1 10:0',
    startTime: '8:10 04/09/2026',
    endTime: '8:24 04/09/2026',
    totalDuration: '00:14',
    timestamp: Date.now() - 3600000 * 5,
    syncedToData2: true,
    questionResults: [],
  },
];

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

    // 1. Try to fetch from Google Sheets data2 if URL is set
    if (config.data2Url && config.data2Url.trim()) {
      try {
        const res = await fetch(config.data2Url.trim());
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            loadedList = json.data.map((item: any, idx: number) => {
              const rawStart = item.startTime || (item.totalDuration && typeof item.totalDuration === 'string' && item.totalDuration.includes('T') ? item.totalDuration : '');
              const sTime = formatExamDateTime(rawStart);
              const eTime = formatExamDateTime(item.endTime);
              const dur = formatExamDuration(item.totalDuration, sTime, eTime);
              return {
                stt: item.stt || idx + 1,
                studentName: item.studentName || item.name || `Học sinh ${idx + 1}`,
                className: item.className || item.class || '6A',
                totalScore: Number(item.totalScore) || 0,
                maxScore: 10,
                scoreString: item.scoreString || '',
                startTime: sTime,
                endTime: eTime,
                totalDuration: dur,
                ipAddress: item.ipAddress || '',
                timestamp: Date.now() - idx * 1000,
                syncedToData2: true,
                questionResults: [],
              };
            });
            setLoadSource('sheet');
          }
        }
      } catch (err) {
        console.warn('Cannot fetch from Google Sheet data2:', err);
      }
    }

    // 2. If no data from sheet, merge with local storage submissions
    const localList = getSubmissionHistory();
    if (loadedList.length === 0 && localList.length > 0) {
      loadedList = localList;
      setLoadSource('local');
    } else if (loadedList.length > 0 && localList.length > 0) {
      // Merge unique by studentName + className
      const existingKey = new Set(loadedList.map((s) => `${s.studentName}_${s.className}`));
      for (const loc of localList) {
        if (!existingKey.has(`${loc.studentName}_${loc.className}`)) {
          loadedList.push(loc);
        }
      }
    }

    // 3. If still empty, use realistic sample data so teacher can test export immediately
    if (loadedList.length === 0) {
      loadedList = SAMPLE_STUDENTS;
      setLoadSource('sample');
    }

    setStudents(loadedList);
    // Auto select all by default
    const allKeys = new Set(loadedList.map((s) => getStudentKey(s)));
    setSelectedIds(allKeys);
    setIsLoading(false);
  };

  const getStudentKey = (s: SubmissionRecord) => `${s.stt}_${s.studentName}_${s.className}`;

  // Filtered students list
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.studentName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      s.className.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchClass = selectedClass === 'all' || s.className === selectedClass;
    return matchSearch && matchClass;
  });

  // Unique classes for filter
  const classOptions = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] max-h-[800px] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FolderArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Xuất Báo Cáo Học Sinh Dạng File Ảnh
              </h3>
              <p className="text-emerald-100 text-xs">
                Mỗi học sinh 1 file ảnh (PNG). Chọn nhiều học sinh hệ thống sẽ tự động đóng gói file ZIP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source info & Search / Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex-shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Nguồn dữ liệu:</span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                {loadSource === 'sheet'
                  ? 'Google Sheets (data2)'
                  : loadSource === 'local'
                  ? 'Lịch sử nộp bài trên thiết bị'
                  : 'Dữ liệu mẫu thử nghiệm'}
              </span>
            </div>

            <button
              onClick={loadStudents}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              <span>{isLoading ? 'Đang tải...' : 'Làm mới danh sách'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm học sinh theo họ tên hoặc lớp..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Class filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full py-2 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-medium"
              >
                <option value="all">Tất cả các lớp ({students.length})</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    Lớp {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection counter & bulk actions */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedIds.size === filteredStudents.length && filteredStudents.length > 0
                  ? 'Bỏ chọn tất cả'
                  : `Chọn tất cả (${filteredStudents.length} học sinh)`}
              </span>
            </button>

            <span className="font-medium text-slate-600">
              Đã chọn: <strong className="text-emerald-700 font-bold">{selectedCount}</strong> /{' '}
              {filteredStudents.length} học sinh
            </span>
          </div>
        </div>

        {/* Student Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-medium">Không tìm thấy học sinh nào phù hợp bộ lọc.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const key = getStudentKey(student);
                const isSelected = selectedIds.has(key);

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox & Student Name */}
                    <div
                      onClick={() => handleToggleSelect(key)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <button
                        type="button"
                        className="text-emerald-600 flex-shrink-0 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-emerald-100 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 truncate">
                            {student.studentName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {student.className}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-mono">
                          <span>Bắt đầu: {formatExamDateTime(student.startTime || (student.totalDuration?.includes('T') ? student.totalDuration : '')) || '17:02'}</span>
                          <span>Nộp: {formatExamDateTime(student.endTime) || '17:04'}</span>
                          <span>Thời lượng: {formatExamDuration(student.totalDuration, student.startTime, student.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-sky-900 block leading-none">
                          {student.totalScore}
                          <span className="text-xs font-normal text-slate-400">/{student.maxScore || 10}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Tổng điểm</span>
                      </div>

                      {/* Action buttons per student */}
                      <button
                        onClick={() => setPreviewStudent(student)}
                        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-sky-600 border border-slate-200 transition-colors cursor-pointer"
                        title="Xem trước phiếu báo cáo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportSingle(student)}
                        disabled={isExporting}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors cursor-pointer"
                        title="Tải riêng ảnh của học sinh này"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tải ảnh</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-600">
            <span>
              Đã chọn: <strong className="text-slate-900">{selectedCount}</strong> học sinh.
            </span>{' '}
            {selectedCount > 1 && (
              <span className="text-emerald-700 font-semibold">
                Sẽ tự động nén thành 1 file ZIP duy nhất chứa toàn bộ {selectedCount} ảnh.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              Đóng
            </button>

            <button
              onClick={handleMainExport}
              disabled={selectedCount === 0 || isExporting}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
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
                  <ImageIcon className="w-4 h-4" />
                  <span>Tải 1 ảnh báo cáo (PNG)</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>Tải file nén ZIP ({selectedCount} học sinh)</span>
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
            />
          </div>
        )}
      </div>

      {/* Single Student Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Xem trước ảnh phiếu báo cáo: {previewStudent.studentName} ({previewStudent.className})</span>
              </div>
              <button
                onClick={() => setPreviewStudent(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
              <div className="scale-[0.85] origin-top">
                <StudentReportCard
                  submission={previewStudent}
                  config={config}
                  questions={questions}
                />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPreviewStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Đóng xem trước
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
      )}
    </div>
  );
};
