import React, { useState } from 'react';
import { RABPlan, RABItem, RABItemPriority, RABStatus, User } from '../../types';
import { RABUnitCombobox } from './RABUnitCombobox';
import { formatAmountK, parseRupiahInput, calculateRABSummary } from '../../lib/storage';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calendar,
  MapPin,
  User as UserIcon,
  Tag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface RABEditorProps {
  initialPlan?: RABPlan;
  members: User[];
  onSave: (plan: RABPlan) => void;
  onCancel: () => void;
}

const DEFAULT_ITEM = (): RABItem => ({
  id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  name: '',
  unit: 'pcs',
  qty: 1,
  unit_price: 0,
  subtotal: 0,
  priority: 'wajib',
  notes: '',
});

export const RABEditor: React.FC<RABEditorProps> = ({
  initialPlan,
  members,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialPlan?.name || '');
  const [picName, setPicName] = useState(initialPlan?.pic_name || '');
  const [eventDate, setEventDate] = useState(initialPlan?.event_date || '');
  const [location, setLocation] = useState(initialPlan?.location || '');
  const [status, setStatus] = useState<RABStatus>(initialPlan?.status || 'draft');
  const [notes, setNotes] = useState(initialPlan?.notes || '');

  const [items, setItems] = useState<RABItem[]>(
    initialPlan?.items && initialPlan.items.length > 0
      ? initialPlan.items
      : [DEFAULT_ITEM()]
  );

  const [error, setError] = useState<string | null>(null);

  // Update Item Field
  const updateItem = (index: number, patch: Partial<RABItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, ...patch };

      // Auto compute subtotal
      const qty = typeof patch.qty !== 'undefined' ? patch.qty : updated.qty;
      const unitPrice = typeof patch.unit_price !== 'undefined' ? patch.unit_price : updated.unit_price;
      updated.subtotal = Math.max(0, qty * unitPrice);

      next[index] = updated;
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, DEFAULT_ITEM()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setItems([DEFAULT_ITEM()]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate live total
  const totalBudget = items.reduce((acc, it) => acc + (it.subtotal || 0), 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama Rencana Kegiatan wajib diisi.');
      return;
    }
    if (!picName.trim()) {
      setError('Penanggung Jawab (PJ) wajib diisi.');
      return;
    }

    // Filter out completely blank items if more than 1
    const validItems = items.filter((it) => it.name.trim().length > 0 || it.unit_price > 0);
    if (validItems.length === 0) {
      setError('Minimal tambahkan 1 item barang dalam rancangan biaya.');
      return;
    }

    const calculatedTotal = validItems.reduce((acc, it) => acc + it.subtotal, 0);

    const plan: RABPlan = {
      id: initialPlan?.id || 'rab_' + Date.now(),
      name: name.trim(),
      pic_name: picName.trim(),
      event_date: eventDate.trim(),
      location: location.trim(),
      items: validItems,
      total_budget: calculatedTotal,
      allocated_amount: initialPlan?.allocated_amount || 0,
      status: initialPlan?.status || status,
      notes: notes.trim(),
      created_at: initialPlan?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executed_at: initialPlan?.executed_at,
    };

    onSave(plan);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 font-mono">
      {/* Editor Top Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {initialPlan ? 'Edit Rancangan Anggaran Biaya (RAB)' : 'Buat RAB Rencana Baru'}
            </h3>
            <p className="text-[11px] text-slate-400">1 Rencana = 1 Kegiatan Tongkrongan</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan RAB</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Nama Rencana */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-800 block">
              1. Nama Rencana Kegiatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Camping Gunung Salak / Bakar-Bakar Tahun Baru"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* 2. PJ */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">
              2. Penanggung Jawab (PJ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama PJ"
                list="member-names-list"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
              <datalist id="member-names-list">
                {members.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 3. Status Rencana */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">Status Rencana</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RABStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="draft">Draft (Perencanaan)</option>
              <option value="dialokasikan">Dialokasikan (Aktif)</option>
              <option value="selesai">Selesai (Terlaksana)</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* 4. Waktu */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">3. Waktu Pelaksanaan</label>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="Contoh: Sabtu, 28 Des 2026 (19.00 WIB)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* 5. Tempat */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-800 block">4. Tempat / Lokasi</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Villa Pak Haji, Puncak / Teras Tongkrongan"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* 6. Catatan Rencana */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-slate-800 block">Catatan / Keterangan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional: syarat iuran tambahan dll"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Items Table Builder */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              5. Rincian Anggaran Barang & Layanan
            </h4>
            <p className="text-[11px] text-slate-500">
              Isi nama barang, satuan (combobox), jumlah, dan harga satuan (otomatis subtotal).
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 self-start sm:self-auto shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Baris</span>
          </button>
        </div>

        {/* Item Rows List */}
        <div className="space-y-2.5">
          {items.map((item, index) => {
            return (
              <div
                key={item.id || index}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors"
              >
                {/* Top row: Number, Name, Priority, and Delete */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Item Name */}
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="Nama barang / logistik / sewa..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />

                  {/* Priority selector */}
                  <select
                    value={item.priority}
                    onChange={(e) =>
                      updateItem(index, { priority: e.target.value as RABItemPriority })
                    }
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      item.priority === 'wajib'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : item.priority === 'sekunder'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : item.priority === 'opsional'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <option value="wajib">Wajib</option>
                    <option value="sekunder">Sekunder</option>
                    <option value="opsional">Opsional</option>
                    <option value="cadangan">Cadangan</option>
                  </select>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom row: Unit Combobox, Qty, Unit Price (Divider auto), Subtotal */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200 text-xs">
                  {/* Satuan (Combobox) */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">Satuan:</span>
                    <RABUnitCombobox
                      value={item.unit}
                      onChange={(unitVal) => updateItem(index, { unit: unitVal })}
                    />
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">Jumlah (Qty):</span>
                    <input
                      type="number"
                      min="1"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(index, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Harga Satuan (Otomatis divider, tanpa simbol Rp) */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">
                      Harga Satuan (Divider):
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.unit_price > 0 ? (item.unit_price).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const num = parseRupiahInput(e.target.value);
                        updateItem(index, { unit_price: num });
                      }}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Subtotal (Otomatis + format k) */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">Sub Total:</span>
                    <div className="px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>{formatAmountK(item.subtotal)}</span>
                      <span className="text-[10px] text-slate-500">
                        ({(item.subtotal || 0).toLocaleString('id-ID')})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Summary Footer */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              TOTAL ESTIMASI ANGGARAN (RAB)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatAmountK(totalBudget)}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                (Rp {totalBudget.toLocaleString('id-ID')})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
            >
              + Tambah Item
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Rancangan</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
