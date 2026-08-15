import React, { useState } from 'react';
import { User, PaymentMethod, TransactionCategory } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, ArrowUpRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface KasKeluarModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  availableBalance: number;
  preSelectedMemberId?: string;
  preSelectedCategory?: TransactionCategory;
  onSuccess: (data: {
    amount: number;
    category: TransactionCategory;
    memberId?: string;
    memberName: string;
    method: PaymentMethod;
    notes: string;
    dueDate?: string;
  }) => void;
}

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000];

export const KasKeluarModal: React.FC<KasKeluarModalProps> = ({
  isOpen,
  onClose,
  users,
  availableBalance,
  preSelectedMemberId,
  preSelectedCategory = 'pinjaman_keluar',
  onSuccess,
}) => {
  const [category, setCategory] = useState<TransactionCategory>(preSelectedCategory);
  const [memberId, setMemberId] = useState<string>(preSelectedMemberId || (users[0]?.id || ''));
  const [amountStr, setAmountStr] = useState<string>('20.000');
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [notes, setNotes] = useState<string>('');
  const [loanTermDays, setLoanTermDays] = useState<number>(7);
  const [errorMsg, setErrorMsg] = useState<string>('');

  React.useEffect(() => {
    if (preSelectedMemberId) {
      setMemberId(preSelectedMemberId);
    } else if (users.length > 0 && !memberId) {
      setMemberId(users[0].id);
    }
  }, [preSelectedMemberId, users, memberId]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => u.id === memberId);

  const handleAmountChange = (raw: string) => {
    const numeric = parseRupiahInput(raw);
    if (numeric === 0) {
      setAmountStr('');
    } else {
      setAmountStr(formatRupiah(numeric));
    }
    setErrorMsg('');
  };

  const handleQuickAmount = (val: number) => {
    setAmountStr(formatRupiah(val));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = parseRupiahInput(amountStr);

    if (totalAmount < 500) {
      setErrorMsg('Nominal uang keluar minimal Rp 500.');
      return;
    }

    if (totalAmount > availableBalance) {
      const confirmExceed = window.confirm(
        `Peringatan: Saldo kas saat ini (Rp ${formatRupiah(
          availableBalance
        )}) lebih kecil dari pengeluaran (Rp ${formatRupiah(
          totalAmount
        )}). Lanjutkan dengan saldo kas minus/talangan?`
      );
      if (!confirmExceed) return;
    }

    let finalMemberName = 'Operasional Tongkrongan';
    let finalMemberId: string | undefined = undefined;
    let dueDate: string | undefined = undefined;

    if (category === 'pinjaman_keluar') {
      if (!selectedUser) {
        setErrorMsg('Silakan pilih anggota peminjam dana talangan.');
        return;
      }
      if (selectedUser.is_credit_frozen) {
        const confirmFrozen = window.confirm(
          `Peringatan: Plafon kredit ${selectedUser.name} saat ini sedang DIBEKUKAN oleh Bendahara. Tetap cairkan pinjaman khusus ini?`
        );
        if (!confirmFrozen) return;
      }
      finalMemberName = selectedUser.name;
      finalMemberId = selectedUser.id;
      dueDate = new Date(Date.now() + loanTermDays * 24 * 60 * 60 * 1000).toISOString();
    }

    let defaultNote = notes.trim();
    if (!defaultNote) {
      if (category === 'pinjaman_keluar') defaultNote = `Pinjaman Dana Talangan - ${finalMemberName} (Tempo ${loanTermDays} hari)`;
      else if (category === 'konsumsi') defaultNote = 'Beli Konsumsi / Snack Tongkrongan';
      else if (category === 'logistik') defaultNote = 'Beli Alat / Perlengkapan Tongkrongan';
      else defaultNote = 'Pengeluaran Operasional Kas';
    }

    onSuccess({
      amount: totalAmount,
      category,
      memberId: finalMemberId,
      memberName: finalMemberName,
      method,
      notes: defaultNote,
      dueDate,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-600 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-inner">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Catat Kas Keluar (Uang Keluar)</h2>
              <p className="text-xs text-rose-100">Pinjaman anggota atau pengeluaran operasional</p>
            </div>
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
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Kategori Pengeluaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Kategori Uang Keluar <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pinjaman_keluar', label: 'Pinjaman / Dana Talangan', icon: '🤝' },
                { id: 'konsumsi', label: 'Konsumsi & Snack', icon: '☕' },
                { id: 'logistik', label: 'Alat & Perlengkapan', icon: '📦' },
                { id: 'pengeluaran_lain', label: 'Operasional Lainnya', icon: '🏷️' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id as TransactionCategory)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2.5 ${
                    category === item.id
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs ring-1 ring-rose-400'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Jika Pinjaman Keluar -> Pilih Anggota */}
          {category === 'pinjaman_keluar' && (
            <div className="space-y-3 p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex justify-between items-center">
                  <span>Anggota Peminjam <span className="text-rose-500">*</span></span>
                  {selectedUser && (
                    <span className="text-[11px] font-medium text-slate-600">
                      Plafon: Rp {formatRupiah(selectedUser.credit_limit || 20000)}
                    </span>
                  )}
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Jatah Kredit: Rp {formatRupiah(u.credit_limit || 20000)}) {u.is_credit_frozen ? '⚠️ [DIBEKUKAN]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser?.is_credit_frozen && (
                <div className="p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Plafon Kredit Dibekukan!</span>
                    <p className="text-[11px] text-rose-700">
                      {selectedUser.freeze_reason || 'Kredit pinjaman dibekukan oleh bendahara.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tenor / Batas Waktu Pelunasan</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '7 Hari (1 Pekan)' },
                    { days: 14, label: '14 Hari (2 Pekan)' },
                    { days: 30, label: '30 Hari (1 Bulan)' },
                  ].map((t) => (
                    <button
                      key={t.days}
                      type="button"
                      onClick={() => setLoanTermDays(t.days)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                        loanTermDays === t.days
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-amber-300 bg-white text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Input Nominal Keluar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                Nominal Keluar (Min. Rp 500) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Otomatis Pemisah Ribuan</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-extrabold text-rose-600 font-heading">
                Rp
              </span>
              <input
                type="text"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-extrabold text-[#2B2F38] text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Rp {formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Metode Pengeluaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Metode Pengeluaran</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tunai', label: '💵 Tunai / Cash Kas' },
                { id: 'transfer', label: '🏦 Transfer Rekening' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                    method === m.id
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Catatan / Keperluan</label>
            <input
              type="text"
              placeholder="Contoh: Beli kopi sachet & gorengan, atau pinjaman mendesak ganti ban"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Simpan & Catat Kas Keluar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
