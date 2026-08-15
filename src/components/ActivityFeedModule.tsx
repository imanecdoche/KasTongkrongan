import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ActivityFeedModuleProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  totalKasKomunal: number;
}

export const ActivityFeedModule: React.FC<ActivityFeedModuleProps> = ({
  transactions,
  onSelectTransaction,
  totalKasKomunal,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredTransactions = transactions.filter((tx) => {
    const matchSearch =
      tx.user_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.notes.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case 'due_payment':
        return {
          label: 'Iuran Masuk',
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          amountClass: 'text-emerald-600',
          prefix: '+',
        };
      case 'loan_disbursement':
        return {
          label: 'Pencairan Pinjaman',
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-[#118EEA]" />,
          bg: 'bg-[#E7F3FE] text-[#118EEA] border-[#118EEA]/30',
          amountClass: 'text-[#118EEA]',
          prefix: '-',
        };
      case 'loan_repayment':
        return {
          label: 'Pelunasan Pinjaman',
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          amountClass: 'text-emerald-600',
          prefix: '+',
        };
      case 'fine_payment':
        return {
          label: 'Denda Keterlambatan',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          amountClass: 'text-rose-600',
          prefix: '+',
        };
      case 'pocket_allocation':
        return {
          label: 'Alokasi Pocket',
          icon: <Layers className="w-3.5 h-3.5 text-amber-600" />,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          amountClass: 'text-amber-700',
          prefix: '⇄',
        };
      case 'expense':
        return {
          label: 'Pengeluaran Logistik',
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          amountClass: 'text-rose-600',
          prefix: '-',
        };
      default:
        return {
          label: 'Transaksi',
          icon: <FileText className="w-3.5 h-3.5 text-slate-600" />,
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          amountClass: 'text-slate-900',
          prefix: '',
        };
    }
  };

  const copyWhatsAppRecap = () => {
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let message = `*REKAPITULASI MUTASI KAS TONGKRONGAN*\n`;
    message += `Per Tanggal: ${dateStr}\n`;
    message += `Total Saldo Kas: Rp${totalKasKomunal.toLocaleString('id-ID')}\n\n`;
    message += `*5 AKTIVITAS TERBARU:*\n`;

    transactions.slice(0, 5).forEach((tx, idx) => {
      const isPlus = ['due_payment', 'loan_repayment', 'fine_payment'].includes(tx.type);
      message += `${idx + 1}. [${isPlus ? 'MASUK' : 'KELUAR'}] Rp${tx.amount.toLocaleString('id-ID')} - ${tx.user_name} (${tx.notes})\n`;
    });

    message += `\n_Laporan ini dibuat otomatis oleh Sistem KasTongkrongan Terpadu._`;

    navigator.clipboard.writeText(message);
    alert('Format rekap pesan WhatsApp berhasil disalin ke clipboard!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#2B2F38] font-heading flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#118EEA]" />
            <span>MUTASI & AUDIT TRAIL KAS</span>
          </h2>
          <p className="text-xs text-[#727986] mt-0.5">
            Catatan pembukuan terbuka dan terverifikasi untuk seluruh anggota
          </p>
        </div>

        <button
          onClick={copyWhatsAppRecap}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-none shrink-0"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Rekap WhatsApp</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua Mutasi' },
            { id: 'due_payment', label: 'Iuran' },
            { id: 'loan_disbursement', label: 'Talangan' },
            { id: 'loan_repayment', label: 'Pelunasan' },
            { id: 'fine_payment', label: 'Denda' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-[#118EEA] text-white'
                  : 'bg-[#F5F6F8] text-[#727986] hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi / nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA] w-full sm:w-52"
          />
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {filteredTransactions.map((tx) => {
          const badge = getTransactionBadge(tx.type);

          return (
            <div
              key={tx.id}
              onClick={() => onSelectTransaction(tx)}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${badge.bg}`}>
                  {badge.icon}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2B2F38]">{tx.user_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#727986] line-clamp-1">{tx.notes}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(tx.created_at).toLocaleString('id-ID')} • Metode: {tx.method.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
                <span className={`text-sm font-extrabold font-heading ${badge.amountClass}`}>
                  {badge.prefix} Rp {tx.amount.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#118EEA] font-semibold group-hover:underline">
                  Lihat Resi &gt;
                </span>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="py-12 text-center text-xs text-[#727986]">
            Tidak ada data transaksi yang sesuai filter.
          </div>
        )}
      </div>
    </div>
  );
};
