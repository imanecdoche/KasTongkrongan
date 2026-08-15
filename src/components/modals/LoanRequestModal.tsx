import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, Clock, CheckSquare } from 'lucide-react';
import { User, SystemConfig, Loan } from '../../types';

interface LoanRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  config: SystemConfig;
  activeLoan?: Loan;
  onSuccess: (data: { amount: number; reason: string }) => void;
}

export const LoanRequestModal: React.FC<LoanRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  config,
  activeLoan,
  onSuccess,
}) => {
  const maxLoanPlafon = config.weekly_target * config.loan_max_multiplier;
  const [amount, setAmount] = useState<number>(maxLoanPlafon);
  const [reason, setReason] = useState<string>('');
  const [agreed, setAgreed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const hasActiveLoan = !!activeLoan && activeLoan.status === 'approved';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Silakan tambahkan atau pilih profil anggota terlebih dahulu di tab Anggota.');
      return;
    }
    if (hasActiveLoan) {
      setErrorMsg('Anda masih memiliki pinjaman aktif yang belum lunas.');
      return;
    }
    if (amount <= 0 || amount > maxLoanPlafon) {
      setErrorMsg(`Nominal pinjaman maksimal Rp${maxLoanPlafon.toLocaleString('id-ID')} (1x target mingguan).`);
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Harap cantumkan alasan kebutuhan dana talangan.');
      return;
    }
    if (!agreed) {
      setErrorMsg('Anda wajib menyetujui syarat pengembalian maksimal 7 hari kalender.');
      return;
    }

    onSuccess({
      amount: Number(amount),
      reason: reason.trim(),
    });
    onClose();
  };

  return (
    <div id="loan-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        id="loan-modal-container"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">Ajukan Dana Talangan Darurat</h3>
            <p className="text-xs text-[#727986]">Fasilitas Safety Net Kas Tongkrongan</p>
          </div>
          <button
            id="close-loan-modal-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Active loan warning if user is blocked */}
          {hasActiveLoan ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Pengajuan Ditangguhkan</span>
              </div>
              <p className="text-xs text-rose-600 leading-relaxed">
                Anda saat ini masih memiliki pinjaman aktif sebesar <strong>Rp{activeLoan.amount.toLocaleString('id-ID')}</strong>. Sesuai aturan PRD 3.4, anggota tidak dapat mengajukan pinjaman baru sebelum pinjaman sebelumnya lunas.
              </p>
            </div>
          ) : null}

          {/* Rules Summary Box */}
          <div className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="text-xs font-bold text-[#2B2F38]">Ketentuan Dana Talangan (PRD Section 3):</h4>
            <ul className="text-xs text-[#727986] space-y-1.5 list-disc list-inside">
              <li>Plafon Maksimal: <strong>Rp{maxLoanPlafon.toLocaleString('id-ID')}</strong> (1x target mingguan).</li>
              <li>Jangka Waktu Pengembalian: <strong>Maksimal {config.loan_term_days} hari kalender</strong>.</li>
              <li>Denda Keterlambatan: <strong>Rp{config.daily_loan_fine.toLocaleString('id-ID')} / hari</strong> mulai hari ke-8.</li>
              <li>Pencairan akan diverifikasi dan disetujui langsung oleh Bendahara.</li>
            </ul>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#2B2F38]">Nominal Pinjaman</label>
              <span className="text-[11px] text-[#118EEA] font-semibold">
                Maks: Rp{maxLoanPlafon.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
              <input
                id="loan-amount-input"
                type="number"
                min="5000"
                max={maxLoanPlafon}
                step="5000"
                disabled={hasActiveLoan}
                value={amount}
                onChange={(e) => {
                  setErrorMsg('');
                  setAmount(Number(e.target.value));
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-[#2B2F38] focus:outline-none focus:border-[#118EEA] disabled:bg-slate-100 disabled:text-slate-400"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[10000, 15000, 20000].filter(p => p <= maxLoanPlafon).map((preset) => (
                <button
                  type="button"
                  key={preset}
                  disabled={hasActiveLoan}
                  onClick={() => setAmount(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    amount === preset
                      ? 'bg-[#118EEA] text-white border-[#118EEA]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Rp{preset.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Alasan Kebutuhan Darurat</label>
            <textarea
              id="loan-reason-input"
              rows={3}
              disabled={hasActiveLoan}
              value={reason}
              onChange={(e) => {
                setErrorMsg('');
                setReason(e.target.value);
              }}
              placeholder="Contoh: Talangan bensin motor darurat atau biaya servis kendaraan mendadak..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA] disabled:bg-slate-100"
              required
            />
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={hasActiveLoan}
                checked={agreed}
                onChange={(e) => {
                  setErrorMsg('');
                  setAgreed(e.target.checked);
                }}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#118EEA] focus:ring-0 shrink-0"
              />
              <span className="text-xs text-[#2B2F38] leading-snug">
                Saya berjanji akan mengembalikan dana talangan ini selambat-lambatnya dalam <strong>7 hari kalender</strong> dan menyetujui denda <strong>Rp{config.daily_loan_fine.toLocaleString('id-ID')}/hari</strong> jika terlambat.
              </span>
            </label>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="submit-loan-request-btn"
              disabled={hasActiveLoan}
              className="flex-1 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] disabled:bg-slate-300 text-white text-xs font-bold transition-colors shadow-none"
            >
              Kirim Pengajuan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
