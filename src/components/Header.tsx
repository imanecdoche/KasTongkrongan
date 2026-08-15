import React from 'react';
import { User, SystemConfig } from '../types';
import { QrCode, Settings, ShieldCheck, Sparkles, PlusCircle } from 'lucide-react';

interface HeaderProps {
  config: SystemConfig;
  totalMembers: number;
  onOpenSettings: () => void;
  onOpenQRIS: () => void;
  onOpenAddMember: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  totalMembers,
  onOpenSettings,
  onOpenQRIS,
  onOpenAddMember,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#118EEA] to-[#0B63C5] flex items-center justify-center text-white shadow-md shadow-[#118EEA]/20">
            <span className="font-heading font-extrabold text-lg tracking-tight">K</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-[#2B2F38] font-heading tracking-tight">
                Kas Tongkrongan
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Mode Bendahara
              </span>
            </div>
            <p className="text-[11px] text-[#727986] line-clamp-1">
              {config.treasurer_name} • {totalMembers} Anggota Terdaftar
            </p>
          </div>
        </div>

        {/* Quick Actions for Bendahara */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddMember}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#118EEA]/10 hover:bg-[#118EEA]/20 text-[#118EEA] rounded-xl text-xs font-bold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Anggota</span>
          </button>

          <button
            type="button"
            onClick={onOpenQRIS}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Lihat QRIS Kas"
          >
            <QrCode className="w-4 h-4 text-[#118EEA]" />
            <span className="hidden sm:inline">QRIS Kas</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Pengaturan Kas"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Pengaturan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
