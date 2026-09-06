import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  School,
  BookOpen,
  FileText,
  Calculator,
  Sliders,
  Sparkles,
  Database,
  Loader2,
  Cloud,
} from 'lucide-react';
import { ExamConfig, Question, QuestionType } from '../types';
import { normalizeAppsScriptUrl } from '../utils/syncService';
import {
  checkEssayAnswerMatch,
  parseAcceptableAnswers,
  joinAcceptableAnswers,
} from '../utils/gradeService';
import { EssayAnswerEditor } from './EssayAnswerEditor';

interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  questions: Question[];
  onSaveExam: (updatedConfig: ExamConfig, updatedQuestions: Question[]) => Promise<any> | void;
  onResetToDefault?: () => void;
}

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen,
  onClose,
  config,
  questions: initialQuestions,
  onSaveExam,
}) => {
  // Exam metadata state
  const [schoolName, setSchoolName] = useState(config.schoolName || '');
  const [examName, setExamName] = useState(config.examName || '');
  const [subject, setSubject] = useState(config.subject || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(config.durationMinutes || 15);
  const [data1Url, setData1Url] = useState(config.data1Url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null);

  // Questions state (local copy for editing)
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const questionListEndRef = useRef<HTMLDivElement>(null);

  // Reset or initialize state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSchoolName(config.schoolName || '');
      setExamName(config.examName || '');
      setSubject(config.subject || '');
      setDurationMinutes(config.durationMinutes || 15);
      setData1Url(config.data1Url || '');

      // Deep clone questions
      const cloned = initialQuestions.map((q, idx) => ({
        ...q,
        orderNumber: idx + 1,
      }));
      setQuestionList(cloned);
      setSaveSuccess(false);
      setIsSaving(false);
      setSaveStatusMsg(null);
      setValidationError(null);
    }
  }, [isOpen, config, initialQuestions]);

  // Calculate live total points
  const totalPoints = useMemo(() => {
    const sum = questionList.reduce((acc, q) => acc + (Number(q.points) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [questionList]);

  // Breakdown of question types
  const typeCounts = useMemo(() => {
    let mcCount = 0;
    let essayCount = 0;
    questionList.forEach((q) => {
      if (q.type === 'Trắc nghiệm 1 đáp án') mcCount++;
      else essayCount++;
    });
    return { mcCount, essayCount, total: questionList.length };
  }, [questionList]);

  if (!isOpen) return null;

  // Question editing handlers
  const handleUpdateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestionList((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleAddQuestion = (type: QuestionType) => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const order = questionList.length + 1;
    const defaultPoints = 0.25; // Bước điểm chuẩn 0.25đ

    const newQuestion: Question =
      type === 'Trắc nghiệm 1 đáp án'
        ? {
            id: newId,
            orderNumber: order,
            type: 'Trắc nghiệm 1 đáp án',
            content: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctAnswer: 'A',
            points: defaultPoints,
            category: 'Nhận biết',
          }
        : {
            id: newId,
            orderNumber: order,
            type: 'Tự luận',
            content: '',
            correctAnswer: '',
            points: defaultPoints,
            category: 'Vận dụng',
          };

    setQuestionList((prev) => [...prev, newQuestion]);

    // Tự động cuộn nhẹ xuống câu hỏi mới tạo
    setTimeout(() => {
      questionListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteQuestion = (id: number) => {
    if (questionList.length <= 1) {
      alert('Đề thi cần có ít nhất 1 câu hỏi!');
      return;
    }
    const filtered = questionList.filter((q) => q.id !== id);
    // Re-index order numbers
    const reordered = filtered.map((q, idx) => ({
      ...q,
      orderNumber: idx + 1,
    }));
    setQuestionList(reordered);
  };

  const handleDuplicateQuestion = (id: number) => {
    const targetIdx = questionList.findIndex((q) => q.id === id);
    if (targetIdx === -1) return;
    const target = questionList[targetIdx];
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const duplicated: Question = {
      ...target,
      id: newId,
      content: `${target.content} (Bản sao)`,
    };

    const updated = [...questionList];
    updated.splice(targetIdx + 1, 0, duplicated);
    const reordered = updated.map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestionList(reordered);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...questionList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestionList(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === questionList.length - 1) return;
    const updated = [...questionList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestionList(reordered);
  };

  // Auto balance points to exactly 10.0
  const handleAutoBalancePoints = () => {
    if (questionList.length === 0) return;
    const count = questionList.length;
    const basePoint = Math.floor((10 / count) * 100) / 100;
    const remainder = Math.round((10 - basePoint * count) * 100) / 100;

    const balanced = questionList.map((q, idx) => {
      // Add remainder to the last question so sum is exactly 10
      const pts = idx === count - 1 ? Math.round((basePoint + remainder) * 100) / 100 : basePoint;
      return {
        ...q,
        points: pts,
      };
    });

    setQuestionList(balanced);
  };

  // Save changes
  const handleSave = async () => {
    setValidationError(null);

    // 1. Validation
    if (!schoolName.trim()) {
      setValidationError('Vui lòng nhập Tên trường.');
      return;
    }
    if (!subject.trim()) {
      setValidationError('Vui lòng nhập Môn học.');
      return;
    }
    if (!examName.trim()) {
      setValidationError('Vui lòng nhập Tên kỳ kiểm tra.');
      return;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setValidationError('Thời gian làm bài phải lớn hơn 0 phút.');
      return;
    }
    if (questionList.length === 0) {
      setValidationError('Đề thi phải có ít nhất 1 câu hỏi.');
      return;
    }

    // Check empty questions
    for (let i = 0; i < questionList.length; i++) {
      const q = questionList[i];
      if (!q.content.trim()) {
        setValidationError(`Câu số ${i + 1} chưa có nội dung câu hỏi.`);
        return;
      }
      if (q.type === 'Trắc nghiệm 1 đáp án') {
        if (!q.optionA?.trim() || !q.optionB?.trim() || !q.optionC?.trim() || !q.optionD?.trim()) {
          setValidationError(`Câu số ${i + 1} (Trắc nghiệm) chưa điền đủ 4 phương án A, B, C, D.`);
          return;
        }
        if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer.trim().toUpperCase())) {
          setValidationError(`Câu số ${i + 1} chưa chọn đáp án đúng (A, B, C hoặc D).`);
          return;
        }
      } else {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          setValidationError(`Câu số ${i + 1} (Tự luận) chưa nhập đáp án đúng/từ khóa.`);
          return;
        }
      }
      if (q.points <= 0) {
        setValidationError(`Câu số ${i + 1} phải có số điểm lớn hơn 0.`);
        return;
      }
    }

    const updatedConfig: ExamConfig = {
      ...config,
      schoolName: schoolName.trim(),
      examName: examName.trim(),
      subject: subject.trim(),
      durationMinutes: Number(durationMinutes),
      data1Url: normalizeAppsScriptUrl(data1Url),
    };

    // Normalize orderNumbers and essay answer format (đáp án 1 / đáp án 2 / ...)
    const normalizedQuestions = questionList.map((q, idx) => ({
      ...q,
      orderNumber: idx + 1,
      correctAnswer:
        q.type === 'Trắc nghiệm 1 đáp án'
          ? q.correctAnswer.trim().toUpperCase()
          : joinAcceptableAnswers(parseAcceptableAnswers(q.correctAnswer)),
    }));

    setIsSaving(true);
    try {
      await onSaveExam(updatedConfig, normalizedQuestions);
      setSaveSuccess(true);
      setSaveStatusMsg(
        updatedConfig.data1Url
          ? `Đã lưu và đồng bộ ${normalizedQuestions.length} câu hỏi lên Google Sheets!`
          : `Đã lưu ${normalizedQuestions.length} câu hỏi vào hệ thống đề thi!`
      );
      setTimeout(() => {
        setSaveSuccess(false);
        setSaveStatusMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      setValidationError('Có lỗi khi lưu đề thi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-800 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-semibold w-fit mb-2">
            <Sliders className="w-3.5 h-3.5 text-amber-300" />
            <span>Phân Hệ Quản Trị Đề Thi & Ngân Hàng Câu Hỏi</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Tạo & Chỉnh Sửa Đề Thi Trực Tiếp
          </h3>
          <p className="text-sky-100 text-xs sm:text-sm mt-0.5">
            Thay đổi thông tin kỳ thi, thêm/bớt câu hỏi, chọn hình thức trắc nghiệm hoặc tự luận và định lượng thang điểm.
          </p>
        </div>

        {/* Live Score Sticky Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-md">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tổng điểm đề:</span>
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  totalPoints === 10
                    ? 'text-emerald-400'
                    : totalPoints > 10
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {totalPoints}
                <span className="text-sm font-normal text-slate-400 ml-1">/ 10.0 đ</span>
              </span>
            </div>

            {/* Status Pill */}
            {totalPoints === 10 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Chuẩn thang 10 điểm
              </span>
            ) : totalPoints < 10 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Còn thiếu {Math.round((10 - totalPoints) * 100) / 100} đ để tròn 10đ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Vượt quá {Math.round((totalPoints - 10) * 100) / 100} đ so với thang 10đ
              </span>
            )}

            <div className="text-xs text-slate-300 hidden md:block">
              (Gồm: <strong className="text-white">{typeCounts.total} câu</strong> — {typeCounts.mcCount} trắc nghiệm, {typeCounts.essayCount} tự luận)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoBalancePoints}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Tự động chia đều 10 điểm cho tất cả câu hỏi hiện tại"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chia đều 10 điểm</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {/* Validation Alert */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Không thể lưu đề thi:</strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* BANNER: ĐẢM BẢO LƯU TRỮ VÀ ĐỒNG BỘ */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border border-sky-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-sky-600/20 mt-0.5">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-800">
                      Bộ Lưu Trữ Dữ Liệu Đề Thi
                    </h4>
                    {data1Url ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                        <Cloud className="w-3 h-3 text-emerald-600" />
                        Đang kết nối Google Sheets
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-medium border border-sky-300">
                        <Database className="w-3 h-3 text-sky-600" />
                        Lưu trữ an toàn vào hệ thống
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Mọi thao tác thay đổi thông tin bài thi, thêm / bớt câu hỏi, sửa đáp án và phân bổ thang điểm đều được đảm bảo lưu trữ an toàn và đồng bộ.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: EXAM METADATA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <School className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                1. Thông tin chung bài kiểm tra
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              {/* Trường */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Trường:
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="TRƯỜNG THCS VÕ VĂN KIỆT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800"
                />
              </div>

              {/* Môn thi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Môn Học:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="TIN HỌC 6"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800"
                />
              </div>

              {/* Kỳ kiểm tra */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Kỳ Kiểm Tra:
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="KIỂM TRA THƯỜNG XUYÊN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800"
                />
              </div>

              {/* Thời gian làm bài */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Thời Gian Làm Bài (Phút):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                    className="w-20 px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-bold text-slate-800 text-center"
                  />
                  {/* Quick buttons */}
                  <div className="flex items-center gap-1">
                    {[15, 20, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          durationMinutes === mins
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: QUESTIONS LIST */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  2. Ngân hàng câu hỏi ({questionList.length} câu)
                </h4>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-xl border border-amber-200 font-semibold">
                  <span>Bước điểm chuẩn:</span>
                  <strong className="font-mono font-bold text-amber-800">0,25đ</strong>
                </span>
              </div>
            </div>

            {/* Questions cards */}
            <div className="space-y-4">
              {questionList.map((q, index) => {
                const isMC = q.type === 'Trắc nghiệm 1 đáp án';

                return (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-300 transition-all shadow-xs space-y-3.5"
                  >
                    {/* Question Header Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Order badge */}
                        <span className="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 font-mono font-black text-xs">
                          CÂU {q.orderNumber || index + 1}
                        </span>

                        {/* Question Type selector */}
                        <select
                          value={q.type}
                          onChange={(e) =>
                            handleUpdateQuestion(q.id, {
                              type: e.target.value as QuestionType,
                              // If switching to MC, default options
                              ...(e.target.value === 'Trắc nghiệm 1 đáp án'
                                ? {
                                    optionA: q.optionA || '',
                                    optionB: q.optionB || '',
                                    optionC: q.optionC || '',
                                    optionD: q.optionD || '',
                                    correctAnswer: ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
                                      ? q.correctAnswer
                                      : 'A',
                                  }
                                : {
                                    correctAnswer: ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
                                      ? ''
                                      : (q.correctAnswer || ''),
                                  }),
                            })
                          }
                          className="px-2.5 py-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="Trắc nghiệm 1 đáp án">Trắc nghiệm 1 đáp án (A, B, C, D)</option>
                          <option value="Tự luận">Tự luận / Điền số & từ khóa</option>
                        </select>

                        {/* Category tag */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400 text-[11px]">Phân loại:</span>
                          <input
                            type="text"
                            value={q.category || ''}
                            onChange={(e) => handleUpdateQuestion(q.id, { category: e.target.value })}
                            placeholder="Nhận biết / Thông hiểu / Vận dụng"
                            className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs w-36 text-slate-700 font-medium"
                          />
                        </div>
                      </div>

                      {/* Right controls: Points & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Points input with 0.25 step & +/- buttons */}
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200 shadow-2xs">
                          <label className="text-xs font-bold text-amber-900 select-none">Điểm:</label>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuestion(q.id, {
                                points: Math.max(0, Math.round(((q.points || 0) - 0.25) * 100) / 100),
                              })
                            }
                            className="w-5 h-5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors active:scale-90 select-none"
                            title="Giảm 0,25 điểm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="10"
                            value={q.points}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateQuestion(q.id, {
                                points: isNaN(val) ? 0 : Math.max(0, Math.round(val * 100) / 100),
                              });
                            }}
                            className="w-13 px-1 py-0.5 rounded border border-amber-300 bg-white text-center font-mono font-bold text-amber-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuestion(q.id, {
                                points: Math.min(10, Math.round(((q.points || 0) + 0.25) * 100) / 100),
                              })
                            }
                            className="w-5 h-5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors active:scale-90 select-none"
                            title="Tăng 0,25 điểm"
                          >
                            +
                          </button>
                          <span className="text-[11px] font-bold text-amber-800 select-none">đ</span>
                        </div>

                        {/* Nút chọn nhanh điểm theo bước 0,25 */}
                        <div className="hidden sm:flex items-center gap-0.5 bg-amber-50/80 p-0.5 rounded-lg border border-amber-200/70">
                          {[0.25, 0.5, 0.75, 1.0].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateQuestion(q.id, { points: preset })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                q.points === preset
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'text-amber-900 hover:bg-amber-200/60'
                              }`}
                              title={`Chọn nhanh ${preset} điểm`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors cursor-pointer"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === questionList.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors cursor-pointer"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Nhân bản câu hỏi này"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nội dung câu hỏi:
                      </label>
                      <textarea
                        rows={2}
                        value={q.content}
                        onChange={(e) => handleUpdateQuestion(q.id, { content: e.target.value })}
                        placeholder="Nhập nội dung câu hỏi..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {/* MC Options or Essay Input */}
                    {isMC ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-700">
                            Các phương án lựa chọn (Chọn tròn radio để đặt đáp án đúng):
                          </label>
                          <span className="text-[11px] text-emerald-700 font-bold">
                            Đáp án đúng hiện tại: {q.correctAnswer}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                            const optKey = `option${opt}` as keyof Question;
                            const isSelectedCorrect = q.correctAnswer.toUpperCase() === opt;

                            return (
                              <div
                                key={opt}
                                className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                                  isSelectedCorrect
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-slate-50/50 focus-within:border-sky-400'
                                }`}
                              >
                                <label
                                  className="flex items-center gap-1.5 cursor-pointer select-none"
                                  title={`Chọn ${opt} làm đáp án đúng`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={isSelectedCorrect}
                                    onChange={() => handleUpdateQuestion(q.id, { correctAnswer: opt })}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                                      isSelectedCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={(q[optKey] as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateQuestion(q.id, { [optKey]: e.target.value })
                                  }
                                  placeholder={`Nội dung phương án ${opt}...`}
                                  className="flex-1 px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Essay Correct Answer Input with synonyms / alternate answers */
                      <EssayAnswerEditor
                        questionId={q.id}
                        value={q.correctAnswer}
                        onChange={(newAnswerString) =>
                          handleUpdateQuestion(q.id, { correctAnswer: newAnswerString })
                        }
                      />
                    )}

                    {/* Optional explanation */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        Giải thích / Hướng dẫn giải ngắn (tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Nhập giải thích vì sao đáp án này đúng..."
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2 Nút thêm câu hỏi chuyển xuống dưới cùng theo yêu cầu */}
            <div
              ref={questionListEndRef}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/40 to-slate-50 border-2 border-dashed border-sky-300 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div>
                <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Thêm câu hỏi mới vào cuối đề thi</span>
                </h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bước điểm quy chuẩn là <strong className="text-amber-800">0,25đ</strong>. Bấm nút bên dưới để thêm câu hỏi vào cuối đề:
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-center w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('Trắc nghiệm 1 đáp án')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Trắc Nghiệm (4 lựa chọn)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('Tự luận')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Tự Luận / Điền Số</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Tổng số câu: <strong className="text-slate-800">{questionList.length} câu</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">
              Tổng điểm: <strong className={totalPoints === 10 ? 'text-emerald-700' : 'text-amber-700'}>{totalPoints} / 10đ</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Đang lưu đề thi...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{saveStatusMsg || 'Đã lưu đề thi thành công!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu & Áp Dụng Đề Thi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
