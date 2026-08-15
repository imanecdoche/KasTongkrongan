import React, { useState } from 'react';
import { User, PaymentMethod, TransactionCategory } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, ArrowDownLeft, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface KasMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  preSelectedMemberId?: string;
  preSelectedCategory?: TransactionCategory;
  onSuccess: (data: {
    amount: number;
    category: TransactionCategory;
    memberId?: string;
    memberName: string;
    method: PaymentMethod;
    notes: string;
    duesPortion?: number;
    finePortion?: number;
  }) => void;
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export const KasMasukModal: React.FC<KasMasukModalProps> = ({
  isOpen,
  onClose,
  users,
  preSelectedMemberId,
  preSelectedCategory = 'iuran',
  onSuccess,
}) => {
  const [memberId, setMemberId] = useState<string>(preSelectedMemberId || (users[0]?.id || 'non_member'));
  const [customName, setCustomName] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>(preSelectedCategory);
  const [amountStr, setAmountStr] = useState<string>('20.000');
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // For iuran + denda split
  const [duesPortionStr, setDuesPortionStr] = useState<string>('20.000');
  const [finePortionStr, setFinePortionStr] = useState<string>('2.000');

  // Sync state when preSelected changes
  React.useEffect(() => {
    if (preSelectedMemberId) {
      setMemberId(preSelectedMemberId);
    } else if (users.length > 0 && memberId === 'non_member') {
      setMemberId(users[0].id);
    }
  }, [preSelectedMemberId, users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => u.id === memberId);

  // Handle amount formatting with auto thousand dots
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

    let totalAmount = 0;
    let duesPortion = 0;
    let finePortion = 0;

    if (category === 'iuran_plus_denda') {
      duesPortion = parseRupiahInput(duesPortionStr);
      finePortion = parseRupiahInput(finePortionStr);
      totalAmount = duesPortion + finePortion;
    } else {
      totalAmount = parseRupiahInput(amountStr);
    }

    if (totalAmount < 500) {
      setErrorMsg('Nominal uang masuk minimal Rp 500.');
      return;
    }

    let finalMemberName = 'Non-Anggota / Donatur';
    let finalMemberId: string | undefined = undefined;

    if (memberId !== 'non_member' && selectedUser) {
      finalMemberName = selectedUser.name;
      finalMemberId = selectedUser.id;
    } else if (customName.trim()) {
      finalMemberName = customName.trim();
    }

    let defaultNote = notes.trim();
    if (!defaultNote) {
      if (category === 'iuran') defaultNote = `Setoran Iuran Kas - ${finalMemberName}`;
      else if (category === 'hutang') defaultNote = `Pelunasan Hutang/Pinjaman - ${finalMemberName}`;
      else if (category === 'denda') defaultNote = `Pembayaran Denda - ${finalMemberName}`;
      else if (category === 'iuran_plus_denda') defaultNote = `Iuran Kas (Rp${formatRupiah(duesPortion)}) + Denda (Rp${formatRupiah(finePortion)}) - ${finalMemberName}`;
      else defaultNote = `Pemasukan Kas - ${finalMemberName}`;
    }

    onSuccess({
      amount: totalAmount,
      category,
      memberId: finalMemberId,
      memberName: finalMemberName,
      method,
      notes: defaultNote,
      duesPortion: category === 'iuran_plus_denda' ? duesPortion : undefined,
      finePortion: category === 'iuran_plus_denda' ? finePortion : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#118EEA] px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-inner">
              <ArrowDownLeft className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Catat Kas Masuk (Uang Masuk)</h2>
              <p className="text-xs text-sky-100">Pencatatan langsung oleh Bendahara</p>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Sumber Uang (Dari Siapa) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Dari Siapa (Sumber Uang) <span className="text-rose-500">*</span></span>
              {selectedUser && (
                <span className="text-[11px] font-normal text-slate-500">
                  {selectedUser.phone_number}
                </span>
              )}
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()}) {u.is_credit_frozen ? '⚠️ [Kredit Dibekukan]' : ''}
                </option>
              ))}
              <option value="non_member">+ Non-Anggota / Donatur Eksternal</option>
            </select>

            {memberId === 'non_member' && (
              <input
                type="text"
                placeholder="Ketik Nama Donatur / Sumber Uang"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] mt-2"
                required
              />
            )}
          </div>

          {/* 2. Kategori Masuk */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Kategori Uang Masuk <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'iuran', label: 'Bayar Iuran Kas', icon: '💰' },
                { id: 'hutang', label: 'Bayar Hutang/Pinjaman', icon: '🤝' },
                { id: 'denda', label: 'Bayar Denda', icon: '⚠️' },
                { id: 'iuran_plus_denda', label: 'Iuran + Denda', icon: '⚡' },
                { id: 'pemasukan_lain', label: 'Donasi / Lainnya', icon: '🎁' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id as TransactionCategory)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex flex-col justify-between ${
                    category === item.id
                      ? 'border-[#118EEA] bg-[#E7F3FE] text-[#118EEA] shadow-xs ring-1 ring-[#118EEA]'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-base mb-1">{item.icon}</span>
                  <span className="leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Input Nominal */}
          {category === 'iuran_plus_denda' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-sky-50 rounded-2xl border border-sky-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Porsi Iuran (Rp)</label>
                <input
                  type="text"
                  value={duesPortionStr}
                  onChange={(e) => setDuesPortionStr(formatRupiah(parseRupiahInput(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 text-right focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Porsi Denda (Rp)</label>
                <input
                  type="text"
                  value={finePortionStr}
                  onChange={(e) => setFinePortionStr(formatRupiah(parseRupiahInput(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 text-right focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                />
              </div>
              <div className="col-span-full pt-1 text-right text-xs font-bold text-[#118EEA]">
                Total Diterima: Rp {formatRupiah(parseRupiahInput(duesPortionStr) + parseRupiahInput(finePortionStr))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Nominal Masuk (Min. Rp 500) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Otomatis Pemisah Ribuan</span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-extrabold text-[#118EEA] font-heading">
                  Rp
                </span>
                <input
                  type="text"
                  value={amountStr}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-extrabold text-[#2B2F38] text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
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
          )}

          {/* 4. Metode Pembayaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tunai', label: '💵 Tunai / Cash' },
                { id: 'qris', label: '📱 QRIS' },
                { id: 'transfer', label: '🏦 Transfer Bank' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                    method === m.id
                      ? 'border-[#118EEA] bg-[#E7F3FE] text-[#118EEA]'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Catatan / Keterangan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Catatan / Keterangan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Iuran Minggu ke-3 Agustus, lunas pas nongkrong"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Simpan & Tambah Kas Masuk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
