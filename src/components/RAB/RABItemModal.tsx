import React, { useState, useEffect } from 'react';
import { RABItem, RABItemPriority } from '../../types';
import { RABUnitCombobox } from './RABUnitCombobox';
import { formatAmountK, parseRupiahInput } from '../../lib/storage';
import {
  X,
  Check,
  Plus,
  Minus,
  Tag,
  Layers,
  Calculator,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface RABItemModalProps {
  isOpen: boolean;
  item: RABItem | null;
  onSave: (item: RABItem) => void;
  onClose: () => void;
}

const QUICK_UNITS = ['pcs', 'kg', 'pack', 'porsi', 'set', 'liter', 'box', 'paket'];

const PRIORITY_CONFIG: Record<
  RABItemPriority,
  { label: string; sublabel: string; color: string; activeClass: string; bgClass: string; borderClass: string }
> = {
  wajib: {
    label: 'Wajib',
    sublabel: 'Prioritas Utama',
    color: 'rose',
    activeClass: 'bg-rose-500 text-white border-rose-500 shadow-xs shadow-rose-500/30',
    bgClass: 'bg-rose-50/70 hover:bg-rose-100/70 text-rose-700 border-rose-200',
    borderClass: 'border-rose-300',
  },
  sekunder: {
    label: 'Sekunder',
    sublabel: 'Sangat Perlu',
    color: 'amber',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs shadow-amber-500/30',
    bgClass: 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 border-amber-200',
    borderClass: 'border-amber-300',
  },
  opsional: {
    label: 'Opsional',
    sublabel: 'Pelengkap Acara',
    color: 'blue',
    activeClass: 'bg-[#118EEA] text-white border-[#118EEA] shadow-xs shadow-blue-500/30',
    bgClass: 'bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 border-blue-200',
    borderClass: 'border-blue-300',
  },
  cadangan: {
    label: 'Cadangan',
    sublabel: 'Jika Dana Sisa',
    color: 'slate',
    activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs shadow-slate-700/30',
    bgClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    borderClass: 'border-slate-300',
  },
};

export const RABItemModal: React.FC<RABItemModalProps> = ({
  isOpen,
  item,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priority, setPriority] = useState<RABItemPriority>('wajib');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize data when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name || '');
        setUnit(item.unit || 'pcs');
        setQty(item.qty > 0 ? item.qty : 1);
        setUnitPrice(item.unit_price || 0);
        setPriority(item.priority || 'wajib');
        setNotes(item.notes || '');
      } else {
        // Reset for new item
        setName('');
        setUnit('pcs');
        setQty(1);
        setUnitPrice(0);
        setPriority('wajib');
        setNotes('');
      }
      setErrorMessage(null);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const subtotal = Math.max(0, qty * unitPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama barang atau logistik wajib diisi.');
      return;
    }
    if (qty <= 0) {
      setErrorMessage('Jumlah (Qty) minimal 1.');
      return;
    }

    const newItem: RABItem = {
      id: item?.id || 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      unit: unit.trim() || 'pcs',
      qty: Math.max(1, qty),
      unit_price: Math.max(0, unitPrice),
      subtotal: Math.max(0, qty * unitPrice),
      priority: priority,
      notes: notes.trim(),
    };

    onSave(newItem);
    onClose();
  };

  const handleStepQty = (delta: number) => {
    setQty((prev) => Math.max(1, prev + delta));
  };

  return (
    <div
      id="rab-item-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rab-item-modal-container"
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-50 border-b border-slate-100">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#118EEA]/20 border border-[#118EEA]/40 text-[#118EEA] flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                {item ? 'Edit Item Anggaran' : 'Tambah Item Anggaran'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Lengkapi rincian kuantitas, harga, dan tingkat prioritas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-mono text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Nama Barang / Logistik */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>
                Nama Barang / Layanan <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] font-normal text-slate-500">Contoh: Arang Briket, Tenda 4P</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ketik nama barang / sewa / konsumsi..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA] transition-all"
              />
            </div>
          </div>

          {/* 2. Prioritas Pengadaan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Tingkat Prioritas</span>
              <span className="text-[10px] font-normal text-slate-500">Menentukan urgensi pembelanjaan</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PRIORITY_CONFIG) as RABItemPriority[]).map((pKey) => {
                const conf = PRIORITY_CONFIG[pKey];
                const isSelected = priority === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPriority(pKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? conf.activeClass
                        : `${conf.bgClass} border-slate-200`
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold tracking-tight">{conf.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className={`text-[9px] mt-0.5 ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {conf.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Satuan & Qty (Jumlah) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Satuan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Satuan Ukuran <span className="text-rose-500">*</span>
              </label>
              <RABUnitCombobox
                value={unit}
                onChange={(u) => setUnit(u)}
                placeholder="Pilih / ketik satuan..."
              />
              {/* Quick unit chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_UNITS.map((qu) => (
                  <button
                    key={qu}
                    type="button"
                    onClick={() => setUnit(qu)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                      unit.toLowerCase() === qu.toLowerCase()
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {qu}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty Stepper */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Jumlah (Qty) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepQty(-1)}
                  disabled={qty <= 1}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty || ''}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-center py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
                />
                <button
                  type="button"
                  onClick={() => handleStepQty(1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors border border-slate-200 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Total: {qty} {unit}
              </p>
            </div>
          </div>

          {/* 4. Harga Satuan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>
                Harga Satuan (Rp) <span className="text-rose-500">*</span>
              </span>
              {unitPrice > 0 && (
                <span className="text-[10px] font-bold text-[#118EEA]">
                  Rp {unitPrice.toLocaleString('id-ID')} / {unit}
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                Rp
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={unitPrice > 0 ? unitPrice.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const val = parseRupiahInput(e.target.value);
                  setUnitPrice(val);
                }}
                placeholder="0"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
              />
            </div>
            {/* Quick price helper buttons */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[5000, 10000, 20000, 50000, 100000, 250000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUnitPrice(preset)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                >
                  +{preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Subtotal Calculated Display Card */}
          <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Calculator className="w-3.5 h-3.5 text-sky-400" />
                Subtotal Kalkulasi:
              </span>
              <span className="text-[10px] text-slate-400">
                {qty} {unit} × Rp {unitPrice.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xl sm:text-2xl font-black text-sky-400 tracking-tight">
                Rp {subtotal.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-500/30">
                {formatAmountK(subtotal)}
              </span>
            </div>
          </div>

          {/* 6. Catatan Item (Opsional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Beli di Pasar Rebo, merk X, atau sewa di toko Y..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#118EEA] hover:bg-[#0D7FD4] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{item ? 'Simpan Perubahan' : 'Tambahkan ke Daftar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
