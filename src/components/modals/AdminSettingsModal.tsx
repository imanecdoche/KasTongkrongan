import React, { useState } from 'react';
import { X, Settings, Play, RefreshCw, Sliders, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { SystemConfig } from '../../types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  lastAuditDate: string;
  onSaveConfig: (newConfig: SystemConfig) => void;
  onRunAuditEngine: () => { duesFinesAdded: number; loanFinesAdded: number; auditNotes: string[] };
  onResetData: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  lastAuditDate,
  onSaveConfig,
  onRunAuditEngine,
  onResetData,
}) => {
  const [weeklyTarget, setWeeklyTarget] = useState(config.weekly_target);
  const [dailyDuesFine, setDailyDuesFine] = useState(config.daily_dues_fine);
  const [dailyLoanFine, setDailyLoanFine] = useState(config.daily_loan_fine);
  const [treasurerName, setTreasurerName] = useState(config.treasurer_name);
  const [treasurerBank, setTreasurerBank] = useState(config.treasurer_bank_name);
  const [treasurerAccount, setTreasurerAccount] = useState(config.treasurer_account_number);
  const [treasurerEwallet, setTreasurerEwallet] = useState(config.treasurer_ewallet);

  const [auditResult, setAuditResult] = useState<{
    duesFinesAdded: number;
    loanFinesAdded: number;
    auditNotes: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      weekly_target: Number(weeklyTarget),
      daily_dues_fine: Number(dailyDuesFine),
      daily_loan_fine: Number(dailyLoanFine),
      treasurer_name: treasurerName.trim(),
      treasurer_bank_name: treasurerBank.trim(),
      treasurer_account_number: treasurerAccount.trim(),
      treasurer_ewallet: treasurerEwallet.trim(),
    });
    alert('Konfigurasi sistem berhasil disimpan!');
    onClose();
  };

  const handleTriggerAudit = () => {
    const res = onRunAuditEngine();
    setAuditResult(res);
  };

  return (
    <div id="admin-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        id="admin-modal-container"
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E7F3FE] text-[#118EEA] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2B2F38] font-heading">Pengaturan Sistem & Parameter</h3>
              <p className="text-xs text-[#727986]">Konfigurasi aturan finansial tongkrongan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Automated Daily Cron Worker Simulator (FR-3.4 & FR-4.4) */}
          <div className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#2B2F38]">Automated Daily Cron Worker (00:01 WIB)</h4>
                <p className="text-[11px] text-[#727986]">
                  Audit harian denda iuran (Rp{config.daily_dues_fine}/hari) & denda pinjaman (Rp{config.daily_loan_fine}/hari)
                </p>
              </div>
              <button
                type="button"
                id="run-daily-audit-btn"
                onClick={handleTriggerAudit}
                className="px-3 py-2 bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Jalankan Audit Sekarang</span>
              </button>
            </div>

            {auditResult && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Audit Harian Selesai Diproses:</span>
                </div>
                <div className="text-[#2B2F38] space-y-1 pl-5">
                  <p>• Denda Iuran Ditambahkan: Rp{auditResult.duesFinesAdded.toLocaleString('id-ID')}</p>
                  <p>• Denda Pinjaman Ditambahkan: Rp{auditResult.loanFinesAdded.toLocaleString('id-ID')}</p>
                  {auditResult.auditNotes.map((note, idx) => (
                    <p key={idx} className="text-[#727986] text-[11px]">• {note}</p>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-[#727986]">
              Terakhir diaudit: {new Date(lastAuditDate).toLocaleString('id-ID')}
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <h4 className="text-xs font-bold text-[#2B2F38] uppercase tracking-wider text-slate-500">
              Parameter Finansial (PRD Section 3)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Target Iuran Mingguan</label>
                <input
                  type="number"
                  step="5000"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#2B2F38] focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Denda Iuran / Hari</label>
                <input
                  type="number"
                  step="100"
                  value={dailyDuesFine}
                  onChange={(e) => setDailyDuesFine(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Denda Pinjaman / Hari</label>
                <input
                  type="number"
                  step="500"
                  value={dailyLoanFine}
                  onChange={(e) => setDailyLoanFine(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>
            </div>

            <h4 className="text-xs font-bold text-[#2B2F38] uppercase tracking-wider text-slate-500 pt-2">
              Rekening & E-Wallet Bendahara
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nama Bendahara Terpilih</label>
                <input
                  type="text"
                  value={treasurerName}
                  onChange={(e) => setTreasurerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Bank Resmi</label>
                <input
                  type="text"
                  value={treasurerBank}
                  onChange={(e) => setTreasurerBank(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={treasurerAccount}
                  onChange={(e) => setTreasurerAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">E-Wallet Info</label>
                <input
                  type="text"
                  value={treasurerEwallet}
                  onChange={(e) => setTreasurerEwallet(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:border-[#118EEA] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset semua data ke kondisi simulasi awal?')) {
                    onResetData();
                    onClose();
                  }
                }}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
