import React, { useState, useEffect } from 'react';
import { RABPlan, PaymentMethod } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, RotateCcw, AlertCircle, ArrowDownLeft } from 'lucide-react';

interface RABRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  rab: RABPlan;
  onRefund: (data: {
    amount: number;
    method: PaymentMethod;
    notes: string;
  }) => void;
}

export const RABRefundModal: React.FC<RABRefundModalProps> = ({
  isOpen,
  onClose,
  rab,
  onRefund,
}) => {
  const allocated = rab.allocated_amount || 0;
  const [inputRaw, setInputRaw] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputRaw(allocated > 0 ? formatRupiah(allocated) : '');
      setNotes(`Pengembalian Sisa Dana RAB: ${rab.name}`);
      setError(null);
    }
  }, [isOpen, rab, allocated]);

  if (!isOpen) return null;

  const currentNumericAmount = parseRupiahInput(inputRaw);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentNumericAmount <= 0) {
      setError('Nominal pengembalian harus lebih dari 0.');
      return;
    }

    if (currentNumericAmount > allocated) {
      setError(
        `Nominal pengembalian (Rp ${formatRupiah(currentNumericAmount)}) tidak boleh melebihi dana yang dialokasikan (Rp ${formatRupiah(allocated)}).`
      );
      return;
    }

    onRefund({
      amount: currentNumericAmount,
      method,
      notes: notes.trim() || `Pengembalian Dana Kas RAB: ${rab.name}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-300 overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Kembalikan Dana ke Kas Utama</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">{rab.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Dana Terverifikasi di RAB:</span>
              <span className="font-bold text-slate-800">Rp {formatRupiah(allocated)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Kebutuhan Anggaran:</span>
              <span className="font-semibold text-slate-600">Rp {formatRupiah(rab.total_budget || 0)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Nominal yang Dikembalikan:</label>
              <button
                type="button"
                onClick={() => setInputRaw(formatRupiah(allocated))}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Kembalikan Semua (100%)
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputRaw}
                onChange={(e) => {
                  const num = parseRupiahInput(e.target.value);
                  setInputRaw(num > 0 ? formatRupiah(num) : '');
                  setError(null);
                }}
                placeholder="0"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Rupiah
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Metode Penerimaan Kas:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tunai', label: 'Tunai (C)' },
                { id: 'transfer', label: 'Transfer (T)' },
                { id: 'qris', label: 'QRIS (T)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    method === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Catatan Mutasi Jurnal:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Nominal ini akan ditambahkan kembali ke Saldo Kas Utama dan dicatat sebagai mutasi kas masuk resmi.
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={allocated <= 0 || currentNumericAmount <= 0}
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Kembalikan ke Kas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
