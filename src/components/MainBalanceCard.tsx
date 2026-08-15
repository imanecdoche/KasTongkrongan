import React from 'react';
import { formatRupiah } from '../lib/storage';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  HandCoins,
  AlertCircle,
  Share2,
  Copy,
  Check,
  FileText,
} from 'lucide-react';

interface MainBalanceCardProps {
  saldoKasSaatIni: number;
  totalKasMasuk: number;
  totalKasKeluar: number;
  totalMasukBulanIni: number;
  totalKeluarBulanIni: number;
  totalHutangBeredar: number;
  totalDendaTercatat: number;
  totalAnggota: number;
  onOpenKasMasuk: () => void;
  onOpenKasKeluar: () => void;
  onCopySummary: () => void;
  onNavigateToReport?: () => void;
}

export const MainBalanceCard: React.FC<MainBalanceCardProps> = ({
  saldoKasSaatIni,
  totalKasMasuk,
  totalKasKeluar,
  totalMasukBulanIni,
  totalKeluarBulanIni,
  totalHutangBeredar,
  totalDendaTercatat,
  totalAnggota,
  onOpenKasMasuk,
  onOpenKasKeluar,
  onCopySummary,
  onNavigateToReport,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    onCopySummary();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {/* Primary Card: DANA Signature Blue */}
      <div className="bg-gradient-to-br from-[#118EEA] via-[#0D7DD4] to-[#085EAF] text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-[#118EEA]/20 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#34C759]/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                Saldo Kas Tongkrongan (Realtime)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-sky-200 font-heading">Rp</span>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-heading">
                  {formatRupiah(saldoKasSaatIni)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={onNavigateToReport}
                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/25 cursor-pointer shadow-xs"
                  title="Buka Halaman Laporan & Ekspor"
                >
                  <FileText className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Lihat Laporan</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
                title="Salin Ringkasan Kas ke WhatsApp"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Bagikan ke WA'}</span>
              </button>
            </div>
          </div>

          {/* TWO PRIMARY ACTION BUTTONS: KAS MASUK & KAS KELUAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* 🟢 TOMBOL KAS MASUK */}
            <button
              type="button"
              onClick={onOpenKasMasuk}
              className="py-4 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-950/20 border border-emerald-400/40 transition-all flex items-center justify-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
                <ArrowDownLeft className="w-6 h-6 text-emerald-100" />
              </div>
              <div className="text-left">
                <span className="block text-base sm:text-lg font-black font-heading leading-tight">
                  + Kas Masuk
                </span>
                <span className="block text-xs font-medium text-emerald-100">
                  Iuran, Hutang, Denda & Donasi
                </span>
              </div>
            </button>

            {/* 🔴 TOMBOL KAS KELUAR */}
            <button
              type="button"
              onClick={onOpenKasKeluar}
              className="py-4 px-5 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white rounded-2xl font-black text-base shadow-lg shadow-rose-950/20 border border-rose-400/40 transition-all flex items-center justify-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
                <ArrowUpRight className="w-6 h-6 text-rose-100" />
              </div>
              <div className="text-left">
                <span className="block text-base sm:text-lg font-black font-heading leading-tight">
                  - Kas Keluar
                </span>
                <span className="block text-xs font-medium text-rose-100">
                  Pinjaman Anggota & Operasional
                </span>
              </div>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-sky-200">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>Total Masuk</span>
              </div>
              <p className="text-sm font-bold mt-1 text-white font-heading">
                Rp {formatRupiah(totalKasMasuk)}
              </p>
              <span className="text-[10px] text-sky-200/80 block">
                30 hari: Rp {formatRupiah(totalMasukBulanIni)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-sky-200">
                <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                <span>Total Keluar</span>
              </div>
              <p className="text-sm font-bold mt-1 text-white font-heading">
                Rp {formatRupiah(totalKasKeluar)}
              </p>
              <span className="text-[10px] text-sky-200/80 block">
                30 hari: Rp {formatRupiah(totalKeluarBulanIni)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-sky-200">
                <HandCoins className="w-3.5 h-3.5 text-amber-300" />
                <span>Piutang Pinjaman</span>
              </div>
              <p className="text-sm font-bold mt-1 text-white font-heading">
                Rp {formatRupiah(totalHutangBeredar)}
              </p>
              <span className="text-[10px] text-amber-200/80 block">Di tangan anggota</span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-sky-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                <span>Denda Tertunda</span>
              </div>
              <p className="text-sm font-bold mt-1 text-white font-heading">
                Rp {formatRupiah(totalDendaTercatat)}
              </p>
              <span className="text-[10px] text-rose-200/80 block">Akumulasi sanksi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
