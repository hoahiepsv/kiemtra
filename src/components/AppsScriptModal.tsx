import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  X,
  ExternalLink,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { APPS_SCRIPT_DATA1, APPS_SCRIPT_DATA2, APPS_SCRIPT_COMBINED } from '../utils/appsScriptCode';
import { ExamConfig } from '../types';
import { normalizeAppsScriptUrl } from '../utils/syncService';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  onSaveConfig: (updated: Partial<ExamConfig>) => void;
  onReloadFromData1: () => Promise<void>;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onReloadFromData1,
}) => {
  const [activeTab, setActiveTab] = useState<'combined' | 'data1' | 'data2' | 'urls'>('combined');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  // Local inputs for URLs
  const [data1Url, setData1Url] = useState(config.data1Url || '');
  const [data2Url, setData2Url] = useState(config.data2Url || '');
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [examName, setExamName] = useState(config.examName);
  const [subject, setSubject] = useState(config.subject);
  const [durationMinutes, setDurationMinutes] = useState(config.durationMinutes);

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (code: string, tabName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2500);
  };

  const handleSaveUrls = () => {
    const formattedData1Url = normalizeAppsScriptUrl(data1Url);
    const formattedData2Url = normalizeAppsScriptUrl(data2Url);
    setData1Url(formattedData1Url);
    setData2Url(formattedData2Url);

    onSaveConfig({
      data1Url: formattedData1Url,
      data2Url: formattedData2Url,
      schoolName,
      examName,
      subject,
      durationMinutes: Number(durationMinutes) || 15,
    });
    setTestStatus('Đã lưu cấu hình thành công!');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const formattedData1Url = normalizeAppsScriptUrl(data1Url);
    const formattedData2Url = normalizeAppsScriptUrl(data2Url);
    setData1Url(formattedData1Url);
    setData2Url(formattedData2Url);

    try {
      if (!formattedData1Url && !formattedData2Url) {
        setTestStatus('Vui lòng nhập ít nhất một đường dẫn hoặc ID Web App Google Sheets.');
        setIsTesting(false);
        return;
      }
      if (formattedData1Url) {
        await onReloadFromData1();
      }
      setTestStatus('Kết nối thành công! Đã đồng bộ dữ liệu với Google Sheets.');
    } catch (e) {
      setTestStatus('Lỗi kết nối: ' + (e instanceof Error ? e.message : 'Vui lòng kiểm tra lại quyền truy cập Anyone trên Apps Script.'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Thu gọn & Xoá chú thích */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 px-3 py-2 sm:px-6 sm:py-3.5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-sky-100" />
            </div>
            <h3 className="font-extrabold text-xs sm:text-base tracking-tight truncate">
              Bộ Mã Google Apps Script & Kết Nối CSDL
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer flex-shrink-0"
            title="Quay lại Bảng Quản trị"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-sky-50/70 border-b border-sky-100 px-2 py-1.5 sm:px-6 sm:py-2 flex flex-wrap gap-1 sm:gap-2 text-[11px] sm:text-xs">
          <button
            onClick={() => setActiveTab('combined')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'combined'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-sky-100/70 border border-slate-200'
            }`}
          >
            ★ 1. Mã Gộp Cả 2 Sheet (Khuyên Dùng)
          </button>

          <button
            onClick={() => setActiveTab('data1')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'data1'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-sky-100/70 border border-slate-200'
            }`}
          >
            2. Mã riêng Data1 (Đề thi)
          </button>

          <button
            onClick={() => setActiveTab('data2')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'data2'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-sky-100/70 border border-slate-200'
            }`}
          >
            3. Mã riêng Data2 (Kết quả)
          </button>

          <button
            onClick={() => setActiveTab('urls')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'urls'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-sky-100/70 border border-slate-200'
            }`}
          >
            4. Nhập Link Web App & CSDL
          </button>
        </div>

        {/* Content Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: DATA1 SCRIPT */}
          {activeTab === 'data1' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 p-4 rounded-xl border border-sky-100">
                <div>
                  <h4 className="font-bold text-sm text-sky-900">
                    Google Apps Script cho Sheet Data1 (Đọc & Ghi Lưu Đề Thi)
                  </h4>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Hỗ trợ 2 chiều: Đọc tải đề thi (doGet) và Tự động ghi lưu cập nhật nội dung thêm/bớt/sửa câu hỏi và thang điểm vào Google Sheets data1 (doPost).
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(APPS_SCRIPT_DATA1, 'data1')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex-shrink-0 active:scale-95"
                >
                  {copiedTab === 'data1' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép mã!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép mã Data1</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code display */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800">
                  {APPS_SCRIPT_DATA1}
                </pre>
              </div>

              {/* Instructions steps */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h5 className="font-bold text-slate-800">Cách chèn vào Google Sheets Data1:</h5>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Mở file Google Sheet <strong>data1</strong> chứa câu hỏi đề thi của thầy/cô.</li>
                  <li>Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; chọn <strong>Apps Script</strong>.</li>
                  <li>Dán toàn bộ đoạn mã trên vào, nhấn nút <strong>Lưu</strong> (Ctrl + S).</li>
                  <li>Nhấn <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong>.</li>
                  <li>Chọn loại <strong>Ứng dụng web (Web App)</strong>, đặt Ai có quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong>.</li>
                  <li>Sao chép đường dẫn Web App URL nhận được và dán vào tab <strong>"Nhập Link Web App"</strong> của ứng dụng này!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: DATA2 SCRIPT */}
          {activeTab === 'data2' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 p-4 rounded-xl border border-sky-100">
                <div>
                  <h4 className="font-bold text-sm text-sky-900">
                    Google Apps Script cho Sheet Data2 (Lưu kết quả & Bảng xếp hạng)
                  </h4>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Tự động nhận bài nộp của học sinh, ghi vào các cột: STT, TÊN HỌC SINH, LỚP, TỔNG ĐIỂM, ĐIỂM TỪNG CÂU, BẮT ĐẦU, NỘP BÀI, TỔNG THỜI GIAN, IP HỌC SINH (Cột 9).
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                    <span>★ Hỗ trợ sửa điểm: Tự động lưu đè số điểm mới vào đúng ô cột Tổng điểm của học sinh (không tạo thêm dòng mới)!</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(APPS_SCRIPT_DATA2, 'data2')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex-shrink-0 active:scale-95"
                >
                  {copiedTab === 'data2' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép mã!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép mã Data2</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code display */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800">
                  {APPS_SCRIPT_DATA2}
                </pre>
              </div>

              {/* Instructions steps */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h5 className="font-bold text-slate-800">Cách chèn vào Google Sheets Data2:</h5>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Mở file Google Sheet <strong>data2</strong> để lưu kết quả. Dòng 1 ghi tiêu đề các cột: STT, TÊN HỌC SINH, LỚP, TỔNG ĐIỂM, ĐIỂM TỪNG CÂU, THỜI GIAN HS BẮT ĐẦU, THỜI GIAN HS NỘP BÀI, TỔNG THỜI GIAN, IP HỌC SINH (Cột 9).</li>
                  <li>Vào <strong>Tiện ích mở rộng</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Dán mã trên vào, bấm <strong>Lưu (Ctrl+S)</strong>.</li>
                  <li>
                    <strong>Quan trọng để cập nhật tính năng Sửa Điểm Không Tạo Dòng Mới:</strong><br />
                    Vào <strong>Triển khai (Deploy)</strong> &gt; <strong>Quản lý bản triển khai (Manage deployments)</strong> &gt; bấm biểu tượng <strong>Cây bút (Chỉnh sửa)</strong> &gt; ở ô Phiên bản chọn <strong>Phiên bản mới (New version)</strong> &gt; nhấn <strong>Triển khai (Deploy)</strong>.
                  </li>
                  <li>Dán URL vào ô cấu hình bên dưới. Mỗi khi giáo viên sửa điểm câu tự luận, hệ thống sẽ tự động thay thế ô điểm của học sinh đó mà không tạo thêm dòng mới!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: ALL IN ONE COMBINED SCRIPT */}
          {activeTab === 'combined' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 p-4 rounded-xl border border-sky-100">
                <div>
                  <h4 className="font-bold text-sm text-sky-900">
                    Mã gộp All-In-One (Dành cho 1 file Sheets có 2 tab 'data1' và 'data2')
                  </h4>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Chỉ cần triển khai 1 lần duy nhất cho cả đề thi và lưu kết quả.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(APPS_SCRIPT_COMBINED, 'combined')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex-shrink-0 active:scale-95"
                >
                  {copiedTab === 'combined' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép mã gộp</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800">
                  {APPS_SCRIPT_COMBINED}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: URL CONFIGURATION & APP METADATA */}
          {activeTab === 'urls' && (
            <div className="space-y-5">
              <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100">
                <h4 className="font-bold text-sm text-sky-900">
                  Cấu hình đường dẫn kết nối Google Sheets Web Apps
                </h4>
                <p className="text-slate-600 text-xs mt-0.5">
                  Dán đường dẫn Web App URL sau khi bạn đã Triển khai Apps Script ở trên.
                </p>
              </div>

              {testStatus && (
                <div className="p-3 rounded-xl bg-sky-100 border border-sky-300 text-sky-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-700 flex-shrink-0" />
                  <span>{testStatus}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Link Web App Google Sheets Data1 (Nội dung đề thi):
                  </label>
                  <input
                    type="url"
                    value={data1Url}
                    onChange={(e) => setData1Url(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    (Để trống sẽ dùng đề thi mẫu chuẩn 13 câu THCS Võ Văn Kiệt được tích hợp sẵn)
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Link Web App Google Sheets Data2 (Lưu kết quả học sinh):
                  </label>
                  <input
                    type="url"
                    value={data2Url}
                    onChange={(e) => setData2Url(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    (Khi học sinh nộp bài, hệ thống sẽ tự động gửi và ghi điểm vào Google Sheet này)
                  </span>
                </div>

                {/* Additional exam parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên trường học:
                    </label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên kỳ kiểm tra:
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Môn học:
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời gian làm bài (phút):
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value) || 15)}
                      min={1}
                      max={180}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    onClick={handleSaveUrls}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình</span>
                  </button>

                  <button
                    disabled={isTesting}
                    onClick={handleTestConnection}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Data1'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Bản quyền: <strong>{config.copyrightText}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
