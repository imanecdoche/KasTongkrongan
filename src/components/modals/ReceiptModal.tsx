import React from 'react';
import { X, CheckCircle2, AlertCircle, Clock, ShieldCheck, Share2, Copy, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const isIncome = ['due_payment', 'loan_repayment', 'fine_payment'].includes(transaction.type);

  const getTypeName = (type: string) => {
    switch (type) {
      case 'due_payment':
        return 'Iuran Kas Mingguan';
      case 'loan_disbursement':
        return 'Pencairan Dana Talangan';
      case 'loan_repayment':
        return 'Pelunasan Dana Talangan';
      case 'fine_payment':
        return 'Pembayaran Denda Keterlambatan';
      case 'pocket_allocation':
        return 'Alokasi Antar Pocket Kas';
      case 'expense':
        return 'Pengeluaran Kas / Logistik';
      default:
        return 'Transaksi Kas';
    }
  };

  const copyReceiptText = () => {
    const text = `BUKTI TRANSAKSI KASTONGKRONGAN
ID: ${transaction.id}
Tipe: ${getTypeName(transaction.type)}
Nama: ${transaction.user_name}
Nominal: Rp${transaction.amount.toLocaleString('id-ID')}
Metode: ${transaction.method.toUpperCase()}
Status: ${transaction.status.toUpperCase()}
Tanggal: ${new Date(transaction.created_at).toLocaleString('id-ID')}
Verifikator: ${transaction.verified_by || 'Sistem Kas'}
Catatan: ${transaction.notes}`;

    navigator.clipboard.writeText(text);
    alert('Rincian resi berhasil disalin!');
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        id="receipt-modal-container"
        className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
      >
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
                isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#118EEA]'
              }`}
            >
              {isIncome ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <p className="text-xs text-[#727986] font-medium">{getTypeName(transaction.type)}</p>
            <h2 className="text-2xl font-black text-[#2B2F38] mt-1 font-heading">
              Rp{transaction.amount.toLocaleString('id-ID')}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{transaction.status === 'verified' ? 'BERHASIL & TERVERIFIKASI' : transaction.status.toUpperCase()}</span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">ID Transaksi</span>
              <span className="font-mono font-medium text-[#2B2F38]">{transaction.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Nama Anggota</span>
              <span className="font-semibold text-[#2B2F38]">{transaction.user_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Metode Pembayaran</span>
              <span className="font-semibold text-[#2B2F38] uppercase">{transaction.method}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Waktu Transaksi</span>
              <span className="text-[#2B2F38]">{new Date(transaction.created_at).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#727986]">Diverifikasi Oleh</span>
              <span className="font-medium text-[#118EEA]">{transaction.verified_by || 'Sistem Kas'}</span>
            </div>
            <div className="py-1">
              <span className="text-[#727986] block mb-1">Catatan / Keterangan</span>
              <p className="p-2.5 bg-[#F5F6F8] rounded-lg text-slate-700 leading-relaxed border border-slate-200">
                {transaction.notes}
              </p>
            </div>
          </div>

          {/* Mini QR stamp */}
          <div className="pt-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-[#2B2F38]">KasTongkrongan Digital Trust</p>
              <p className="text-[10px] text-[#727986]">Tervalidasi di buku kas komunal</p>
            </div>
            <div className="w-9 h-9 border border-slate-800 bg-white p-1 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900" />
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
