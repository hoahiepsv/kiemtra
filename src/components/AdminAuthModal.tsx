import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, KeyRound, AlertCircle } from 'lucide-react';
import { AdminAuthSession } from '../types';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AdminAuthSession) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    if (cleanPass === 'Lhh249111') {
      setError('');
      onSuccess({
        role: 'superadmin',
        name: 'Thầy Lê Hoà Hiệp',
        permissions: {
          canEditExam: true,
          canExportImage: true,
          canExportExcel: true,
          canManageAppsScript: true,
        },
      });
    } else if (cleanPass === 'Phuong123456') {
      setError('');
      onSuccess({
        role: 'subadmin',
        name: 'Cô Phương',
        permissions: {
          canEditExam: true,
          canExportImage: true,
          canExportExcel: true,
          canManageAppsScript: false,
        },
      });
    } else {
      setError('Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
      inputRef.current?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20 shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Xác thực Quyền Quản trị viên</h3>
          <p className="text-sky-100 text-xs mt-1">
            Khu vực dành cho Quản trị viên & Giáo viên bộ môn
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nhập mật khẩu truy cập
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Nhập mật khẩu..."
                className={`w-full pl-10 pr-11 py-3 text-sm rounded-xl border ${
                  error
                    ? 'border-red-400 bg-red-50/50 focus:ring-red-200'
                    : 'border-slate-200 bg-slate-50 focus:border-sky-500 focus:bg-white'
                } focus:outline-none focus:ring-4 focus:ring-sky-50 transition-all font-mono`}
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Chính sách phân quyền:</span>
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong>Mật khẩu Cấp cao</strong>: Toàn quyền cấu hình, tạo đề và xuất báo cáo.</li>
              <li><strong>Mật khẩu Giáo viên</strong>: Quyền tạo đề thi, xuất báo cáo ảnh và file Excel.</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Xác nhận mở khoá</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
