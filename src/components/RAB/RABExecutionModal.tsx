import React, { useState, useEffect } from 'react';
import { RABPlan, PaymentMethod } from '../../types';
import { formatRupiah, parseRupiahInput, calculateRABSummary } from '../../lib/storage';
import {
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface RABExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  rab: RABPlan;
  availableCashBalance: number;
  onExecute: (data: {
    amount: number;
    method: PaymentMethod;
    notes: string;
  }) => void;
}

export const RABExecutionModal: React.FC<RABExecutionModalProps> = ({
  isOpen,
  onClose,
  rab,
  availableCashBalance,
  onExecute,
}) => {
  const summary = calculateRABSummary(rab);
  const [inputRaw, setInputRaw] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set default initial amount to needed amount or available cash, whichever is smaller
  useEffect(() => {
    if (isOpen) {
      const defaultAmount = Math.min(summary.remainingNeeded, Math.max(0, availableCashBalance));
      setInputRaw(defaultAmount > 0 ? formatRupiah(defaultAmount) : '');
      setNotes(`Alokasi Dana Kas Rencana: ${rab.name} (PJ: ${rab.pic_name})`);
      setError(null);
    }
  }, [isOpen, rab, summary.remainingNeeded, availableCashBalance]);

  if (!isOpen) return null;

  const currentNumericAmount = parseRupiahInput(inputRaw);

  const handleQuickPercent = (percent: number) => {
    if (availableCashBalance <= 0) return;
    const calc = Math.floor((availableCashBalance * percent) / 100);
    setInputRaw(formatRupiah(calc));
    setError(null);
  };

  const handleMatchNeeded = () => {
    const calc = Math.min(summary.remainingNeeded, Math.max(0, availableCashBalance));
    setInputRaw(formatRupiah(calc));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentNumericAmount <= 0) {
      setError('Nominal alokasi dana harus lebih dari 0.');
      return;
    }

    if (currentNumericAmount > availableCashBalance) {
      setError(
        `Nominal alokasi (Rp ${formatRupiah(currentNumericAmount)}) melebihi saldo kas utama yang tersedia (Rp ${formatRupiah(availableCashBalance)}).`
      );
      return;
    }

    onExecute({
      amount: currentNumericAmount,
      method,
      notes: notes.trim() || `Alokasi Kas RAB: ${rab.name}`,
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
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Eksekusi Alokasi Kas ke RAB</h3>
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
          {/* Summary Metric Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Saldo Kas Utama Tersedia:</span>
              <span className={`font-bold ${availableCashBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Rp {formatRupiah(availableCashBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Kebutuhan RAB:</span>
              <span className="font-bold text-slate-800">Rp {formatRupiah(summary.totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Sudah Dialokasikan:</span>
              <span className="font-semibold text-blue-600">Rp {formatRupiah(summary.allocatedAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
              <span className="text-slate-700 font-bold">Sisa Belum Teralokasi:</span>
              <span className="font-bold text-amber-600">Rp {formatRupiah(summary.remainingNeeded)}</span>
            </div>
          </div>

          {/* Quick Percentage Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">
              Pilih Cepat (% dari Kas Utama):
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  disabled={availableCashBalance <= 0}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                >
                  {pct}%
                </button>
              ))}
            </div>
            {summary.remainingNeeded > 0 && availableCashBalance >= summary.remainingNeeded && (
              <button
                type="button"
                onClick={handleMatchNeeded}
                className="w-full mt-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Penuhi Sisa RAB (Rp {formatRupiah(summary.remainingNeeded)})</span>
              </button>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Nominal yang Dialokasikan:
            </label>
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
            <label className="text-xs font-bold text-slate-700 block">Metode Pengeluaran Kas:</label>
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

          {/* Warning / Explanation */}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Dana kas utama akan langsung dipotong dan tercatat sebagai transaksi keluar resmi di buku jurnal mutasi & laporan kas.
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
              disabled={availableCashBalance <= 0 || currentNumericAmount <= 0}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Konfirmasi Eksekusi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
