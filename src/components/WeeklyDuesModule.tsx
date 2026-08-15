import React, { useState } from 'react';
import {
  DuesRecord,
  DuesCycle,
  User,
  Transaction,
  SystemConfig,
} from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Check,
  X,
  MessageSquare,
  Filter,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
} from 'lucide-react';

interface WeeklyDuesModuleProps {
  currentUser: User | null;
  activeCycle: DuesCycle;
  duesRecords: DuesRecord[];
  pendingTransactions: Transaction[];
  config: SystemConfig;
  onOpenPaymentModal: () => void;
  onVerifyTransaction: (txId: string, status: 'verified' | 'rejected') => void;
  onNavigateToMembers: () => void;
}

export const WeeklyDuesModule: React.FC<WeeklyDuesModuleProps> = ({
  currentUser,
  activeCycle,
  duesRecords,
  pendingTransactions,
  config,
  onOpenPaymentModal,
  onVerifyTransaction,
  onNavigateToMembers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'overdue'>('all');

  // Find current user's record
  const myRecord = currentUser
    ? duesRecords.find((r) => r.user_id === currentUser.id) || {
        id: 'temp',
        cycle_id: activeCycle.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        amount_paid: 0,
        target_amount: activeCycle.target_amount,
        status: 'unpaid' as const,
        fine_amount: 0,
        days_late: 0,
        last_updated: new Date().toISOString(),
      }
    : null;

  const isBendaharaOrAdmin = currentUser ? currentUser.role === 'bendahara' || currentUser.role === 'admin' : false;
  const myProgress = myRecord ? Math.min(100, Math.round((myRecord.amount_paid / myRecord.target_amount) * 100)) : 0;

  // Pending verification dues transactions
  const duesPending = pendingTransactions.filter((tx) => tx.type === 'due_payment' || tx.type === 'fine_payment');

  // Filtered members list
  const filteredRecords = duesRecords.filter((rec) => {
    const matchSearch = rec.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return rec.status === 'paid';
    if (statusFilter === 'partial') return rec.status === 'partial';
    if (statusFilter === 'overdue') return rec.status === 'overdue' || rec.fine_amount > 0;
    return true;
  });

  const getStatusBadge = (status: string, fine: number, daysLate: number) => {
    if (fine > 0 || status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFECEB] text-[#FF3B30] border border-[#FF3B30]/30">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>DENDA (+Rp{fine.toLocaleString('id-ID')})</span>
        </span>
      );
    }
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF9EE] text-[#34C759] border border-[#34C759]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>LUNAS</span>
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>SEBAGIAN</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        <Clock className="w-3.5 h-3.5" />
        <span>BELUM BAYAR</span>
      </span>
    );
  };

  const generateWhatsAppReminder = (record: DuesRecord) => {
    const sisa = Math.max(0, record.target_amount - record.amount_paid);
    const denda = record.fine_amount > 0 ? ` + Denda Rp${record.fine_amount.toLocaleString('id-ID')}` : '';
    const text = `Halo Bro ${record.user_name}, pengingat iuran kas tongkrongan (${activeCycle.cycle_name}). Tagihan: Rp${sisa.toLocaleString('id-ID')}${denda}. Transfer via ${config.treasurer_bank_name} ${config.treasurer_account_number} a.n ${config.treasurer_name} atau QRIS Kas. Terima kasih!`;
    navigator.clipboard.writeText(text);
    alert(`Pesan pengingat untuk ${record.user_name} berhasil disalin ke clipboard!`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#2B2F38] font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#118EEA]" />
            <span>IURAN KAS MINGGUAN</span>
          </h2>
          <p className="text-xs text-[#727986] mt-0.5">
            Siklus: {activeCycle.cycle_name} • Denda Rp{config.daily_dues_fine}/hari setelah jatuh tempo
          </p>
        </div>

        <button
          id="dues-pay-now-btn"
          onClick={onOpenPaymentModal}
          className="px-4 py-2 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-none"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Setor Kas</span>
        </button>
      </div>

      {/* FR-3.1: Individual Member Dues Progress Card */}
      {currentUser && myRecord ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-[#727986] font-medium">Status Tagihan Pribadi:</span>
              <h3 className="text-base font-bold text-[#2B2F38] font-heading mt-0.5">{currentUser.name}</h3>
              <p className="text-xs text-[#727986]">{currentUser.phone_number} • {currentUser.role.toUpperCase()}</p>
            </div>
            {getStatusBadge(myRecord.status, myRecord.fine_amount, myRecord.days_late)}
          </div>

          {/* Progress Bar & Numbers */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#727986]">
                Tercapai: <strong className="text-[#2B2F38]">Rp {myRecord.amount_paid.toLocaleString('id-ID')}</strong>
              </span>
              <span className="text-[#727986]">
                Target: <strong className="text-[#2B2F38]">Rp {myRecord.target_amount.toLocaleString('id-ID')}</strong>
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  myRecord.status === 'paid' ? 'bg-[#34C759]' : myRecord.fine_amount > 0 ? 'bg-[#FF3B30]' : 'bg-[#118EEA]'
                }`}
                style={{ width: `${myProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-[#727986]">
              <span>Progres: {myProgress}%</span>
              {myRecord.amount_paid < myRecord.target_amount ? (
                <span className="font-semibold text-rose-600">
                  Sisa: Rp {(myRecord.target_amount - myRecord.amount_paid).toLocaleString('id-ID')}
                </span>
              ) : (
                <span className="font-semibold text-emerald-600">Lunas Tepat Waktu</span>
              )}
            </div>
          </div>

          {/* Fine notice if overdue */}
          {myRecord.fine_amount > 0 && (
            <div className="p-3 bg-[#FFECEB] rounded-xl border border-[#FF3B30]/30 text-xs text-[#FF3B30] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Akumulasi Denda Keterlambatan: Rp {myRecord.fine_amount.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Keterlambatan {myRecord.days_late} hari x Rp{config.daily_dues_fine.toLocaleString('id-ID')}/hari. Silakan lunasi iuran beserta denda.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-[#2B2F38]">Belum Memilih Profil Pengguna</h3>
            <p className="text-xs text-[#727986] mt-0.5">
              Tambahkan atau pilih profil anggota aktif Anda untuk melihat status iuran dan menyetor kas.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToMembers}
            className="px-4 py-2 bg-[#118EEA] text-white rounded-xl text-xs font-bold shrink-0"
          >
            Buka Tab Anggota
          </button>
        </div>
      )}

      {/* FR-3.3: Pending Verification Panel (Bendahara & Admin only) */}
      {isBendaharaOrAdmin && duesPending.length > 0 && (
        <div className="bg-[#E7F3FE] p-5 rounded-2xl border border-[#118EEA]/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#118EEA]" />
              <h3 className="text-sm font-bold text-[#2B2F38] font-heading">
                Verifikasi Setoran Kas ({duesPending.length} Menunggu)
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-[#118EEA] text-white rounded-full">
              Khusus Bendahara
            </span>
          </div>

          <div className="space-y-3">
            {duesPending.map((tx) => (
              <div
                key={tx.id}
                className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2B2F38]">{tx.user_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                      {tx.method}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-[#118EEA] font-heading">
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-[#727986]">{tx.notes}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onVerifyTransaction(tx.id, 'rejected')}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                  <button
                    onClick={() => onVerifyTransaction(tx.id, 'verified')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Verifikasi & Terima</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Matrix Table / Status List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#2B2F38] font-heading">Status Iuran Anggota Minggu Ini</h3>
            <p className="text-xs text-[#727986]">Transparansi setoran seluruh anggota tongkrongan</p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari anggota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA] w-36 sm:w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] font-medium focus:outline-none focus:border-[#118EEA]"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="partial">Sebagian</option>
              <option value="overdue">Denda / Menunggak</option>
            </select>
          </div>
        </div>

        {/* Member cards list */}
        <div className="divide-y divide-slate-100">
          {filteredRecords.map((rec) => (
            <div key={rec.id} className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E7F3FE] text-[#118EEA] font-bold text-xs flex items-center justify-center font-heading">
                  {rec.user_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2B2F38]">{rec.user_name}</p>
                  <p className="text-[11px] text-[#727986]">
                    Setor: <span className="font-semibold text-slate-900">Rp {rec.amount_paid.toLocaleString('id-ID')}</span> / Rp {rec.target_amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(rec.status, rec.fine_amount, rec.days_late)}

                {/* Reminder button for unpaid members */}
                {rec.status !== 'paid' && (
                  <button
                    type="button"
                    title="Kirim pengingat WhatsApp"
                    onClick={() => generateWhatsAppReminder(rec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="py-8 text-center text-xs text-[#727986]">
              Tidak ada data anggota yang cocok dengan pencarian.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
