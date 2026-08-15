import React, { useState } from 'react';
import { User } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, ShieldAlert, ShieldCheck, Plus, Minus, Check, RefreshCw } from 'lucide-react';

interface ManageCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, data: {
    credit_limit: number;
    is_credit_frozen: boolean;
    freeze_reason?: string;
    unpaid_fine: number;
  }) => void;
}

export const ManageCreditModal: React.FC<ManageCreditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  if (!isOpen || !user) return null;

  const [creditLimit, setCreditLimit] = useState<number>(user.credit_limit ?? 20000);
  const [creditStr, setCreditStr] = useState<string>(formatRupiah(user.credit_limit ?? 20000));
  const [isFrozen, setIsFrozen] = useState<boolean>(!!user.is_credit_frozen);
  const [freezeReason, setFreezeReason] = useState<string>(user.freeze_reason || '');
  const [fineStr, setFineStr] = useState<string>(formatRupiah(user.unpaid_fine || 0));

  const handleCreditChange = (val: string) => {
    const num = parseRupiahInput(val);
    setCreditLimit(num);
    setCreditStr(num > 0 ? formatRupiah(num) : '');
  };

  const handleModifyCredit = (delta: number) => {
    const newLimit = Math.max(0, creditLimit + delta);
    setCreditLimit(newLimit);
    setCreditStr(formatRupiah(newLimit));
  };

  const handleResetDefault = () => {
    setCreditLimit(20000);
    setCreditStr('20.000');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, {
      credit_limit: creditLimit,
      is_credit_frozen: isFrozen,
      freeze_reason: isFrozen ? freezeReason.trim() : undefined,
      unpaid_fine: parseRupiahInput(fineStr),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#118EEA] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-heading">Wewenang Kredit & Status Anggota</h2>
            <p className="text-xs text-sky-100">Kelola plafon pinjaman & sanksi</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Member Card Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${user.avatar_color} text-white flex items-center justify-center font-bold text-sm font-heading shadow-xs`}>
                {user.avatar_initial}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.phone_number} • {user.role.toUpperCase()}</p>
              </div>
            </div>
            {isFrozen ? (
              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-extrabold border border-rose-300 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                DIBEKUKAN
              </span>
            ) : (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-extrabold border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                KREDIT AKTIF
              </span>
            )}
          </div>

          {/* 1. Plafon Kredit Pinjaman */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                Plafon Jatah Kredit Pinjaman (Default 20K)
              </label>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] font-semibold text-[#118EEA] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset 20K
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#118EEA]">
                Rp
              </span>
              <input
                type="text"
                value={creditStr}
                onChange={(e) => handleCreditChange(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-slate-800 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              />
            </div>

            {/* Quick Increment/Decrement by Bendahara */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleModifyCredit(5000)}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> 5K
              </button>
              <button
                type="button"
                onClick={() => handleModifyCredit(10000)}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> 10K
              </button>
              <button
                type="button"
                onClick={() => handleModifyCredit(-5000)}
                className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3" /> 5K
              </button>
              <button
                type="button"
                onClick={() => handleModifyCredit(-10000)}
                className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3" /> 10K
              </button>
            </div>
          </div>

          {/* 2. Status Bekukan / Freeze Kredit */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Status Pembekuan Kredit
                </label>
                <p className="text-[11px] text-slate-500">
                  Jika dibekukan, anggota tidak dapat meminjam kas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFrozen(!isFrozen)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isFrozen ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isFrozen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isFrozen && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-rose-700">Alasan Pembekuan</label>
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Contoh: Belum melunasi pinjaman sebelumnya / jarang hadir"
                  className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>
            )}
          </div>

          {/* 3. Denda Tertunda */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Akumulasi Denda Belum Bayar (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                Rp
              </span>
              <input
                type="text"
                value={fineStr}
                onChange={(e) => setFineStr(formatRupiah(parseRupiahInput(e.target.value)))}
                className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Ubah ke 0 jika denda dihapus/diampuni oleh kesepakatan tongkrongan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
