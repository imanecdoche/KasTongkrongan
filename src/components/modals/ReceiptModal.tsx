import React from 'react';
import { X, CheckCircle2, ShieldCheck, Copy, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../../types';
import { formatRupiah } from '../../lib/storage';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.direction === 'masuk';

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'iuran':
        return 'Iuran Kas';
      case 'hutang':
        return 'Pelunasan Hutang/Pinjaman';
      case 'denda':
        return 'Pembayaran Denda';
      case 'iuran_plus_denda':
        return 'Iuran Kas + Denda';
      case 'pemasukan_lain':
        return 'Donasi / Pemasukan Lain';
      case 'pinjaman_keluar':
        return 'Pencairan Pinjaman ke Anggota';
      case 'konsumsi':
        return 'Beli Konsumsi & Snack';
      case 'logistik':
        return 'Alat & Perlengkapan';
      case 'alokasi_rab':
        return 'Alokasi RAB Kegiatan';
      case 'pengembalian_rab':
        return 'Pengembalian Sisa RAB';
      case 'pengeluaran_lain':
        return 'Operasional Lainnya';
      default:
        return category;
    }
  };

  const copyReceiptText = () => {
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

    let text = `🧾 *RESI BUKTI TRANSAKSI DIGITAL*\n`;
    text += `*KAS TONGKRONGAN MANDIRI*\n`;
    text += `\`\`\`\n`;
    text += `=========================================\n`;
    text += `${padR('ID Transaksi', 18)}: ${padL(transaction.id, 20)}\n`;
    text += `${padR('Jenis Mutasi', 18)}: ${padL(isIncome ? 'KAS MASUK (+)' : 'KAS KELUAR (-)', 20)}\n`;
    text += `${padR('Kategori', 18)}: ${padL(getCategoryName(transaction.category), 20)}\n`;
    text += `${padR('Nama Anggota', 18)}: ${padL(transaction.member_name, 20)}\n`;
    text += `${padR('Nominal', 18)}: ${padL(`${isIncome ? '+' : '-'}Rp ${formatRupiah(transaction.amount)}`, 20)}\n`;
    text += `${padR('Metode', 18)}: ${padL(transaction.method.toUpperCase(), 20)}\n`;
    text += `${padR('Tanggal & Waktu', 18)}: ${padL(new Date(transaction.created_at).toLocaleString('id-ID'), 20)}\n`;
    if (transaction.notes) {
      text += `-----------------------------------------\n`;
      text += `Catatan: ${transaction.notes}\n`;
    }
    text += `=========================================\n`;
    text += `STATUS: TERCATAT SAH DI BUKU KAS\n`;
    text += `\`\`\`\n`;
    text += `_Terverifikasi via Sistem Kas Tongkrongan_`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-[#118EEA] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wide font-heading">RESI DIGITAL KAS</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 space-y-4">
          <div className="text-center pb-2 border-b border-dashed border-slate-200">
            <div
              className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 ${
                isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}
            >
              {isIncome ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <p className="text-xs text-[#727986] font-medium">{getCategoryName(transaction.category)}</p>
            <h2 className="text-2xl font-black text-[#2B2F38] mt-1 font-heading">
              {isIncome ? '+' : '-'} Rp {formatRupiah(transaction.amount)}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TERCATAT DI BUKU KAS</span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">ID Transaksi</span>
              <span className="font-mono font-medium text-[#2B2F38]">{transaction.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Pihak / Anggota</span>
              <span className="font-semibold text-[#2B2F38]">{transaction.member_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Metode Pembayaran</span>
              <span className="font-semibold text-[#2B2F38] uppercase">{transaction.method}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Waktu Pencatatan</span>
              <span className="text-[#2B2F38]">{new Date(transaction.created_at).toLocaleString('id-ID')} WIB</span>
            </div>
            <div className="py-1">
              <span className="text-[#727986] block mb-1">Catatan / Keterangan</span>
              <p className="p-2.5 bg-[#F5F6F8] rounded-lg text-slate-700 leading-relaxed border border-slate-200">
                {transaction.notes}
              </p>
            </div>
          </div>

          {/* Share / Copy buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={copyReceiptText}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Resi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
