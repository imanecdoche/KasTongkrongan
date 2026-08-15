import React, { useState, useEffect } from 'react';
import { Loan, User, SystemConfig } from '../types';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface LoanSafetyNetModuleProps {
  currentUser: User | null;
  loans: Loan[];
  config: SystemConfig;
  availableCash: number;
  onOpenLoanModal: () => void;
  onApproveLoan: (loanId: string, status: 'approved' | 'rejected', notes?: string) => void;
  onRepayLoan: (loanId: string, amount: number) => void;
}

export const LoanSafetyNetModule: React.FC<LoanSafetyNetModuleProps> = ({
  currentUser,
  loans,
  config,
  availableCash,
  onOpenLoanModal,
  onApproveLoan,
  onRepayLoan,
}) => {
  // Live ticker for countdown timer
  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isBendaharaOrAdmin = currentUser ? currentUser.role === 'bendahara' || currentUser.role === 'admin' : false;
  const maxPlafon = config.weekly_target * config.loan_max_multiplier;

  // Active loans (approved)
  const activeLoans = loans.filter((l) => l.status === 'approved');
  const pendingLoans = loans.filter((l) => l.status === 'pending');
  const historyLoans = loans.filter((l) => l.status === 'paid' || l.status === 'rejected');

  // Check if current user has an active loan
  const myActiveLoan = currentUser ? activeLoans.find((l) => l.user_id === currentUser.id) : undefined;

  // Helper for live countdown calculation
  const getRemainingTime = (dueDateStr: string) => {
    const now = new Date().getTime();
    const due = new Date(dueDateStr).getTime();
    const diff = due - now;

    if (diff <= 0) {
      const overdueDiff = Math.abs(diff);
      const days = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return { isOverdue: true, text: `${days}h ${hours}j terlambat`, days, hours };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      isOverdue: false,
      text: `${days}h ${hours}j ${minutes}m ${seconds}s`,
      days,
      hours,
      minutes,
      seconds,
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#2B2F38] font-heading flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#118EEA]" />
            <span>DANA TALANGAN DARURAT (SAFETY NET)</span>
          </h2>
          <p className="text-xs text-[#727986] mt-0.5">
            Plafon: Maks 1x Target (Rp{maxPlafon.toLocaleString('id-ID')}) • Jatuh Tempo 7 Hari • Denda Rp{config.daily_loan_fine}/hari
          </p>
        </div>

        <button
          id="apply-loan-btn"
          onClick={onOpenLoanModal}
          disabled={!!myActiveLoan}
          className="px-4 py-2 bg-[#118EEA] hover:bg-[#0B63C5] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-none shrink-0"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Ajukan Dana Talangan</span>
        </button>
      </div>

      {/* Current User Active Loan Alert if any */}
      {myActiveLoan && (
        <div className="bg-white p-5 rounded-2xl border-2 border-[#118EEA] space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#E7F3FE] text-[#118EEA] uppercase">
                Pinjaman Aktif Anda
              </span>
              <h3 className="text-lg font-black text-[#2B2F38] font-heading mt-1">
                Rp {myActiveLoan.amount.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-[#727986] mt-0.5">Alasan: {myActiveLoan.reason}</p>
            </div>

            <button
              onClick={() => onRepayLoan(myActiveLoan.id, myActiveLoan.amount + myActiveLoan.fine_amount)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lunasi Sekarang</span>
            </button>
          </div>

          {/* Live Countdown Timer */}
          {(() => {
            const time = getRemainingTime(myActiveLoan.due_date);
            return (
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  time.isOverdue ? 'bg-[#FFECEB] border-[#FF3B30]/40' : 'bg-[#F5F6F8] border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-5 h-5 ${time.isOverdue ? 'text-[#FF3B30]' : 'text-[#118EEA]'}`} />
                  <div>
                    <p className="text-xs font-bold text-[#2B2F38]">
                      {time.isOverdue ? 'Status: MELEWATI JATUH TEMPO' : 'Sisa Waktu Pengembalian (Live Timer):'}
                    </p>
                    <p className={`text-sm font-mono font-black ${time.isOverdue ? 'text-[#FF3B30]' : 'text-[#118EEA]'}`}>
                      {time.text}
                    </p>
                  </div>
                </div>

                {myActiveLoan.fine_amount > 0 && (
                  <div className="text-right">
                    <span className="text-[11px] text-rose-600 block">Denda Terkumpul:</span>
                    <span className="text-sm font-bold text-rose-700">
                      + Rp {myActiveLoan.fine_amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* FR-4.2: Approval Panel for Bendahara & Admin */}
      {isBendaharaOrAdmin && pendingLoans.length > 0 && (
        <div className="bg-[#E7F3FE] p-5 rounded-2xl border border-[#118EEA]/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#118EEA]" />
              <h3 className="text-sm font-bold text-[#2B2F38] font-heading">
                Permohonan Talangan Menunggu Persetujuan ({pendingLoans.length})
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-[#118EEA] text-white rounded-full">
              Khusus Bendahara
            </span>
          </div>

          <div className="space-y-3">
            {pendingLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2B2F38]">{loan.user_name}</span>
                    <span className="text-[10px] text-slate-500">• {new Date(loan.request_date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <p className="text-sm font-extrabold text-[#118EEA] font-heading">
                    Rp {loan.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-[#2B2F38] bg-slate-50 p-2 rounded-lg border border-slate-100">
                    &quot;{loan.reason}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApproveLoan(loan.id, 'rejected', 'Ditolak')}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                  <button
                    onClick={() => onApproveLoan(loan.id, 'approved', 'Disetujui dan dicairkan')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui & Cairkan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Borrowers List & Countdown (FR-4.3 & FR-4.4) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#2B2F38] font-heading">Daftar Pinjaman Aktif Tongkrongan</h3>
            <p className="text-xs text-[#727986]">Transparansi dana talangan yang sedang dipinjam</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
            {activeLoans.length} Aktif
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeLoans.map((loan) => {
            const time = getRemainingTime(loan.due_date);

            return (
              <div key={loan.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center font-heading">
                      {loan.user_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2B2F38]">{loan.user_name}</p>
                      <p className="text-xs font-extrabold text-[#118EEA]">
                        Rp {loan.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {time.isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFECEB] text-[#FF3B30] border border-[#FF3B30]/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>OVERDUE (+Rp{loan.fine_amount.toLocaleString('id-ID')})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{time.text}</span>
                      </span>
                    )}

                    {isBendaharaOrAdmin && (
                      <button
                        onClick={() => onRepayLoan(loan.id, loan.amount + loan.fine_amount)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        Tandai Lunas
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-[#F5F6F8] rounded-xl text-[11px] text-[#727986] flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-slate-200">
                  <span>Keperluan: &quot;{loan.reason}&quot;</span>
                  <span>Disetujui: {loan.approved_by || 'Bendahara'}</span>
                </div>
              </div>
            );
          })}

          {activeLoans.length === 0 && (
            <div className="py-8 text-center text-xs text-[#727986]">
              Saat ini tidak ada anggota yang sedang meminjam dana talangan. Kas aman!
            </div>
          )}
        </div>
      </div>

      {/* Repaid Loans History */}
      {historyLoans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Riwayat Pelunasan Pinjaman
          </h3>

          <div className="divide-y divide-slate-100">
            {historyLoans.map((loan) => (
              <div key={loan.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#2B2F38]">{loan.user_name}</span>
                  <span className="text-[#727986] ml-2">• Rp {loan.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{loan.status === 'paid' ? 'Lunas Selesai' : 'Ditolak'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
