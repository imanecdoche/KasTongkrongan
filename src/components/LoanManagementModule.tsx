import React from 'react';
import { MemberLoan, User } from '../types';
import { formatRupiah } from '../lib/storage';
import { HandCoins, CheckCircle2, Clock, AlertTriangle, ArrowDownLeft, ShieldAlert } from 'lucide-react';

interface LoanManagementModuleProps {
  loans: MemberLoan[];
  users: User[];
  onRepayLoan: (loan: MemberLoan) => void;
  onOpenKasKeluarLoan: () => void;
  onOpenManageCredit: (user: User) => void;
}

export const LoanManagementModule: React.FC<LoanManagementModuleProps> = ({
  loans,
  users,
  onRepayLoan,
  onOpenKasKeluarLoan,
  onOpenManageCredit,
}) => {
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const paidLoans = loans.filter((l) => l.status === 'paid');

  const totalActiveDebt = activeLoans.reduce((sum, l) => sum + l.remaining_amount, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Title & Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#2B2F38] font-heading flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-[#118EEA]" />
            <span>Pinjaman & Dana Talangan Anggota</span>
          </h2>
          <p className="text-xs text-[#727986] mt-0.5">
            Setiap anggota memiliki jatah plafon kredit pinjaman Rp 20.000 yang dapat disesuaikan oleh Bendahara
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Piutang Beredar:</span>
            <span className="text-base font-extrabold text-rose-600 font-heading">
              Rp {formatRupiah(totalActiveDebt)}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenKasKeluarLoan}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
          >
            <span>+ Beri Pinjaman Baru</span>
          </button>
        </div>
      </div>

      {/* Active Loans Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span>Daftar Pinjaman Aktif ({activeLoans.length})</span>
          <span className="text-[11px] text-slate-400 font-normal">Menunggu Pelunasan</span>
        </h3>

        {activeLoans.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">Tidak Ada Hutang / Pinjaman yang Belum Lunas</p>
            <p className="text-[11px] text-slate-500">Semua anggota berstatus bersih tanpa tunggakan kas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeLoans.map((loan) => {
              const borrower = users.find((u) => u.id === loan.member_id);
              const dueDate = new Date(loan.due_date);
              const isPastDue = new Date() > dueDate;

              return (
                <div
                  key={loan.id}
                  className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">Peminjam:</span>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">{loan.member_name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{loan.notes}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-400 block">Sisa Hutang:</span>
                      <span className="text-sm font-extrabold text-rose-600 font-heading">
                        Rp {formatRupiah(loan.remaining_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Pinjaman Pokok Awal:</span>
                      <strong className="text-slate-800">Rp {formatRupiah(loan.amount)}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jatuh Tempo:</span>
                      <span className={`font-semibold flex items-center gap-1 ${isPastDue ? 'text-rose-600' : 'text-slate-700'}`}>
                        <Clock className="w-3 h-3" />
                        {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isPastDue && ' (Lewat Tempo)'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    {borrower && (
                      <button
                        type="button"
                        onClick={() => onOpenManageCredit(borrower)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#118EEA] flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3 h-3 text-[#118EEA]" />
                        <span>Kelola Plafon ({formatRupiah(borrower.credit_limit ?? 20000)})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRepayLoan(loan)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ml-auto"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Catat Pelunasan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Loans Section */}
      {paidLoans.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Riwayat Pinjaman Selesai / Lunas ({paidLoans.length})
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {paidLoans.map((loan) => (
              <div key={loan.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{loan.member_name}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{loan.notes}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 block">
                    Rp {formatRupiah(loan.amount)}
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    LUNAS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
