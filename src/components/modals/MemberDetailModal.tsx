import React, { useState } from 'react';
import { User, Transaction, MemberLoan } from '../../types';
import { AppState, calculateMemberStats, formatRupiah } from '../../lib/storage';
import { DeleteMemberConfirmModal } from './DeleteMemberConfirmModal';
import {
  X,
  TrendingUp,
  CreditCard,
  History,
  Phone,
  Instagram,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  Sparkles,
  HandCoins,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  state: AppState;
  onOpenKasMasuk: (user: User) => void;
  onOpenKasKeluar: (user: User) => void;
  onDeleteMember?: (userId: string) => void;
}

const PIE_COLORS = [
  '#10B981', // Emerald for Iuran
  '#118EEA', // Blue for Pelunasan Hutang
  '#EF4444', // Red for Pinjaman Kas
  '#F59E0B', // Amber for Denda
  '#8B5CF6', // Purple for Konsumsi/Logistik
  '#64748B', // Slate for Lainnya
];

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  state,
  onOpenKasMasuk,
  onOpenKasKeluar,
  onDeleteMember,
}) => {
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen || !user) return null;

  const stats = calculateMemberStats(user, state);

  const isMatchingMember = (memberId?: string, memberName?: string) => {
    if (memberId && memberId === user.id) return true;
    if (memberName && user.name && memberName.toLowerCase().trim() === user.name.toLowerCase().trim()) return true;
    return false;
  };

  // Filter transactions for this member
  const memberTransactions = state.transactions
    .filter((tx) => isMatchingMember(tx.member_id, tx.member_name))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter loans for this member
  const memberLoans = state.loans
    .filter((loan) => isMatchingMember(loan.member_id, loan.member_name))
    .sort(
      (a, b) =>
        new Date(b.created_at || b.borrowed_at || b.due_date).getTime() -
        new Date(a.created_at || a.borrowed_at || a.due_date).getTime()
    );

  // Unified list of track record events for timeline & charts
  interface UnifiedRecord {
    id: string;
    type: 'masuk' | 'keluar';
    category: string;
    amount: number;
    notes: string;
    date: Date;
    method?: string;
    isLoan?: boolean;
    loanStatus?: string;
    dueDate?: string;
  }

  const unifiedRecords: UnifiedRecord[] = [];

  // Add all transactions
  memberTransactions.forEach((tx) => {
    unifiedRecords.push({
      id: tx.id,
      type: tx.direction,
      category: tx.category,
      amount: tx.amount,
      notes: tx.notes || (tx.direction === 'masuk' ? 'Setoran Kas' : 'Pengeluaran / Pinjaman Kas'),
      date: new Date(tx.created_at),
      method: tx.method,
      isLoan: tx.category === 'pinjaman_keluar',
    });
  });

  // Ensure any loans in state.loans not already present in transactions are also included
  memberLoans.forEach((loan) => {
    const hasTx = memberTransactions.some(
      (tx) => tx.loan_id === loan.id || (tx.category === 'pinjaman_keluar' && Math.abs(tx.amount - loan.amount) < 1)
    );
    if (!hasTx) {
      unifiedRecords.push({
        id: loan.id,
        type: 'keluar',
        category: 'pinjaman_keluar',
        amount: loan.amount,
        notes: loan.notes || `Pinjaman Dana Talangan (Sisa: Rp ${formatRupiah(loan.remaining_amount)})`,
        date: new Date(loan.created_at || loan.borrowed_at || Date.now()),
        method: 'tunai',
        isLoan: true,
        loanStatus: loan.status,
        dueDate: loan.due_date,
      });
    }
  });

  // Sort unified records descending
  unifiedRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Prepare Weekly Chart Data (Last 7 Days)
  const now = new Date();
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 23, 59, 59, 999);
    const dayLabel = dayStart.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

    let masuk = 0;
    let keluar = 0;

    unifiedRecords.forEach((rec) => {
      if (rec.date >= dayStart && rec.date <= dayEnd) {
        if (rec.type === 'masuk') {
          masuk += rec.amount;
        } else {
          keluar += rec.amount;
        }
      }
    });

    return { name: dayLabel, Masuk: masuk, Pinjam: keluar };
  });

  // Prepare Monthly Chart Data (Last 4 Weeks)
  const monthlyData = Array.from({ length: 4 }).map((_, i) => {
    const weekLabel = `Pekan ${i + 1}`;
    const startDaysAgo = (3 - i) * 7;
    const endDaysAgo = (3 - i - 1) * 7;

    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - startDaysAgo, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - endDaysAgo, 23, 59, 59, 999);

    let masuk = 0;
    let keluar = 0;

    unifiedRecords.forEach((rec) => {
      if (rec.date >= startDate && rec.date <= endDate) {
        if (rec.type === 'masuk') {
          masuk += rec.amount;
        } else {
          keluar += rec.amount;
        }
      }
    });

    return { name: weekLabel, Masuk: masuk, Pinjam: keluar };
  });

  // Pie Data - Category Breakdown for Member
  const categoryBreakdown: { [key: string]: number } = {};
  unifiedRecords.forEach((rec) => {
    let label = 'Lainnya';
    if (rec.category === 'iuran') label = 'Iuran Kas';
    else if (rec.category === 'hutang') label = 'Pelunasan Hutang';
    else if (rec.category === 'denda') label = 'Bayar Denda';
    else if (rec.category === 'pinjaman_keluar' || rec.isLoan) label = 'Pinjaman Kas';
    else if (rec.category === 'konsumsi') label = 'Konsumsi & Snack';
    else if (rec.category === 'logistik') label = 'Alat & Logistik';
    else if (rec.type === 'keluar') label = 'Kas Keluar';
    else if (rec.type === 'masuk') label = 'Kas Masuk';

    categoryBreakdown[label] = (categoryBreakdown[label] || 0) + rec.amount;
  });

  const pieData = Object.keys(categoryBreakdown).map((name) => ({
    name,
    value: categoryBreakdown[name],
  }));

  const activeChartData = chartView === 'weekly' ? weeklyData : monthlyData;

  // Active Loans calculation
  const activeLoans = memberLoans.filter((l) => l.status === 'active' || l.status === 'overdue');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header with Avatar */}
        <div className="bg-gradient-to-r from-[#118EEA] to-[#0A6CBD] p-5 text-white relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl ${
                user.avatar_color || 'bg-blue-600'
              } p-1 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-white/40 flex-shrink-0`}
            >
              {user.avatar_initial}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-heading truncate">{user.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stats.badgeColor}`}>
                  Skor: {stats.skorKepatuhan}/100 • {stats.labelKepatuhan}
                </span>
                {user.is_credit_frozen && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    ⚠️ Kredit Dibekukan
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {user.phone_number || 'Tanpa no. HP'}
                </span>
                {user.instagram && (
                  <span className="flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5" />
                    {user.instagram}
                  </span>
                )}
                {user.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-[#2B2F38]">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Disetor</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-700 font-heading">
                Rp {formatRupiah(stats.totalMasuk)}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                Pekan ini: Rp {formatRupiah(stats.masukPekanIni)}
              </span>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[11px] font-bold text-rose-800 uppercase block">Total Pinjam / Hutang</span>
              <span className="text-sm sm:text-base font-extrabold text-rose-700 font-heading">
                Rp {formatRupiah(stats.sisaHutang)}
              </span>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                {stats.sisaHutang > 0 ? `Sisa: Rp ${formatRupiah(stats.sisaHutang)}` : 'Hutang lunas'}
              </span>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-800 uppercase block">Sisa Limit Kredit</span>
              <span className="text-sm sm:text-base font-extrabold text-[#118EEA] font-heading">
                Rp {formatRupiah(user.credit_limit ?? 20000)}
              </span>
              <span className="text-[10px] text-blue-600 block mt-0.5">
                Maks: Rp {formatRupiah(state.config.default_credit_limit || 20000)}
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Denda Tertunggak</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-700 font-heading">
                Rp {formatRupiah(stats.dendaTertunda)}
              </span>
              <span className="text-[10px] text-amber-600 block mt-0.5">Sanksi keterlambatan</span>
            </div>
          </div>

          {/* Pending 3-Day Auto Credit Restorations Alert */}
          {stats.pendingRestorations.length > 0 && (
            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                <Clock className="w-4 h-4 text-[#118EEA]" />
                <span>Pemulihan Kredit Otomatis Sedang Berjalan (Aturan 3 Hari)</span>
              </div>
              <div className="space-y-1 text-xs text-sky-800">
                {stats.pendingRestorations.map((item) => {
                  const restoreDate = new Date(item.restore_due_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg"
                    >
                      <span>Pelunasan Rp {formatRupiah(item.repaid_amount)}</span>
                      <span className="font-semibold text-[#118EEA]">Pulih pada: {restoreDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chart Section: Diagram Batang & Pie Pizza */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#118EEA]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Grafik Rekam Jejak Transaksi & Pinjaman ({chartView === 'weekly' ? '7 Hari Terakhir' : '4 Pekan Terakhir'})
                </h3>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setChartView('weekly')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      chartView === 'weekly' ? 'bg-[#118EEA] text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    1 Pekan
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('monthly')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      chartView === 'monthly' ? 'bg-[#118EEA] text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    1 Bulan
                  </button>
                </div>

                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`p-1 rounded-md transition-all ${
                      chartType === 'bar' ? 'bg-slate-200 text-[#118EEA]' : 'text-slate-400'
                    }`}
                    title="Diagram Batang"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('pie')}
                    className={`p-1 rounded-md transition-all ${
                      chartType === 'pie' ? 'bg-slate-200 text-[#118EEA]' : 'text-slate-400'
                    }`}
                    title="Diagram Pie / Pizza"
                  >
                    <PieIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Render */}
            <div className="h-56 w-full pt-2">
              {chartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="Masuk" fill="#10B981" radius={[4, 4, 0, 0]} name="Kas Masuk (Setoran)" />
                    <Bar dataKey="Pinjam" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pinjaman / Kas Keluar" />
                  </BarChart>
                </ResponsiveContainer>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data transaksi/pinjaman untuk diagram pie.
                </div>
              )}
            </div>
          </div>

          {/* Sisa Hutang Aktif Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Daftar Hutang & Pinjaman Belum Lunas ({activeLoans.length})</span>
            </h3>

            {activeLoans.length === 0 ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Anggota ini tidak memiliki sisa hutang atau tunggakan kas.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-rose-900">
                        Pinjaman: Rp {formatRupiah(loan.amount)} (Sisa Hutang: Rp {formatRupiah(loan.remaining_amount)})
                      </div>
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        Jatuh Tempo: {new Date(loan.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        {loan.notes && ` • ${loan.notes}`}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-rose-600 text-white font-bold text-[10px] shrink-0">
                      {loan.status === 'overdue' ? 'Lewat Tempo' : 'Aktif'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trackrecord Transaksi Lengkap (Kapan Bayar, Berapa, Kapan Hutang, Berapa) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#118EEA]" />
              <span>Trackrecord Riwayat Transaksi & Pinjaman ({unifiedRecords.length} Record)</span>
            </h3>

            {unifiedRecords.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                Belum ada trackrecord transaksi atau pinjaman tercatat untuk anggota ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {unifiedRecords.map((rec) => {
                  const isMasuk = rec.type === 'masuk';
                  return (
                    <div
                      key={rec.id}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isMasuk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isMasuk ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {rec.category === 'iuran'
                              ? 'Setoran Iuran Kas'
                              : rec.category === 'hutang'
                              ? 'Pelunasan Hutang Pinjaman'
                              : rec.category === 'denda'
                              ? 'Pembayaran Denda'
                              : rec.category === 'pinjaman_keluar' || rec.isLoan
                              ? 'Pencairan Pinjaman (Dana Talangan)'
                              : rec.category === 'konsumsi'
                              ? 'Pengeluaran Konsumsi / Snack'
                              : rec.category === 'logistik'
                              ? 'Pengeluaran Logistik & Alat'
                              : rec.notes || 'Transaksi Kas'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {rec.date.toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {rec.method ? `• Metode ${rec.method.toUpperCase()}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-extrabold font-heading ${
                            isMasuk ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isMasuk ? '+' : '-'} Rp {formatRupiah(rec.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div>
            {onDeleteMember && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Hapus Anggota"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenKasKeluar(user);
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pinjamkan Kas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenKasMasuk(user);
              }}
              className="px-4 py-2 bg-[#118EEA] hover:bg-[#0A6CBD] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Catat Kas Masuk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Member Confirmation Modal */}
      {onDeleteMember && (
        <DeleteMemberConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          user={user}
          state={state}
          onConfirmDelete={(userId) => {
            setShowDeleteModal(false);
            onClose();
            onDeleteMember(userId);
          }}
        />
      )}
    </div>
  );
};
