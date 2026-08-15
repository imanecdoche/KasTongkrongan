import React, { useState, useMemo, useRef } from 'react';
import { AppState, formatRupiah, calculateMemberStats } from '../lib/storage';
import { User, Transaction, TransactionCategory } from '../types';
import {
  FileText,
  Download,
  Image as ImageIcon,
  Printer,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Clock,
  Sparkles,
  Search,
  Receipt,
  FileCheck,
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
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ReportModuleProps {
  state: AppState;
  onShowToast: (msg: string) => void;
}

type ReportPeriodType = 'mingguan' | 'bulanan' | 'tahunan' | 'per_anggota';
type ChartType = 'bar' | 'pie';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const PIE_COLORS = ['#10B981', '#EF4444', '#118EEA', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

// Helper format tanggal singkat TT/BB (contoh: 16/8)
const formatShortDate = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// Helper ambil nama depan saja
const getFirstName = (fullName: string): string => {
  if (!fullName) return '-';
  return fullName.trim().split(/\s+/)[0];
};

// Helper metode transaksi: C (Tunai/Cash) atau T (Non-tunai/Transfer/QRIS)
const getMethodCode = (method: string): string => {
  const m = (method || '').toLowerCase();
  if (m === 'cash' || m === 'tunai' || m.includes('cash') || m.includes('tunai')) {
    return 'C';
  }
  return 'T';
};

// Helper format nominal singkat dengan suffix 'k' (contoh: 5.000 -> 5k, 5.500 -> 5,5k, 12.000 -> 12k, 12.250 -> 12,25k)
const formatAmountK = (amount: number): string => {
  const kVal = (amount || 0) / 1000;
  const formatted = kVal.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return `${formatted}k`;
};

// Helper nama kategori ringkas
const getCategoryShortName = (cat: string): string => {
  switch (cat) {
    case 'iuran':
      return 'Iuran';
    case 'pinjaman_keluar':
      return 'Pinjaman';
    case 'konsumsi':
      return 'Konsumsi';
    case 'logistik':
      return 'Logistik';
    case 'denda':
      return 'Denda';
    case 'hutang':
      return 'Pelunasan';
    case 'lainnya':
      return 'Lainnya';
    default:
      return cat.replace(/_/g, ' ');
  }
};

export const ReportModule: React.FC<ReportModuleProps> = ({ state, onShowToast }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Report Period Selection
  const [reportType, setReportType] = useState<ReportPeriodType>('bulanan');
  
  // Date/Period States
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = Minggu ini, 1 = 1 minggu lalu, dst.
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    state.users.length > 0 ? state.users[0].id : ''
  );

  // Visualization Options
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [pieCategoryFilter, setPieCategoryFilter] = useState<'all' | 'masuk' | 'keluar'>('all');

  // Export Loading States
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // 1. Calculate Date Bounds based on report type
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;
    let title: string;
    let subtitle: string;

    if (reportType === 'mingguan') {
      const today = new Date();
      // Calculate end of week (Sunday or today - weekOffset)
      const currentDay = today.getDay(); // 0 is Sunday
      const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      
      const monday = new Date(today);
      monday.setDate(diffToMonday - selectedWeekOffset * 7);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start = monday;
      end = sunday;

      title = `Laporan Kas Mingguan (${selectedWeekOffset === 0 ? 'Pekan Ini' : `${selectedWeekOffset} Pekan Lalu`})`;
      subtitle = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (reportType === 'bulanan') {
      start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      title = `Laporan Kas Bulanan - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      subtitle = `Periode 1 ${MONTH_NAMES[selectedMonth]} ${selectedYear} - ${end.getDate()} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    } else if (reportType === 'tahunan') {
      start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      title = `Laporan Kas Tahunan - Tahun ${selectedYear}`;
      subtitle = `Periode 1 Januari ${selectedYear} - 31 Desember ${selectedYear}`;
    } else {
      // Per Anggota (Semua riwayat transaksi anggota terpilih)
      const member = state.users.find((u) => u.id === selectedMemberId);
      start = new Date(2020, 0, 1);
      end = new Date(now.getFullYear() + 2, 11, 31);
      title = `Laporan Arus Kas & Rekam Jejak Anggota: ${member?.name || 'Anggota'}`;
      subtitle = `Seluruh riwayat iuran, pinjaman, denda, dan mutasi kas anggota`;
    }

    return { start, end, title, subtitle };
  }, [reportType, selectedYear, selectedMonth, selectedWeekOffset, selectedMemberId, state.users]);

  // Selected Member Object for Per-Member Report
  const selectedMember = useMemo(() => {
    return state.users.find((u) => u.id === selectedMemberId) || state.users[0] || null;
  }, [state.users, selectedMemberId]);

  const selectedMemberStats = useMemo(() => {
    if (!selectedMember) return null;
    return calculateMemberStats(selectedMember, state);
  }, [selectedMember, state]);

  // 2. Filter Transactions for the Selected Report
  const reportTransactions = useMemo(() => {
    return state.transactions.filter((tx) => {
      const txDate = new Date(tx.created_at);

      if (reportType === 'per_anggota') {
        if (!selectedMember) return false;
        const matchId = tx.member_id && tx.member_id === selectedMember.id;
        const matchName =
          tx.member_name &&
          selectedMember.name &&
          tx.member_name.toLowerCase().trim() === selectedMember.name.toLowerCase().trim();
        return matchId || matchName;
      }

      return txDate >= dateRange.start && txDate <= dateRange.end;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [state.transactions, reportType, selectedMember, dateRange]);

  // 3. Aggregate Financial Figures
  const metrics = useMemo(() => {
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalIuran = 0;
    let totalDenda = 0;
    let totalPelunasanHutang = 0;
    let totalPinjamanDicairkan = 0;
    let totalKonsumsi = 0;
    let totalLogistik = 0;
    let totalLainnya = 0;

    reportTransactions.forEach((tx) => {
      if (tx.direction === 'masuk') {
        totalMasuk += tx.amount;
        if (tx.category === 'iuran') totalIuran += tx.amount;
        else if (tx.category === 'denda') totalDenda += tx.amount;
        else if (tx.category === 'hutang') totalPelunasanHutang += tx.amount;
        else if (tx.category === 'iuran_plus_denda') {
          totalIuran += tx.dues_portion || 0;
          totalDenda += tx.fine_portion || 0;
        } else {
          totalLainnya += tx.amount;
        }
      } else {
        totalKeluar += tx.amount;
        if (tx.category === 'pinjaman_keluar') totalPinjamanDicairkan += tx.amount;
        else if (tx.category === 'konsumsi') totalKonsumsi += tx.amount;
        else if (tx.category === 'logistik') totalLogistik += tx.amount;
        else totalLainnya += tx.amount;
      }
    });

    const netCashflow = totalMasuk - totalKeluar;

    // Active debt in general or for member
    const activeDebt = state.loans
      .filter((l) => {
        if (reportType === 'per_anggota' && selectedMember) {
          return (
            (l.member_id === selectedMember.id ||
              l.member_name.toLowerCase().trim() === selectedMember.name.toLowerCase().trim()) &&
            l.remaining_amount > 0 &&
            l.status !== 'paid'
          );
        }
        return l.remaining_amount > 0 && l.status !== 'paid';
      })
      .reduce((sum, l) => sum + l.remaining_amount, 0);

    return {
      totalMasuk,
      totalKeluar,
      netCashflow,
      totalIuran,
      totalDenda,
      totalPelunasanHutang,
      totalPinjamanDicairkan,
      totalKonsumsi,
      totalLogistik,
      totalLainnya,
      activeDebt,
      txCount: reportTransactions.length,
    };
  }, [reportTransactions, state.loans, reportType, selectedMember]);

  // 4. Chart Data Builders
  // Bar Chart Data Breakdown
  const barChartData = useMemo(() => {
    if (reportType === 'mingguan') {
      // 7 Days of the Week
      const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      return Array.from({ length: 7 }).map((_, i) => {
        const dayDate = new Date(dateRange.start);
        dayDate.setDate(dateRange.start.getDate() + i);
        const dayLabel = `${days[i]} (${dayDate.getDate()}/${dayDate.getMonth() + 1})`;

        let masuk = 0;
        let keluar = 0;

        reportTransactions.forEach((tx) => {
          const tDate = new Date(tx.created_at);
          if (
            tDate.getFullYear() === dayDate.getFullYear() &&
            tDate.getMonth() === dayDate.getMonth() &&
            tDate.getDate() === dayDate.getDate()
          ) {
            if (tx.direction === 'masuk') masuk += tx.amount;
            else keluar += tx.amount;
          }
        });

        return { name: dayLabel, Masuk: masuk, Keluar: keluar };
      });
    }

    if (reportType === 'bulanan') {
      // 4 Weeks / Segments
      const totalDays = dateRange.end.getDate();
      return [
        { name: 'Pekan 1 (Tgl 1-7)', start: 1, end: 7 },
        { name: 'Pekan 2 (Tgl 8-14)', start: 8, end: 14 },
        { name: 'Pekan 3 (Tgl 15-21)', start: 15, end: 21 },
        { name: `Pekan 4 (Tgl 22-${totalDays})`, start: 22, end: totalDays },
      ].map((seg) => {
        let masuk = 0;
        let keluar = 0;

        reportTransactions.forEach((tx) => {
          const tDate = new Date(tx.created_at);
          if (
            tDate.getFullYear() === selectedYear &&
            tDate.getMonth() === selectedMonth &&
            tDate.getDate() >= seg.start &&
            tDate.getDate() <= seg.end
          ) {
            if (tx.direction === 'masuk') masuk += tx.amount;
            else keluar += tx.amount;
          }
        });

        return { name: seg.name, Masuk: masuk, Keluar: keluar };
      });
    }

    if (reportType === 'tahunan') {
      // 12 Months
      return MONTH_NAMES.map((mName, mIdx) => {
        let masuk = 0;
        let keluar = 0;

        reportTransactions.forEach((tx) => {
          const tDate = new Date(tx.created_at);
          if (tDate.getFullYear() === selectedYear && tDate.getMonth() === mIdx) {
            if (tx.direction === 'masuk') masuk += tx.amount;
            else keluar += tx.amount;
          }
        });

        return { name: mName.slice(0, 3), Masuk: masuk, Keluar: keluar };
      });
    }

    // Per Anggota -> Grouped by last 6 months or categories
    return [
      { name: 'Iuran Kas', Masuk: metrics.totalIuran, Keluar: 0 },
      { name: 'Pelunasan Hutang', Masuk: metrics.totalPelunasanHutang, Keluar: 0 },
      { name: 'Denda Kas', Masuk: metrics.totalDenda, Keluar: 0 },
      { name: 'Pinjaman Keluar', Masuk: 0, Keluar: metrics.totalPinjamanDicairkan },
    ].filter((d) => d.Masuk > 0 || d.Keluar > 0);
  }, [reportType, dateRange, reportTransactions, selectedYear, selectedMonth, metrics]);

  // Pie Chart Data Breakdown
  const pieChartData = useMemo(() => {
    if (pieCategoryFilter === 'masuk') {
      return [
        { name: 'Iuran Kas', value: metrics.totalIuran },
        { name: 'Pelunasan Hutang', value: metrics.totalPelunasanHutang },
        { name: 'Denda Keterlambatan', value: metrics.totalDenda },
        { name: 'Pemasukan Lainnya', value: metrics.totalLainnya },
      ].filter((item) => item.value > 0);
    }

    if (pieCategoryFilter === 'keluar') {
      return [
        { name: 'Pinjaman Kas Anggota', value: metrics.totalPinjamanDicairkan },
        { name: 'Konsumsi & Snack', value: metrics.totalKonsumsi },
        { name: 'Logistik & Alat', value: metrics.totalLogistik },
        { name: 'Pengeluaran Lainnya', value: metrics.totalLainnya },
      ].filter((item) => item.value > 0);
    }

    // Default 'all': Masuk vs Keluar
    return [
      { name: 'Kas Masuk (Pemasukan)', value: metrics.totalMasuk },
      { name: 'Kas Keluar (Pengeluaran)', value: metrics.totalKeluar },
    ].filter((item) => item.value > 0);
  }, [pieCategoryFilter, metrics]);

  // 5. EXPORT FUNCTION: PNG
  const handleExportPNG = async () => {
    if (!reportRef.current) return;
    try {
      setIsExportingPNG(true);
      onShowToast('⏳ Merender gambar laporan PNG kualitas tinggi...');

      // Small delay to ensure DOM is settled
      await new Promise((res) => setTimeout(res, 250));

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      const link = document.createElement('a');
      const filename = `Laporan_Kas_${reportType}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast(`✅ Laporan berhasil diunduh sebagai gambar PNG: ${filename}`);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      onShowToast('❌ Gagal mengekspor gambar PNG. Silakan coba lagi.');
    } finally {
      setIsExportingPNG(false);
    }
  };

  // 6. EXPORT FUNCTION: PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setIsExportingPDF(true);
      onShowToast('⏳ Memproses dokumen PDF formal...');

      await new Promise((res) => setTimeout(res, 250));

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      // Load image to determine aspect ratio & dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 Width in mm
      const pageHeight = 297; // A4 Height in mm
      const imgHeight = (img.height * imgWidth) / img.width;
      let heightLeft = imgHeight;
      let position = 0;

      // First Page
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Subsequent pages if content is long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const filename = `Laporan_Kas_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      onShowToast(`✅ Laporan resmi berhasil diunduh dalam format PDF: ${filename}`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      onShowToast('❌ Gagal mengekspor file PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 7. Helper Format Teks Monospace untuk WhatsApp (Menggunakan Triple Backticks ``` agar font mono di WA)
  const generateWhatsAppReportText = () => {
    const padR = (str: string, len: number) => {
      const s = String(str || '');
      if (s.length > len) return s.slice(0, len - 1) + '…';
      return s.padEnd(len, ' ');
    };

    const padL = (str: string, len: number) => {
      const s = String(str || '');
      if (s.length > len) return s.slice(0, len);
      return s.padStart(len, ' ');
    };

    let text = `📢 *LAPORAN ARUS KAS TONGKRONGAN*\n`;
    text += `📑 *${dateRange.title.toUpperCase()}*\n`;
    text += `📅 Periode: ${dateRange.subtitle}\n`;
    text += `👤 Bendahara: ${state.config.treasurer_name}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. Monospace Financial Summary Table
    text += `*💰 RINGKASAN KEUANGAN:*\n`;
    text += `\`\`\`\n`;
    text += `=========================================\n`;
    text += `  POS KEUANGAN              NOMINAL      \n`;
    text += `=========================================\n`;
    text += `${padR('Total Kas Masuk', 24)}: ${padL(`Rp ${formatRupiah(metrics.totalMasuk)}`, 14)}\n`;
    text += `${padR('Total Kas Keluar', 24)}: ${padL(`Rp ${formatRupiah(metrics.totalKeluar)}`, 14)}\n`;
    text += `-----------------------------------------\n`;
    text += `${padR('Arus Kas Bersih (Net)', 24)}: ${padL(`${metrics.netCashflow >= 0 ? '+' : ''}Rp ${formatRupiah(metrics.netCashflow)}`, 14)}\n`;
    text += `${padR('Sisa Piutang Berjalan', 24)}: ${padL(`Rp ${formatRupiah(metrics.activeDebt)}`, 14)}\n`;
    text += `${padR('Total Mutasi', 24)}: ${padL(`${reportTransactions.length} Transaksi`, 14)}\n`;
    text += `=========================================\n`;
    text += `\`\`\`\n\n`;

    // 2. Monospace Transaction Mutation Journal
    text += `*📋 JURNAL MUTASI TRANSAKSI (${reportTransactions.length} ENTRI):*\n`;
    text += `\`\`\`\n`;
    text += `==============================================\n`;
    text += `TGL    NAMA        KET           MET   NOMINAL\n`;
    text += `==============================================\n`;

    if (reportTransactions.length === 0) {
      text += `      Tidak ada transaksi pada periode ini    \n`;
    } else {
      reportTransactions.forEach((tx) => {
        const dateStr = padR(formatShortDate(tx.created_at), 6);
        const nameStr = padR(getFirstName(tx.member_name), 11);
        const catStr = padR(getCategoryShortName(tx.category), 13);
        const metStr = padR(getMethodCode(tx.method), 4);
        const amtStr = padL(formatAmountK(tx.amount), 9);

        text += `${dateStr} ${nameStr} ${catStr}  ${metStr} ${amtStr}\n`;
      });
    }
    text += `==============================================\n`;
    text += `* Catatan: C = Tunai, T = Non-Tunai\n`;
    text += `\`\`\`\n\n`;

    // 3. Member Detail / Status Table
    if (reportType === 'per_anggota' && selectedMember && selectedMemberStats) {
      text += `*👤 REKAM JEJAK ANGGOTA: ${selectedMember.name.toUpperCase()}*\n`;
      text += `\`\`\`\n`;
      text += `=========================================\n`;
      text += `${padR('Role / Peran', 20)}: ${padL(selectedMember.role.toUpperCase(), 18)}\n`;
      text += `${padR('Total Iuran & Setor', 20)}: ${padL(`Rp ${formatRupiah(selectedMemberStats.totalMasuk)}`, 18)}\n`;
      text += `${padR('Sisa Pinjaman', 20)}: ${padL(`Rp ${formatRupiah(selectedMemberStats.sisaHutang)}`, 18)}\n`;
      text += `${padR('Denda Tertunda', 20)}: ${padL(`Rp ${formatRupiah(selectedMemberStats.dendaTertunda)}`, 18)}\n`;
      text += `${padR('Sisa Limit Kredit', 20)}: ${padL(`Rp ${formatRupiah(selectedMember.credit_limit || 0)}`, 18)}\n`;
      text += `${padR('Skor Kepatuhan', 20)}: ${padL(`${selectedMemberStats.skorKepatuhan}% (${selectedMemberStats.labelKepatuhan})`, 18)}\n`;
      text += `=========================================\n`;
      text += `\`\`\`\n\n`;
    } else {
      // General member status table
      text += `*👥 STATUS ANGGOTA KAS:*\n`;
      text += `\`\`\`\n`;
      text += `==============================================\n`;
      text += `NAMA           TOTAL SETOR  SISA HUTANG  SKOR \n`;
      text += `==============================================\n`;
      state.users.forEach((u) => {
        const stats = calculateMemberStats(u, state);
        const nameCol = padR(u.name, 14);
        const setorCol = padL(formatRupiah(stats.totalMasuk), 11);
        const hutangCol = padL(formatRupiah(stats.sisaHutang), 11);
        const scoreCol = padL(`${stats.skorKepatuhan}%`, 5);
        text += `${nameCol} ${setorCol}  ${hutangCol}  ${scoreCol}\n`;
      });
      text += `==============================================\n`;
      text += `\`\`\`\n\n`;
    }

    // 4. Payment Info & Footer
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 *Informasi Pembayaran / Transfer Kas:*\n`;
    if (state.config.treasurer_bank_name) {
      text += `• Bank: *${state.config.treasurer_bank_name}* - ${state.config.treasurer_account_number} (a/n ${state.config.treasurer_name})\n`;
    }
    if (state.config.treasurer_ewallet) {
      text += `• E-Wallet (GoPay/DANA/OVO/ShopeePay): *${state.config.treasurer_ewallet}*\n`;
    }
    text += `\n_Laporan transparan dibuat otomatis via Sistem Kas Tongkrongan._`;

    return text;
  };

  // State Pratinjau Teks WhatsApp
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  // Salin Teks Ringkasan Laporan
  const handleCopyWhatsAppSummary = () => {
    const text = generateWhatsAppReportText();
    navigator.clipboard.writeText(text);
    onShowToast('📋 Format WhatsApp (Font Monospace) berhasil disalin! Kolom jurnal mutasi tertata rapi.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* 1. Header & Report Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#118EEA] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2B2F38] font-heading">
                Pusat Laporan & Ekspor Keuangan
              </h2>
              <p className="text-xs text-[#727986]">
                Cetak laporan arus kas mingguan, bulanan, tahunan, atau per anggota dalam format PNG dan PDF resmi
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={isExportingPNG || isExportingPDF}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Unduh Laporan Gambar PNG"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>{isExportingPNG ? 'Membuat PNG...' : 'Ekspor PNG'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPNG || isExportingPDF}
              className="px-3.5 py-2 bg-[#118EEA] hover:bg-[#0A6CBD] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Unduh Dokumen Resmi PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPDF ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppSummary}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Salin Pesan WhatsApp Format Monospace Rapi"
            >
              <Copy className="w-4 h-4" />
              <span>Salin WA (Mono)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWhatsAppPreview((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                showWhatsAppPreview
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Tampilkan / Sembunyikan Pratinjau Teks WhatsApp"
            >
              <Receipt className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Monospace Live Preview Block (Collapsible) */}
        {showWhatsAppPreview && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h4 className="text-xs font-bold text-slate-200 font-heading">
                  Pratinjau Format WhatsApp (JetBrains Mono / Monospace)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyWhatsAppSummary}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Teks</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Setiap kolom dirancang rata dan sejajar dengan font fixed-width (monospace) saat dikirim ke grup WhatsApp.
            </p>
            <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
              {generateWhatsAppReportText()}
            </pre>
          </div>
        )}

        {/* Report Scope Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Jenis Laporan:</span>
          </span>

          {[
            { id: 'mingguan' as const, label: '📅 Mingguan' },
            { id: 'bulanan' as const, label: '📆 Bulanan' },
            { id: 'tahunan' as const, label: '🗓️ Tahunan' },
            { id: 'per_anggota' as const, label: '👤 Per Anggota' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === tab.id
                  ? 'bg-[#118EEA] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Period Filter Controls */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
          {/* MINGGUAN */}
          {reportType === 'mingguan' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Pilih Pekan:</span>
              <select
                value={selectedWeekOffset}
                onChange={(e) => setSelectedWeekOffset(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              >
                <option value={0}>Pekan Ini (7 Hari Berjalan)</option>
                <option value={1}>1 Pekan Lalu</option>
                <option value={2}>2 Pekan Lalu</option>
                <option value={3}>3 Pekan Lalu</option>
              </select>
            </div>
          )}

          {/* BULANAN */}
          {reportType === 'bulanan' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TAHUNAN */}
          {reportType === 'tahunan' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Pilih Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PER ANGGOTA */}
          {reportType === 'per_anggota' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-600 shrink-0">Pilih Anggota:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold flex-1 sm:w-64 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chart Type Selector */}
          <div className="ml-auto flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'bar' ? 'bg-[#118EEA] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan Diagram Batang"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'pie' ? 'bg-[#118EEA] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan Diagram Lingkaran"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Pie</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE PRINTABLE & EXPORTABLE REPORT CONTAINER */}
      <div
        ref={reportRef}
        id="printable-report"
        className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 sm:p-8 space-y-6 text-slate-900 w-full overflow-hidden"
        style={{ minHeight: '600px', width: '100%', maxWidth: '100%' }}
      >
        {/* Official Report Letterhead / Header */}
        <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#118EEA] text-white flex items-center justify-center font-black text-xl shadow-md">
              KT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 font-heading uppercase tracking-wide">
                  Kas Tongkrongan
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Laporan Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sistem Pengelolaan Kas, Dana Talangan & Kepatuhan Transparan
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-700">
              Bendahara: <span className="font-bold text-slate-900">{state.config.treasurer_name}</span>
            </p>
            <p>Kontak: {state.config.treasurer_phone || '-'}</p>
            <p className="text-[11px] text-slate-400">
              Dicetak pada: {now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} pukul{' '}
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </p>
          </div>
        </div>

        {/* Report Title Banner */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold text-[#118EEA] uppercase tracking-wider block">
              Ringkasan Eksekutif
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              {dateRange.title}
            </h2>
            <p className="text-xs text-slate-500">{dateRange.subtitle}</p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Total Mutasi Tercatat</span>
            <strong className="text-sm font-extrabold text-slate-800">{metrics.txCount} Transaksi</strong>
          </div>
        </div>

        {/* Per-Member Specific Header if active */}
        {reportType === 'per_anggota' && selectedMember && selectedMemberStats && (
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl ${
                  selectedMember.avatar_color || 'bg-blue-600'
                } text-white flex items-center justify-center font-black text-lg shadow-xs`}
              >
                {selectedMember.avatar_initial}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">{selectedMember.name}</h3>
                <p className="text-xs text-slate-500">
                  WA: {selectedMember.phone_number || '-'} • Role: <span className="uppercase font-semibold">{selectedMember.role}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs w-full sm:w-auto">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Skor Kepatuhan</span>
                <span className="font-extrabold text-blue-600 text-sm">{selectedMemberStats.skorKepatuhan}%</span>
                <span className="block text-[10px] text-slate-500">({selectedMemberStats.labelKepatuhan})</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Sisa Hutang</span>
                <span className={`font-extrabold text-sm ${selectedMemberStats.sisaHutang > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Rp {formatRupiah(selectedMemberStats.sisaHutang)}
                </span>
                <span className="block text-[10px] text-slate-500">{selectedMemberStats.sisaHutang > 0 ? 'Belum Lunas' : 'Nihil'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Sisa Limit Kredit</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  Rp {formatRupiah(selectedMember.credit_limit || 0)}
                </span>
                <span className="block text-[10px] text-slate-500">Maks: Rp {formatRupiah(selectedMemberStats.plafonKredit)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4 Executive Key Financial Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Pemasukan
            </span>
            <p className="text-base sm:text-lg font-extrabold text-emerald-600 font-heading">
              + Rp {formatRupiah(metrics.totalMasuk)}
            </p>
            <span className="text-[10px] text-slate-400 block">Iuran, Denda, Pelunasan</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Pengeluaran
            </span>
            <p className="text-base sm:text-lg font-extrabold text-rose-600 font-heading">
              - Rp {formatRupiah(metrics.totalKeluar)}
            </p>
            <span className="text-[10px] text-slate-400 block">Pinjaman, Konsumsi, Logistik</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Arus Kas Bersih (Net)
            </span>
            <p
              className={`text-base sm:text-lg font-extrabold font-heading ${
                metrics.netCashflow >= 0 ? 'text-[#118EEA]' : 'text-amber-600'
              }`}
            >
              {metrics.netCashflow >= 0 ? '+' : ''} Rp {formatRupiah(metrics.netCashflow)}
            </p>
            <span className="text-[10px] text-slate-400 block">Surplus / Defisit Periode</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Sisa Piutang Berjalan
            </span>
            <p className="text-base sm:text-lg font-extrabold text-amber-600 font-heading">
              Rp {formatRupiah(metrics.activeDebt)}
            </p>
            <span className="text-[10px] text-slate-400 block">Dana talangan di anggota</span>
          </div>
        </div>

        {/* 3. VISUAL CASHFLOW CHART SECTION */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 font-heading flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#118EEA]" />
                <span>
                  {chartType === 'bar'
                    ? 'Grafik Arus Kas (Pemasukan vs Pengeluaran)'
                    : 'Diagram Distribusi & Komposisi Keuangan'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {chartType === 'bar'
                  ? 'Visualisasi pergerakan dana masuk dan dana keluar dalam rentang waktu terpilih'
                  : 'Porsi pembagian transaksi berdasarkan kategori kas'}
              </p>
            </div>

            {chartType === 'pie' && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPieCategoryFilter('all')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    pieCategoryFilter === 'all' ? 'bg-[#118EEA] text-white' : 'text-slate-600'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setPieCategoryFilter('masuk')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    pieCategoryFilter === 'masuk' ? 'bg-[#118EEA] text-white' : 'text-slate-600'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setPieCategoryFilter('keluar')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    pieCategoryFilter === 'keluar' ? 'bg-[#118EEA] text-white' : 'text-slate-600'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>
            )}
          </div>

          <div className="h-60 w-full pt-2">
            {chartType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                    domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 50000)]}
                  />
                  <Tooltip
                    formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                    contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="Masuk" fill="#10B981" radius={[4, 4, 0, 0]} name="Kas Masuk (Pemasukan)" />
                  <Bar dataKey="Keluar" fill="#EF4444" radius={[4, 4, 0, 0]} name="Kas Keluar (Pengeluaran)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatRupiah(Number(val))}`, '']}
                      contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Tidak ada data untuk divisualisasikan dalam diagram pie.
                </div>
              )
            )}
          </div>
        </div>

        {/* 4. BREAKDOWN KATEGORI TABLE */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Rincian Kategori Arus Kas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Pemasukan Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 px-3.5 py-2 border-b border-emerald-100 font-bold text-emerald-800 flex justify-between">
                <span>Kategori Kas Masuk</span>
                <span>Nominal</span>
              </div>
              <div className="p-3 space-y-2 bg-white">
                <div className="flex justify-between text-slate-600">
                  <span>Iuran Pokok Anggota</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalIuran)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pelunasan Hutang / Pinjaman</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalPelunasanHutang)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Denda Keterlambatan</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalDenda)}</strong>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-emerald-700">
                  <span>Total Pemasukan</span>
                  <span>Rp {formatRupiah(metrics.totalMasuk)}</span>
                </div>
              </div>
            </div>

            {/* Pengeluaran Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-rose-50 px-3.5 py-2 border-b border-rose-100 font-bold text-rose-800 flex justify-between">
                <span>Kategori Kas Keluar</span>
                <span>Nominal</span>
              </div>
              <div className="p-3 space-y-2 bg-white">
                <div className="flex justify-between text-slate-600">
                  <span>Pencairan Dana Talangan / Pinjaman</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalPinjamanDicairkan)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Konsumsi & Makanan Tongkrongan</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalKonsumsi)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Logistik & Perlengkapan</span>
                  <strong className="text-slate-800">Rp {formatRupiah(metrics.totalLogistik)}</strong>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-rose-700">
                  <span>Total Pengeluaran</span>
                  <span>Rp {formatRupiah(metrics.totalKeluar)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. COMPLETE TRANSACTIONS TABLE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Buku Jurnal Mutasi Transaksi Kas ({reportTransactions.length} Entri)
            </h3>
            <span className="text-[11px] text-slate-400">Urut dari terbaru</span>
          </div>

          {reportTransactions.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
              Tidak ada transaksi pada periode yang dipilih.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2 px-2 w-[14%] sm:w-[15%]">Tanggal</th>
                    <th className="py-2 px-2 w-[24%] sm:w-[24%]">Nama</th>
                    <th className="py-2 px-2 w-[30%] sm:w-[32%]">Ket</th>
                    <th className="py-2 px-1 w-[10%] sm:w-[9%] text-center">Metode</th>
                    <th className="py-2 px-2 w-[22%] sm:w-[20%] text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportTransactions.map((tx) => {
                    const isMasuk = tx.direction === 'masuk';
                    const dateShort = formatShortDate(tx.created_at);
                    const firstName = getFirstName(tx.member_name);
                    const methodCode = getMethodCode(tx.method);
                    const catName = getCategoryShortName(tx.category);
                    const amountShort = formatAmountK(tx.amount);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {dateShort}
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-800 truncate text-[11px]" title={tx.member_name}>
                          {firstName}
                        </td>
                        <td className="py-2 px-2 text-slate-600 truncate text-[11px]" title={tx.notes ? `${catName} (${tx.notes})` : catName}>
                          <span className="font-medium text-slate-700">
                            {catName}
                          </span>
                          {tx.notes && (
                            <span className="text-[10px] text-slate-400 ml-1">({tx.notes})</span>
                          )}
                        </td>
                        <td className="py-2 px-1 text-center text-[11px]">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                              methodCode === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                            title={methodCode === 'C' ? 'Tunai / Cash' : 'Non-Tunai / Transfer / QRIS'}
                          >
                            {methodCode}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap font-mono text-[11px]">
                          <span
                            className={`font-black ${
                              isMasuk ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {amountShort}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono gap-1">
                <span>* C: Tunai | T: Non-Tunai</span>
                <span>* Hijau: Masuk | Merah: Keluar (satuan: k)</span>
              </div>
            </div>
          )}
        </div>

        {/* Official Footer Verification Stamp */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-800">Dokumen Sah Kas Tongkrongan</p>
              <p className="text-[11px] text-slate-400">
                Terverifikasi secara sistem realtime dengan catatan pembukuan digital.
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="font-semibold text-slate-700">{state.config.treasurer_name}</p>
            <p className="text-[11px] text-slate-400">Bendahara Utama Tongkrongan</p>
          </div>
        </div>
      </div>
    </div>
  );
};
