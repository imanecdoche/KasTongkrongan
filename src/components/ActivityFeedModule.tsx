import React, { useState } from 'react';
import { Transaction, TransactionDirection } from '../types';
import { formatRupiah } from '../lib/storage';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Receipt,
  Download,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface ActivityFeedModuleProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
}

export const ActivityFeedModule: React.FC<ActivityFeedModuleProps> = ({
  transactions,
  onSelectTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'masuk' | 'keluar'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.member_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.notes.toLowerCase().includes(search.toLowerCase()) ||
      tx.method.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (directionFilter !== 'all' && tx.direction !== directionFilter) return false;
    return true;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'iuran':
        return 'Iuran Kas';
      case 'hutang':
        return 'Pelunasan Hutang';
      case 'denda':
        return 'Pembayaran Denda';
      case 'iuran_plus_denda':
        return 'Iuran + Denda';
      case 'pemasukan_lain':
        return 'Donasi / Lainnya';
      case 'pinjaman_keluar':
        return 'Pinjaman Keluar';
      case 'konsumsi':
        return 'Konsumsi / Snack';
      case 'logistik':
        return 'Alat & Logistik';
      case 'alokasi_rab':
        return 'Alokasi RAB Kegiatan';
      case 'pengembalian_rab':
        return 'Pengembalian Sisa RAB';
      case 'pengeluaran_lain':
        return 'Operasional Lain';
      default:
        return category;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Title & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2B2F38] font-heading flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#118EEA]" />
              <span>Buku Kas & Mutasi Realtime</span>
            </h2>
            <p className="text-xs text-[#727986] mt-0.5">
              Seluruh riwayat aliran uang kas masuk dan keluar tercatat otomatis & transparan
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
            Total {transactions.length} Transaksi
          </span>
        </div>

        {/* Search & Filter Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi, nama anggota, catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'masuk', label: '🟢 Kas Masuk' },
              { id: 'keluar', label: '🔴 Kas Keluar' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDirectionFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  directionFilter === f.id
                    ? 'bg-[#118EEA] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada transaksi kas yang sesuai dengan pencarian.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isMasuk = tx.direction === 'masuk';
            const dateObj = new Date(tx.created_at);

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isMasuk
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isMasuk ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                        {tx.member_name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isMasuk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {getCategoryLabel(tx.category)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{tx.notes}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>{dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">{tx.method}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm sm:text-base font-extrabold font-heading block ${
                      isMasuk ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isMasuk ? '+' : '-'} Rp {formatRupiah(tx.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Klik buka struk</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
