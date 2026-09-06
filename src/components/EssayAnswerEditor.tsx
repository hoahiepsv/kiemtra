import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { parseAcceptableAnswers, joinAcceptableAnswers } from '../utils/gradeService';

interface EssayAnswerEditorProps {
  questionId: number;
  value: string;
  onChange: (newValue: string) => void;
}

export const EssayAnswerEditor: React.FC<EssayAnswerEditorProps> = ({
  questionId,
  value,
  onChange,
}) => {
  // Tách chuỗi thành mảng các đáp án chấp nhận được
  const [answers, setAnswers] = useState<string[]>(() => {
    const parsed = parseAcceptableAnswers(value);
    return parsed.length > 0 ? parsed : [''];
  });

  // Đồng bộ khi value bên ngoài thay đổi (VD: khi tải lại hoặc đổi câu hỏi)
  useEffect(() => {
    const parsed = parseAcceptableAnswers(value);
    const initialList = parsed.length > 0 ? parsed : [''];
    setAnswers((prev) => {
      // Nếu số lượng và nội dung giống nhau thì không cập nhật lại tránh mất focus khi gõ
      if (prev.length === initialList.length && prev.every((item, idx) => item === initialList[idx])) {
        return prev;
      }
      return initialList;
    });
  }, [value, questionId]);

  // Cập nhật giá trị của một đáp án
  const handleItemChange = (index: number, text: string) => {
    const updated = [...answers];
    updated[index] = text;
    setAnswers(updated);
    onChange(joinAcceptableAnswers(updated));
  };

  // Thêm một đáp án tương tự mới
  const handleAddAlternate = () => {
    const updated = [...answers, ''];
    setAnswers(updated);
  };

  // Xóa một đáp án tương tự
  const handleRemoveAlternate = (index: number) => {
    if (answers.length <= 1) {
      // Nếu chỉ có 1 ô, làm rỗng chứ không xóa
      const updated = [''];
      setAnswers(updated);
      onChange('');
      return;
    }
    const updated = answers.filter((_, idx) => idx !== index);
    setAnswers(updated);
    onChange(joinAcceptableAnswers(updated));
  };

  // Chuỗi xem trước lưu vào data1
  const previewData1String = joinAcceptableAnswers(answers) || (answers[0]?.trim() || '');

  return (
    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-700" />
          <label className="font-bold text-indigo-950 text-xs">
            Thiết lập đáp án đúng & Các từ đồng nghĩa / Cách viết tương đương:
          </label>
        </div>
        <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-100/90 px-2.5 py-0.5 rounded-full border border-indigo-200">
          Lưu data1 dạng: <strong>đáp án 1 / đáp án 2 / ...</strong>
        </span>
      </div>

      {/* Danh sách các đáp án chấp nhận được */}
      <div className="space-y-2">
        {answers.map((ans, idx) => {
          const isPrimary = idx === 0;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                isPrimary
                  ? 'bg-white border-indigo-300 shadow-2xs'
                  : 'bg-white/90 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {/* Badge nhãn */}
              <div className="flex items-center gap-1 min-w-[130px] flex-shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isPrimary
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  {isPrimary ? 'Đáp án chính:' : `Từ đồng nghĩa ${idx}:`}
                </span>
              </div>

              {/* Input nội dung đáp án */}
              <input
                type="text"
                value={ans}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                placeholder={
                  isPrimary
                    ? 'Ví dụ: Thủ đô Hà Nội hoặc 1000 hoặc CPU'
                    : 'Ví dụ từ đồng nghĩa: TP Hà Nội hoặc Hà Nội hoặc 1.000...'
                }
                className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />

              {/* Nút xóa phương án tương tự */}
              {!isPrimary && (
                <button
                  type="button"
                  onClick={() => handleRemoveAlternate(idx)}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Xóa đáp án tương tự này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Nút thêm đáp án tương tự */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleAddAlternate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Thêm đáp án tương tự (Từ đồng nghĩa)</span>
        </button>

        <span className="text-[11px] text-slate-500">
          Hiện có <strong>{answers.filter((a) => a.trim()).length}</strong> đáp án được công nhận đúng
        </span>
      </div>

      {/* Preview chuỗi lưu trong Google Sheets data1 */}
      <div className="p-2.5 rounded-lg bg-indigo-100/60 border border-indigo-200 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
          <span>Dữ liệu lưu vào Google Sheets data1 (Cột H):</span>
        </div>
        <div className="px-2.5 py-1 bg-white rounded border border-indigo-200 font-mono text-[11px] font-bold text-indigo-900 break-all select-all">
          {previewData1String ? previewData1String : <span className="text-slate-400 font-normal italic">Chưa nhập đáp án</span>}
        </div>
        <p className="text-[10px] text-indigo-800 leading-normal pt-0.5">
          ✨ <strong>Quy tắc chấm:</strong> Học sinh gõ <strong>bất kỳ 1 trong các đáp án</strong> trên đều được tính điểm tối đa. Hệ thống tự động không phân biệt chữ hoa/thường, khoảng trắng thừa hay dấu tiếng Việt.
        </p>
      </div>
    </div>
  );
};
