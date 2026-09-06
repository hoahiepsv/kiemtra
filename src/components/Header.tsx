import React from 'react';
import { Wifi, WifiOff, Code2, Bell, ShieldCheck } from 'lucide-react';
import { ExamConfig } from '../types';

interface HeaderProps {
  config: ExamConfig;
  isOnline: boolean;
  onOpenAppsScript?: () => void;
  onOpenAdmin?: () => void;
  onRequestPush: () => void;
  notificationsEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  isOnline,
  onOpenAdmin,
  onRequestPush,
  notificationsEnabled,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-xs">
      {/* Top micro bar for copyright & network status */}
      <div className="bg-sky-600 text-sky-50 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
          <span>
            Bản quyền:{' '}
            <button
              onClick={onOpenAdmin}
              className="text-white font-bold tracking-wide hover:underline cursor-pointer focus:outline-none"
              title="Đăng nhập Quản trị viên & Giáo viên"
            >
              {config.copyrightText}
            </button>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Online/Offline Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40'
                : 'bg-amber-500/30 text-amber-100 border border-amber-400/50 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-300" />
                <span>Trực tuyến (Online)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-300" />
                <span>Ngoại tuyến (Offline Mode)</span>
              </>
            )}
          </div>

          <button
            onClick={onRequestPush}
            title={notificationsEnabled ? 'Thông báo đã bật' : 'Bật thông báo nhắc nhở làm bài'}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            <Bell className={`w-3 h-3 ${notificationsEnabled ? 'text-amber-300 fill-amber-300' : 'text-sky-200'}`} />
            <span className="hidden sm:inline">{notificationsEnabled ? 'Đã bật chuông' : 'Nhắc nhở'}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-300/40 flex-shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-sm">
                {config.schoolName}
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">• Môn: {config.subject}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {config.examName}
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
