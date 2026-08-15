import React, { useState, useEffect } from 'react';
import { User, PaymentMethod, TransactionCategory } from '../../types';
import { formatRupiah, parseRupiahInput } from '../../lib/storage';
import { SearchableCombobox, ComboboxOption } from '../SearchableCombobox';
import {
  X,
  ArrowUpRight,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';

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

const KELUAR_CATEGORY_OPTIONS: ComboboxOption[] = [
  {
    value: 'pinjaman_keluar',
    label: 'Pinjaman / Dana Talangan (Hutang)',
    icon: '🤝',
    badge: 'Pinjaman',
    badgeColor: 'amber',
    description: 'Pencairan pinjaman kas ke anggota dengan pelacakan hutang',
  },
  {
    value: 'konsumsi',
    label: 'Konsumsi & Snack Tongkrongan',
    icon: '☕',
    badge: 'Konsumsi',
    badgeColor: 'blue',
    description: 'Beli kopi sachet, gorengan, cemilan, atau rokok tongkrongan',
  },
  {
    value: 'logistik',
    label: 'Alat & Perlengkapan / Logistik',
    icon: '📦',
    badge: 'Logistik',
    badgeColor: 'purple',
    description: 'Beli alat posko, sound, tikar, galon air, atau alat kebersihan',
  },
  {
    value: 'pengeluaran_lain',
    label: 'Operasional Kas Lainnya',
    icon: '🏷️',
    badge: 'Operasional',
    badgeColor: 'slate',
    description: 'Biaya admin, sumbangan keluar, atau keperluan mendadak',
  },
];

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
  const [memberId, setMemberId] = useState<string>(preSelectedMemberId || (users[0]?.id || 'manual'));
  const [manualBorrowerName, setManualBorrowerName] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('20.000');
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [notes, setNotes] = useState<string>('');
  const [loanTermDays, setLoanTermDays] = useState<number>(7);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [allowCreditDispensation, setAllowCreditDispensation] = useState<boolean>(false);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setCategory(preSelectedCategory || 'pinjaman_keluar');
      if (preSelectedMemberId) {
        setMemberId(preSelectedMemberId);
      } else if (users.length > 0) {
        setMemberId(users[0].id);
      } else {
        setMemberId('manual');
      }
      setAmountStr('20.000');
      setErrorMsg('');
      setAllowCreditDispensation(false);
    }
  }, [isOpen, preSelectedCategory, preSelectedMemberId, users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => u.id === memberId);
  const currentCredit = selectedUser?.credit_limit ?? 20000;
  const currentAmount = parseRupiahInput(amountStr);
  const isExceedingCredit = category === 'pinjaman_keluar' && selectedUser && currentAmount > currentCredit;

  // Generate Combobox options for Members
  const memberOptions: ComboboxOption[] = [
    ...users.map((u) => ({
      value: u.id,
      label: u.name,
      icon: (
        <span
          className={`w-5 h-5 rounded-full ${u.avatar_color} text-white flex items-center justify-center text-[10px] font-bold`}
        >
          {u.avatar_initial}
        </span>
      ),
      badge: u.is_credit_frozen
        ? 'DIBEKUKAN'
        : `Limit: Rp ${formatRupiah(u.credit_limit ?? 20000)}`,
      badgeColor: (u.is_credit_frozen ? 'rose' : 'emerald') as any,
      description: `${u.role.toUpperCase()} • ${u.phone_number || 'Tanpa No. HP'}`,
    })),
    {
      value: 'manual',
      label: '+ Ketik Nama Peminjam / Penerima Manual',
      icon: '✍️',
      badge: 'Manual',
      badgeColor: 'slate',
      description: 'Untuk anggota baru yang belum terdaftar di sistem',
    },
  ];

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

    let finalMemberName = 'Operasional Tongkrongan';
    let finalMemberId: string | undefined = undefined;
    let dueDate: string | undefined = undefined;

    if (category === 'pinjaman_keluar') {
      if (memberId === 'manual') {
        if (!manualBorrowerName.trim()) {
          setErrorMsg('Silakan ketik nama peminjam dana talangan.');
          return;
        }
        finalMemberName = manualBorrowerName.trim();
        finalMemberId = undefined;
      } else if (selectedUser) {
        if (selectedUser.is_credit_frozen && !allowCreditDispensation) {
          setErrorMsg(
            `Plafon kredit ${selectedUser.name} sedang DIBEKUKAN. Aktifkan centang dispensasi untuk tetap mencairkan pinjaman.`
          );
          return;
        }

        if (totalAmount > currentCredit && !allowCreditDispensation) {
          setErrorMsg(
            `Nominal pinjaman (Rp ${formatRupiah(totalAmount)}) melebihi sisa plafon kredit (Rp ${formatRupiah(
              currentCredit
            )}). Centang dispensasi di bawah jika Bendahara mengizinkan.`
          );
          return;
        }

        finalMemberName = selectedUser.name;
        finalMemberId = selectedUser.id;
      } else {
        setErrorMsg('Silakan pilih anggota peminjam.');
        return;
      }

      dueDate = new Date(Date.now() + loanTermDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      if (memberId !== 'manual' && selectedUser) {
        finalMemberName = selectedUser.name;
        finalMemberId = selectedUser.id;
      } else if (manualBorrowerName.trim()) {
        finalMemberName = manualBorrowerName.trim();
      }
    }

    let defaultNote = notes.trim();
    if (!defaultNote) {
      if (category === 'pinjaman_keluar') {
        defaultNote = `Pinjaman Dana Talangan - ${finalMemberName} (Tempo ${loanTermDays} hari)`;
      } else if (category === 'konsumsi') {
        defaultNote = 'Beli Konsumsi & Snack Tongkrongan';
      } else if (category === 'logistik') {
        defaultNote = 'Beli Alat / Perlengkapan Tongkrongan';
      } else {
        defaultNote = 'Pengeluaran Operasional Kas';
      }
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
              <h2 className="text-base font-bold font-heading">
                {category === 'pinjaman_keluar' ? 'Catat Pinjaman / Kas Keluar' : 'Catat Kas Keluar (Pengeluaran)'}
              </h2>
              <p className="text-xs text-rose-100">
                {category === 'pinjaman_keluar'
                  ? 'Beri pinjaman dana talangan & kurangi kredit anggota'
                  : 'Catat pengeluaran operasional tongkrongan'}
              </p>
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

          {/* 1. Searchable Combobox Kategori Pengeluaran */}
          <div className="space-y-1.5">
            <SearchableCombobox
              id="kategori-keluar-combobox"
              label="Kategori Pengeluaran"
              required
              options={KELUAR_CATEGORY_OPTIONS}
              value={category}
              onChange={(val) => {
                setCategory(val as TransactionCategory);
                setErrorMsg('');
              }}
              placeholder="Cari atau pilih kategori kas keluar..."
              searchPlaceholder="Ketik nama kategori (pinjaman, konsumsi, dll)..."
            />
          </div>

          {/* 2. Jika Pinjaman Keluar -> Pilih Anggota Peminjam (Searchable Combobox) */}
          {category === 'pinjaman_keluar' ? (
            <div className="space-y-3.5 p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
              <div className="space-y-1">
                <SearchableCombobox
                  id="peminjam-combobox"
                  label="Anggota Peminjam Dana Talangan"
                  required
                  options={memberOptions}
                  value={memberId}
                  onChange={(val) => {
                    setMemberId(val);
                    setErrorMsg('');
                  }}
                  placeholder="Cari nama anggota peminjam..."
                  searchPlaceholder="Ketik nama atau no HP anggota..."
                />
              </div>

              {/* Input nama manual jika pilih manual */}
              {memberId === 'manual' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nama Peminjam / Penerima <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik nama peminjam di sini..."
                    value={manualBorrowerName}
                    onChange={(e) => setManualBorrowerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              )}

              {/* Status Kredit Info Card */}
              {selectedUser && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Sisa Plafon Kredit:</span>
                    <span className="font-extrabold text-amber-800 font-heading">
                      Rp {formatRupiah(currentCredit)}
                    </span>
                  </div>
                  {selectedUser.is_credit_frozen && (
                    <div className="pt-1 flex items-center gap-1.5 text-rose-700 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Status Kredit: Dibekukan</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dispensation Checkbox if Exceeding Limit or Frozen */}
              {(isExceedingCredit || (selectedUser && selectedUser.is_credit_frozen)) && (
                <div className="p-3 bg-amber-100/90 border border-amber-300 rounded-xl text-xs space-y-2">
                  <div className="flex items-start gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Izin Khusus Bendahara:</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        {isExceedingCredit
                          ? `Nominal pinjaman melebihi sisa jatah kredit anggota ini (Rp ${formatRupiah(
                              currentCredit
                            )}).`
                          : 'Plafon kredit anggota ini saat ini dibekukan.'}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={allowCreditDispensation}
                      onChange={(e) => {
                        setAllowCreditDispensation(e.target.checked);
                        setErrorMsg('');
                      }}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Izinkan & setujui pinjaman ini (Otorisasi Bendahara)</span>
                  </label>
                </div>
              )}

              {/* Tenor / Batas Waktu */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tenor / Waktu Pelunasan:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 3, label: '3 Hari' },
                    { days: 7, label: '7 Hari (1 Pekan)' },
                    { days: 14, label: '14 Hari (2 Pekan)' },
                  ].map((t) => (
                    <button
                      key={t.days}
                      type="button"
                      onClick={() => setLoanTermDays(t.days)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        loanTermDays === t.days
                          ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                          : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-100/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Option Penerima untuk pengeluaran non-pinjaman */
            <div className="space-y-1">
              <SearchableCombobox
                id="penerima-combobox"
                label="Penerima / Penanggung Jawab (Opsional)"
                options={memberOptions}
                value={memberId}
                onChange={(val) => setMemberId(val)}
                placeholder="Pilih anggota yang membelanjakan..."
                searchPlaceholder="Cari nama anggota..."
              />
            </div>
          )}

          {/* 3. Input Nominal Keluar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                Nominal Pinjaman / Uang Keluar <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Auto Pemisah Ribuan</span>
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

          {/* Saldo Warning Note (Soft warning without iframe blocking) */}
          {currentAmount > availableBalance && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Pengeluaran lebih besar dari saldo kas saat ini (Rp {formatRupiah(availableBalance)}). Kas akan tercatat minus/talangan.
              </span>
            </div>
          )}

          {/* 4. Metode Pengeluaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Metode Penyerahan Dana</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tunai', label: '💵 Tunai / Cash Kas' },
                { id: 'transfer', label: '🏦 Transfer Bank / E-Wallet' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                    method === m.id
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Keperluan / Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Pinjaman darurat bensin motor, atau konsumsi nongkrong"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {category === 'pinjaman_keluar' ? 'Simpan & Berikan Pinjaman' : 'Simpan & Catat Kas Keluar'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
