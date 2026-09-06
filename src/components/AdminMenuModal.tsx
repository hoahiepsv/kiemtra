import React from 'react';
import { X, FileCode2, FileSpreadsheet, ArrowRight, ShieldCheck, FolderArchive, FileEdit, Lock } from 'lucide-react';
import { AdminAuthSession } from '../types';

interface AdminMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: AdminAuthSession | null;
  onSelectAppsScript: () => void;
  onSelectExportImage: () => void;
  onSelectExportExcel: () => void;
  onSelectExamEditor: () => void;
}

export const AdminMenuModal: React.FC<AdminMenuModalProps> = ({
  isOpen,
  onClose,
  session,
  onSelectAppsScript,
  onSelectExportImage,
  onSelectExportExcel,
  onSelectExamEditor,
}) => {
  if (!isOpen) return null;

  const canManageAppsScript = session ? session.permissions.canManageAppsScript : true;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          
          {session?.role === 'subadmin' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 backdrop-blur-md text-emerald-100 text-xs font-semibold w-fit mb-2 border border-emerald-300/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Đã xác thực: {session.name} (Quyền tạo đề & xuất báo cáo)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-semibold w-fit mb-2 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Đã xác thực quyền Cấp cao: Lê Hoà Hiệp</span>
            </div>
          )}

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Bảng Điều Khiển Quản Trị</h3>
          <p className="text-sky-100 text-xs sm:text-sm mt-1">
            Vui lòng chọn tính năng quản trị cần thực hiện:
          </p>
        </div>

        {/* Options Selection Grid */}
        <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Option 1: Tạo & Chỉnh sửa đề thi */}
          <button
            onClick={() => {
              onClose();
              onSelectExamEditor();
            }}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 transition-all group flex items-start gap-4 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <FileEdit className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  1. Tạo & Chỉnh sửa đề thi
                </h4>
                <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Thay đổi tên trường, môn học, thời gian, tên kỳ kiểm tra; thêm / bớt câu hỏi, chọn loại trắc nghiệm hay tự luận, chọn đáp án đúng và phân bổ thang điểm.
              </p>
            </div>
          </button>

          {/* Option 2: Xuất báo cáo HS dạng file ảnh */}
          <button
            onClick={() => {
              onClose();
              onSelectExportImage();
            }}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all group flex items-start gap-4 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  2. Xuất báo cáo HS dạng file ảnh (PNG / ZIP)
                </h4>
                <span className="text-emerald-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Lựa chọn học sinh xuất báo cáo dạng file ảnh chất lượng cao. Mỗi file là 1 học sinh; khi chọn nhiều học sinh hệ thống tự động nén thành file ZIP tải về máy tiện lợi.
              </p>
            </div>
          </button>

          {/* Option 3: Xuất kết quả theo lớp dạng file *.xlsx */}
          <button
            onClick={() => {
              onClose();
              onSelectExportExcel();
            }}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-teal-100 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 transition-all group flex items-start gap-4 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                  3. Xuất kết quả theo lớp dạng file *.xlsx
                </h4>
                <span className="text-teal-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Tổng hợp bảng điểm học sinh theo từng lớp học xuất file Microsoft Excel (*.xlsx), kèm điểm số, xếp loại học lực và phân tích từng câu hỏi.
              </p>
            </div>
          </button>

          {/* Option 4: Tạo Apps Script (Conditional) */}
          {canManageAppsScript ? (
            <button
              onClick={() => {
                onClose();
                onSelectAppsScript();
              }}
              className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-sky-100 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50/80 transition-all group flex items-start gap-4 cursor-pointer shadow-xs hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
                <FileCode2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                    4. Tạo Apps Script...
                  </h4>
                  <span className="text-sky-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Cấu hình liên kết Google Sheets (data1, data2); sao chép mã Apps Script tự động đồng bộ đề thi, quản lý ngân hàng câu hỏi và tiếp nhận điểm số trực tiếp.
                </p>
              </div>
            </button>
          ) : (
            <div className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/80 flex items-start gap-4 opacity-75 select-none cursor-not-allowed">
              <div className="w-12 h-12 rounded-2xl bg-slate-300 text-slate-600 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-slate-500">
                    4. Cấu hình Google Sheets & Apps Script
                  </h4>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Chỉ dành cho Cấp cao
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tài khoản Cô Phương được phân quyền: Tạo & chỉnh sửa đề thi, xuất báo cáo ảnh và xuất bảng điểm Excel. Tính năng quản trị Google Sheets được bảo vệ.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Tác giả: <strong>Lê Hoà Hiệp - 0983.676.470</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
