import React, { useState, useEffect } from 'react';
import { SystemConfig } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, Settings, RefreshCw, Save, ShieldAlert, Check, Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { isStandalone } from '../../lib/pwa';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSaveConfig: (newConfig: SystemConfig) => void;
  onResetData: () => void;
  onOpenInstallPWA?: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetData,
  onOpenInstallPWA,
}) => {
  const [treasurerName, setTreasurerName] = useState(config.treasurer_name);
  const [treasurerPhone, setTreasurerPhone] = useState(config.treasurer_phone);
  const [bankName, setBankName] = useState(config.treasurer_bank_name);
  const [accountNumber, setAccountNumber] = useState(config.treasurer_account_number);
  const [ewallet, setEwallet] = useState(config.treasurer_ewallet);
  const [weeklyTargetStr, setWeeklyTargetStr] = useState(formatRupiah(config.weekly_target));
  const [defaultCreditStr, setDefaultCreditStr] = useState(formatRupiah(config.default_credit_limit || 20000));
  const [standalone, setStandalone] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTreasurerName(config.treasurer_name);
      setTreasurerPhone(config.treasurer_phone);
      setBankName(config.treasurer_bank_name);
      setAccountNumber(config.treasurer_account_number);
      setEwallet(config.treasurer_ewallet);
      setWeeklyTargetStr(formatRupiah(config.weekly_target));
      setDefaultCreditStr(formatRupiah(config.default_credit_limit || 20000));
      setStandalone(isStandalone());
      setShowResetConfirm(false);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      treasurer_name: treasurerName.trim(),
      treasurer_phone: treasurerPhone.trim(),
      treasurer_bank_name: bankName.trim(),
      treasurer_account_number: accountNumber.trim(),
      treasurer_ewallet: ewallet.trim(),
      weekly_target: parseRupiahInput(weeklyTargetStr) || 20000,
      default_credit_limit: parseRupiahInput(defaultCreditStr) || 20000,
    });
    alert('Pengaturan kas berhasil disimpan!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#118EEA] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Pengaturan Kas Tongkrongan</h2>
              <p className="text-xs text-sky-100">Profil Bendahara & Rekening</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* PWA / Standalone Info */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#118EEA] text-white flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Status Aplikasi PWA</span>
                <span className="text-[11px] text-slate-600">
                  {standalone ? 'Mode Mandiri Terpasang (Standalone)' : 'Berjalan di Browser Web'}
                </span>
              </div>
            </div>
            {!standalone && onOpenInstallPWA && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstallPWA();
                }}
                className="px-2.5 py-1 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Pasang</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Nama Bendahara / Pengelola</label>
            <input
              type="text"
              value={treasurerName}
              onChange={(e) => setTreasurerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Nomor HP / WhatsApp Bendahara</label>
            <input
              type="text"
              value={treasurerPhone}
              onChange={(e) => setTreasurerPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Bank Transfer</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank BCA / Mandiri"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">No. Rekening Bank</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">E-Wallet DANA / GoPay</label>
            <input
              type="text"
              value={ewallet}
              onChange={(e) => setEwallet(e.target.value)}
              placeholder="DANA (08xx-xxxx-xxxx)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Iuran Mingguan Standar</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                <input
                  type="text"
                  value={weeklyTargetStr}
                  onChange={(e) => setWeeklyTargetStr(formatRupiah(parseRupiahInput(e.target.value)))}
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Default Plafon Kredit (20K)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                <input
                  type="text"
                  value={defaultCreditStr}
                  onChange={(e) => setDefaultCreditStr(formatRupiah(parseRupiahInput(e.target.value)))}
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone: Reset Data */}
          <div className="pt-2 border-t border-slate-200">
            {!showResetConfirm ? (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-800 block">Kosongkan Semua Data</span>
                  <span className="text-[11px] text-rose-600">Reset transaksi & anggota</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Data
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-rose-100/90 rounded-xl border border-rose-300 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-rose-900 leading-tight">
                    PERINGATAN: Seluruh data transaksi, pinjaman, dan anggota akan dihapus bersih. Lanjutkan?
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    Ya, Reset Bersih
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
