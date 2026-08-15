import React, { useState, useMemo } from 'react';
import { MemberLoan, User, Transaction } from '../types';
import { formatRupiah } from '../lib/storage';
import {
  HandCoins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  Search,
  Filter,
  Users,
  Calendar,
  Sparkles,
  Receipt,
  HelpCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface LoanManagementModuleProps {
  loans: MemberLoan[];
  users: User[];
  transactions: Transaction[];
  onRepayLoan: (loan: MemberLoan) => void;
  onOpenKasKeluarLoan: () => void;
  onOpenManageCredit: (user: User) => void;
  onOpenMemberDetail?: (user: User) => void;
}

const PIE_COLORS = ['#EF4444', '#10B981', '#F59E0B', '#118EEA', '#8B5CF6', '#EC4899', '#06B6D4'];

export const LoanManagementModule: React.FC<LoanManagementModuleProps> = ({
  loans = [],
  users = [],
  transactions = [],
  onRepayLoan,
  onOpenKasKeluarLoan,
  onOpenManageCredit,
  onOpenMemberDetail,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'paid'>('all');
  
  // Chart View Options: 'borrower' (Per Peminjam), 'timeline' (Tren Waktu), 'pie' (Diagram Pie)
  const [chartMode, setChartMode] = useState<'borrower' | 'timeline' | 'pie'>('borrower');
  const [timelineRange, setTimelineRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [pieMode, setPieMode] = useState<'status' | 'member'>('status');

  // 1. Synthesize unified list of all loans from both loans state and transactions
  const allLoans: MemberLoan[] = useMemo(() => {
    const loanMap = new Map<string, MemberLoan>();

    // Add all existing loans in state
    loans.forEach((loan) => {
      loanMap.set(loan.id, { ...loan });
    });

    // Scan transactions for loan disbursements
    transactions.forEach((tx) => {
      const isLoanDisbursement =
        tx.category === 'pinjaman_keluar' ||
        (tx.direction === 'keluar' &&
          (tx.notes.toLowerCase().includes('pinjam') ||
            tx.notes.toLowerCase().includes('talangan') ||
            tx.notes.toLowerCase().includes('kas bon')));

      if (isLoanDisbursement) {
        const matchingLoanId = tx.loan_id || loanMap.get(tx.id)?.id;
        if (!matchingLoanId && !loanMap.has(tx.id)) {
          // Check if duplicate by member and amount within 1 hour
          const existing = Array.from(loanMap.values()).find(
            (l) =>
              (l.member_name.toLowerCase().trim() === tx.member_name.toLowerCase().trim() ||
                (tx.member_id && l.member_id === tx.member_id)) &&
              l.amount === tx.amount &&
              Math.abs(new Date(l.created_at || l.borrowed_at || 0).getTime() - new Date(tx.created_at).getTime()) < 3600000
          );

          if (!existing) {
            const synthesized: MemberLoan = {
              id: tx.id.startsWith('LOAN-') ? tx.id : `LOAN-${tx.id}`,
              member_id: tx.member_id || `USR-${Date.now()}`,
              member_name: tx.member_name,
              amount: tx.amount,
              remaining_amount: tx.amount,
              status: 'active',
              due_date: new Date(new Date(tx.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: tx.created_at,
              notes: tx.notes || 'Pinjaman Kas / Dana Talangan',
            };
            loanMap.set(synthesized.id, synthesized);
          }
        }
      }
    });

    return Array.from(loanMap.values()).sort(
      (a, b) =>
        new Date(b.created_at || b.borrowed_at || 0).getTime() -
        new Date(a.created_at || a.borrowed_at || 0).getTime()
    );
  }, [loans, transactions]);

  // Derive active & paid
  const activeLoans = useMemo(() => {
    return allLoans.filter((l) => {
      const isStillOwed = l.remaining_amount > 0 && l.status !== 'paid';
      return isStillOwed;
    });
  }, [allLoans]);

  const overdueLoans = useMemo(() => {
    const now = new Date();
    return activeLoans.filter((l) => new Date(l.due_date) < now);
  }, [activeLoans]);

  const paidLoans = useMemo(() => {
    return allLoans.filter((l) => l.remaining_amount === 0 || l.status === 'paid');
  }, [allLoans]);

  // Aggregate Metrics
  const totalActiveDebt = activeLoans.reduce((sum, l) => sum + l.remaining_amount, 0);
  const totalDisbursed = allLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalRepaid = totalDisbursed - totalActiveDebt;
  const repaymentRate = totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 100) : 100;
  const uniqueBorrowersCount = new Set(allLoans.map((l) => l.member_name.toLowerCase().trim())).size;

  // Filtered Loans based on search & filter
  const filteredLoans = useMemo(() => {
    return allLoans.filter((loan) => {
      const matchesSearch =
        loan.member_name.toLowerCase().includes(search.toLowerCase()) ||
        (loan.notes && loan.notes.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      const isPastDue = new Date() > new Date(loan.due_date) && loan.remaining_amount > 0 && loan.status !== 'paid';

      if (statusFilter === 'active') return loan.remaining_amount > 0 && loan.status !== 'paid';
      if (statusFilter === 'overdue') return isPastDue;
      if (statusFilter === 'paid') return loan.remaining_amount === 0 || loan.status === 'paid';
      return true;
    });
  }, [allLoans, search, statusFilter]);

  // Unified Track Record Events (both disbursements & repayments)
  const loanTimelineEvents = useMemo(() => {
    const events: {
      id: string;
      type: 'pencairan' | 'pelunasan';
      memberName: string;
      amount: number;
      date: Date;
      notes: string;
      method?: string;
      loanId?: string;
    }[] = [];

    // Add disbursements
    allLoans.forEach((loan) => {
      events.push({
        id: `DISB-${loan.id}`,
        type: 'pencairan',
        memberName: loan.member_name,
        amount: loan.amount,
        date: new Date(loan.created_at || loan.borrowed_at || Date.now()),
        notes: loan.notes || 'Pencairan Dana Talangan',
        loanId: loan.id,
      });

      // If loan has partial/full repayments recorded directly in loan object
      const repaidFromLoan = loan.amount - loan.remaining_amount;
      if (repaidFromLoan > 0 && loan.repaid_at) {
        events.push({
          id: `REPAY-AUTO-${loan.id}`,
          type: 'pelunasan',
          memberName: loan.member_name,
          amount: repaidFromLoan,
          date: new Date(loan.repaid_at),
          notes: `Pelunasan Pinjaman (Rp ${formatRupiah(repaidFromLoan)})`,
        });
      }
    });

    // Add repayment transactions
    transactions
      .filter(
        (tx) =>
          tx.category === 'hutang' ||
          tx.notes.toLowerCase().includes('hutang') ||
          tx.notes.toLowerCase().includes('pelunasan') ||
          tx.notes.toLowerCase().includes('bayar pinjam')
      )
      .forEach((tx) => {
        // Avoid duplicate if already mapped
        const exists = events.some(
          (e) => e.type === 'pelunasan' && Math.abs(e.date.getTime() - new Date(tx.created_at).getTime()) < 5000
        );
        if (!exists) {
          events.push({
            id: `REPAY-${tx.id}`,
            type: 'pelunasan',
            memberName: tx.member_name,
            amount: tx.amount,
            date: new Date(tx.created_at),
            notes: tx.notes || 'Pelunasan Hutang Pinjaman',
            method: tx.method,
          });
        }
      });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allLoans, transactions]);

  // -------------------------------------------------------------
  // CHART DATA BUILDERS
  // -------------------------------------------------------------

  // 1. DATA PER PEMINJAM (BAR CHART BY BORROWER) - ALWAYS POPULATED IF LOANS EXIST!
  const borrowerChartData = useMemo(() => {
    const memberMap: {
      [key: string]: {
        name: string;
        totalPinjam: number;
        sudahLunas: number;
        sisaHutang: number;
      };
    } = {};

    allLoans.forEach((loan) => {
      const name = loan.member_name || 'Anggota';
      if (!memberMap[name]) {
        memberMap[name] = {
          name,
          totalPinjam: 0,
          sudahLunas: 0,
          sisaHutang: 0,
        };
      }
      memberMap[name].totalPinjam += loan.amount;
      memberMap[name].sisaHutang += loan.remaining_amount;
      memberMap[name].sudahLunas += Math.max(0, loan.amount - loan.remaining_amount);
    });

    return Object.values(memberMap).sort((a, b) => b.totalPinjam - a.totalPinjam);
  }, [allLoans]);

  // 2. DATA TREN WAKTU (TIMELINE: 7 Hari, 30 Hari, Semua Riwayat)
  const timelineChartData = useMemo(() => {
    const now = new Date();

    if (timelineRange === '7d') {
      return Array.from({ length: 7 }).map((_, i) => {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 0, 0, 0, 0);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 23, 59, 59, 999);
        const dayLabel = dayStart.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

        let pinjam = 0;
        let lunas = 0;

        loanTimelineEvents.forEach((ev) => {
          if (ev.date >= dayStart && ev.date <= dayEnd) {
            if (ev.type === 'pencairan') pinjam += ev.amount;
            else lunas += ev.amount;
          }
        });

        return { name: dayLabel, Pinjaman: pinjam, Pelunasan: lunas };
      });
    }

    if (timelineRange === '30d') {
      // 4 periods of 7-8 days
      return Array.from({ length: 4 }).map((_, i) => {
        const weekLabel = `Pekan ${i + 1}`;
        const startDaysAgo = (3 - i) * 7;
        const endDaysAgo = (3 - i - 1) * 7;

        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - startDaysAgo, 0, 0, 0, 0);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - endDaysAgo, 23, 59, 59, 999);

        let pinjam = 0;
        let lunas = 0;

        loanTimelineEvents.forEach((ev) => {
          if (ev.date >= startDate && ev.date <= endDate) {
            if (ev.type === 'pencairan') pinjam += ev.amount;
            else lunas += ev.amount;
          }
        });

        return { name: weekLabel, Pinjaman: pinjam, Pelunasan: lunas };
      });
    }

    // 'all' - Group by Month
    const monthsMap: { [key: string]: { name: string; Pinjaman: number; Pelunasan: number; time: number } } = {};
    loanTimelineEvents.forEach((ev) => {
      const monthKey = `${ev.date.getFullYear()}-${ev.date.getMonth()}`;
      const monthName = ev.date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          name: monthName,
          Pinjaman: 0,
          Pelunasan: 0,
          time: new Date(ev.date.getFullYear(), ev.date.getMonth(), 1).getTime(),
        };
      }

      if (ev.type === 'pencairan') monthsMap[monthKey].Pinjaman += ev.amount;
      else monthsMap[monthKey].Pelunasan += ev.amount;
    });

    const result = Object.values(monthsMap).sort((a, b) => a.time - b.time);
    if (result.length === 0) {
      return [{ name: 'Bulan Ini', Pinjaman: 0, Pelunasan: 0 }];
    }
    return result;
  }, [timelineRange, loanTimelineEvents]);

  // 3. DATA PIE (Status & Member breakdown)
  const pieStatusData = useMemo(() => {
    return [
      { name: 'Sisa Hutang Belum Lunas', value: totalActiveDebt },
      { name: 'Pinjaman Sudah Lunas', value: totalRepaid },
    ].filter((item) => item.value > 0);
  }, [totalActiveDebt, totalRepaid]);

  const pieMemberData = useMemo(() => {
    return borrowerChartData
      .filter((b) => b.totalPinjam > 0)
      .map((b) => ({
        name: b.name,
        value: b.totalPinjam,
      }));
  }, [borrowerChartData]);

  // Check if timeline has any non-zero points
  const hasTimelineActivity = useMemo(() => {
    return timelineChartData.some((d) => d.Pinjaman > 0 || d.Pelunasan > 0);
  }, [timelineChartData]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2B2F38] font-heading">
                Pinjaman & Rekam Jejak Piutang
              </h2>
              <p className="text-xs text-[#727986]">
                Pantau sirkulasi dana talangan, status jatuh tempo, dan riwayat pelunasan kas anggota
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            type="button"
            onClick={onOpenKasKeluarLoan}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Beri Pinjaman Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Piutang Aktif</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <p className="text-base sm:text-lg font-extrabold text-rose-600 font-heading">
            Rp {formatRupiah(totalActiveDebt)}
          </p>
          <p className="text-[11px] text-slate-400">
            {activeLoans.length} pinjaman belum lunas
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Pernah Dipinjam</span>
          <p className="text-base sm:text-lg font-extrabold text-slate-800 font-heading">
            Rp {formatRupiah(totalDisbursed)}
          </p>
          <p className="text-[11px] text-slate-400">
            {allLoans.length} total transaksi pinjam
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Sudah Dilunasi</span>
          <p className="text-base sm:text-lg font-extrabold text-emerald-600 font-heading">
            Rp {formatRupiah(totalRepaid)}
          </p>
          <p className="text-[11px] text-slate-400">
            {paidLoans.length} pinjaman selesai
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tingkat Pengembalian</span>
          <p className="text-base sm:text-lg font-extrabold text-[#118EEA] font-heading">
            {repaymentRate}%
          </p>
          <p className="text-[11px] text-slate-400">
            {uniqueBorrowersCount} orang peminjam
          </p>
        </div>
      </div>

      {/* Visual Graph Section: Interactive Multi-View Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#118EEA]" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-heading">
                {chartMode === 'borrower'
                  ? 'Diagram Pinjaman & Pelunasan per Anggota'
                  : chartMode === 'timeline'
                  ? `Grafik Sirkulasi Pinjaman Kas (${timelineRange === '7d' ? '7 Hari Terakhir' : timelineRange === '30d' ? '30 Hari Terakhir' : 'Semua Riwayat'})`
                  : 'Diagram Komposisi & Porsi Piutang'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {chartMode === 'borrower'
                  ? 'Perbandingan total pinjaman, nominal terbayar, dan sisa hutang per peminjam'
                  : chartMode === 'timeline'
                  ? 'Perbandingan uang keluar (pencairan) vs uang masuk (pelunasan hutang)'
                  : 'Porsi pembagian sisa hutang dan sebaran pinjaman kas anggota'}
              </p>
            </div>
          </div>

          {/* Mode Switchers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary View Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setChartMode('borrower')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  chartMode === 'borrower' ? 'bg-[#118EEA] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Per Anggota</span>
              </button>

              <button
                type="button"
                onClick={() => setChartMode('timeline')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  chartMode === 'timeline' ? 'bg-[#118EEA] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tren Waktu</span>
              </button>

              <button
                type="button"
                onClick={() => setChartMode('pie')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  chartMode === 'pie' ? 'bg-[#118EEA] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" />
                <span>Diagram Pie</span>
              </button>
            </div>

            {/* Sub-Filter for Timeline */}
            {chartMode === 'timeline' && (
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTimelineRange('7d')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    timelineRange === '7d' ? 'bg-white text-[#118EEA] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineRange('30d')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    timelineRange === '30d' ? 'bg-white text-[#118EEA] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineRange('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    timelineRange === 'all' ? 'bg-white text-[#118EEA] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua
                </button>
              </div>
            )}

            {/* Sub-Filter for Pie */}
            {chartMode === 'pie' && (
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPieMode('status')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    pieMode === 'status' ? 'bg-white text-[#118EEA] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => setPieMode('member')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    pieMode === 'member' ? 'bg-white text-[#118EEA] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Per Peminjam
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-64 w-full pt-2">
          {/* MODE 1: PER ANGGOTA (DIAGRAM BATANG BY MEMBER) */}
          {chartMode === 'borrower' && (
            borrowerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={borrowerChartData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v / 1000}k`}
                    domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 50000)]}
                  />
                  <Tooltip
                    formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="totalPinjam" fill="#EF4444" radius={[4, 4, 0, 0]} name="Total Pinjam (Pokok)" />
                  <Bar dataKey="sudahLunas" fill="#10B981" radius={[4, 4, 0, 0]} name="Sudah Dilunasi" />
                  <Bar dataKey="sisaHutang" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Sisa Hutang" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <HandCoins className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">Belum ada transaksi pinjaman tercatat</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Klik tombol "+ Beri Pinjaman Baru" di atas untuk mencairkan pinjaman pertama anggota.
                </p>
                <button
                  type="button"
                  onClick={onOpenKasKeluarLoan}
                  className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  + Beri Pinjaman Baru
                </button>
              </div>
            )
          )}

          {/* MODE 2: TREN WAKTU (DIAGRAM BATANG BY TIMELINE) */}
          {chartMode === 'timeline' && (
            timelineChartData.length > 0 ? (
              <div className="h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${v / 1000}k`}
                      domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 50000)]}
                    />
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="Pinjaman" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pinjaman Keluar (Dicairkan)" />
                    <Bar dataKey="Pelunasan" fill="#10B981" radius={[4, 4, 0, 0]} name="Pelunasan Masuk (Dikembalikan)" />
                  </BarChart>
                </ResponsiveContainer>

                {!hasTimelineActivity && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-center rounded-xl">
                    <p className="text-xs font-bold text-slate-700">
                      Tidak ada mutasi pinjaman pada rentang {timelineRange === '7d' ? '7 hari terakhir' : '30 hari terakhir'}.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
                      Ganti rentang waktu ke "Semua" atau lihat tampilan "Per Anggota" untuk melihat total pinjaman.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTimelineRange('all')}
                        className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold shadow-2xs"
                      >
                        Lihat Semua Riwayat
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMode('borrower')}
                        className="px-3 py-1 bg-[#118EEA] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        Lihat Grafik Per Anggota
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada riwayat transaksi pinjaman dalam periode ini.
              </div>
            )
          )}

          {/* MODE 3: DIAGRAM PIE / PIZZA */}
          {chartMode === 'pie' && (
            (pieMode === 'status' ? pieStatusData : pieMemberData).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieMode === 'status' ? pieStatusData : pieMemberData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(pieMode === 'status' ? pieStatusData : pieMemberData).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
                <PieIcon className="w-8 h-8 text-slate-300 mb-1" />
                <span>Belum ada data pinjaman untuk divisualisasikan dalam diagram pie.</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari peminjam / catatan hutang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: `Semua (${allLoans.length})` },
            { id: 'active', label: `🔴 Belum Lunas (${activeLoans.length})` },
            { id: 'overdue', label: `⚠️ Lewat Tempo (${overdueLoans.length})` },
            { id: 'paid', label: `🟢 Lunas (${paidLoans.length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[#118EEA] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active & Filtered Loans Card Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span>
            {statusFilter === 'all'
              ? `Daftar Rekam Jejak Pinjaman (${filteredLoans.length})`
              : statusFilter === 'active'
              ? `Pinjaman Aktif Belum Lunas (${filteredLoans.length})`
              : statusFilter === 'overdue'
              ? `Pinjaman Melewati Jatuh Tempo (${filteredLoans.length})`
              : `Pinjaman Sudah Lunas (${filteredLoans.length})`}
          </span>
        </h3>

        {filteredLoans.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {search ? 'Tidak ada data pinjaman yang cocok dengan pencarian' : 'Tidak Ada Data Pinjaman'}
            </p>
            <p className="text-[11px] text-slate-500">
              Semua pinjaman anggota tercatat otomatis saat dicairkan melalui Kas Keluar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredLoans.map((loan) => {
              const borrower = users.find(
                (u) =>
                  u.id === loan.member_id ||
                  (u.name && loan.member_name && u.name.toLowerCase().trim() === loan.member_name.toLowerCase().trim())
              );
              const dueDate = new Date(loan.due_date);
              const isPastDue = new Date() > dueDate && loan.remaining_amount > 0;
              const isPaid = loan.remaining_amount === 0 || loan.status === 'paid';

              return (
                <div
                  key={loan.id}
                  className={`bg-white p-4.5 rounded-2xl border shadow-xs space-y-3 transition-all ${
                    isPastDue
                      ? 'border-rose-300 bg-rose-50/20'
                      : isPaid
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {borrower ? (
                        <div
                          className={`w-9 h-9 rounded-xl ${
                            borrower.avatar_color || 'bg-blue-600'
                          } text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                        >
                          {borrower.avatar_initial}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          👤
                        </div>
                      )}
                      <div>
                        <h4
                          onClick={() => borrower && onOpenMemberDetail && onOpenMemberDetail(borrower)}
                          className={`text-sm font-bold text-slate-900 font-heading ${
                            borrower ? 'hover:text-[#118EEA] cursor-pointer' : ''
                          }`}
                        >
                          {loan.member_name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{loan.notes}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        {isPaid ? 'Status:' : 'Sisa Hutang:'}
                      </span>
                      <span
                        className={`text-sm font-extrabold font-heading ${
                          isPaid ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPaid ? 'LUNAS' : `Rp ${formatRupiah(loan.remaining_amount)}`}
                      </span>
                    </div>
                  </div>

                  {/* Loan Details Meta */}
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Pinjaman Pokok Awal:</span>
                      <strong className="text-slate-800">Rp {formatRupiah(loan.amount)}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tanggal Pinjam:</span>
                      <span className="font-medium text-slate-700">
                        {new Date(loan.created_at || loan.borrowed_at || Date.now()).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Batas Jatuh Tempo:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isPastDue ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {dueDate.toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {isPastDue && ' (Lewat Tempo)'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    {borrower ? (
                      <button
                        type="button"
                        onClick={() => onOpenManageCredit(borrower)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#118EEA] flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldAlert className="w-3 h-3 text-[#118EEA]" />
                        <span>Sisa Limit (Rp {formatRupiah(borrower.credit_limit ?? 20000)})</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Peminjam Manual</span>
                    )}

                    {!isPaid ? (
                      <button
                        type="button"
                        onClick={() => onRepayLoan(loan)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Catat Pelunasan</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full ml-auto">
                        ✓ Lunas Terbayar
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Riwayat Lengkap Mutasi & Aktivitas Pinjaman */}
      {loanTimelineEvents.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#118EEA]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Log Mutasi Sirkulasi Pinjaman & Pelunasan ({loanTimelineEvents.length} Entri)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Semua riwayat kas talangan</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {loanTimelineEvents.map((ev) => {
              const isPencairan = ev.type === 'pencairan';
              return (
                <div
                  key={ev.id}
                  className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPencairan ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isPencairan ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {isPencairan ? `Pencairan Pinjaman: ${ev.memberName}` : `Pelunasan Hutang: ${ev.memberName}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ev.date.toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        {ev.notes && `• ${ev.notes}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-extrabold font-heading ${
                        isPencairan ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isPencairan ? '- ' : '+ '}Rp {formatRupiah(ev.amount)}
                    </span>
                    <span
                      className={`block text-[10px] font-bold ${
                        isPencairan ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isPencairan ? 'Uang Keluar' : 'Kas Masuk'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
