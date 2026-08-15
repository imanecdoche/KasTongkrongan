import React, { useState, useMemo } from 'react';
import { RABPlan, RABItem, RABItemPriority, RABStatus, User } from '../../types';
import { RABItemModal } from './RABItemModal';
import { formatAmountK, calculateRABSummary } from '../../lib/storage';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowLeft,
  Calendar,
  MapPin,
  User as UserIcon,
  Search,
  X,
  Layers,
  AlertCircle,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  Info,
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

const PRIORITY_BADGES: Record<
  RABItemPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  wajib: {
    label: 'Wajib',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  sekunder: {
    label: 'Sekunder',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  opsional: {
    label: 'Opsional',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  cadangan: {
    label: 'Cadangan',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
};

export const RABEditor: React.FC<RABEditorProps> = ({
  initialPlan,
  members,
  onSave,
  onCancel,
}) => {
  // Plan basic info
  const [name, setName] = useState(initialPlan?.name || '');
  const [picName, setPicName] = useState(initialPlan?.pic_name || '');
  const [eventDate, setEventDate] = useState(initialPlan?.event_date || '');
  const [location, setLocation] = useState(initialPlan?.location || '');
  const [status, setStatus] = useState<RABStatus>(initialPlan?.status || 'draft');
  const [notes, setNotes] = useState(initialPlan?.notes || '');

  // Items state
  const [items, setItems] = useState<RABItem[]>(
    initialPlan?.items && initialPlan.items.length > 0 ? initialPlan.items : []
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'all' | RABItemPriority>('all');

  // Modal State for Adding/Editing Item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RABItem | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Add new item via modal
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  // Edit existing item via modal
  const handleOpenEditItem = (item: RABItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  // Save item from modal (either update existing or add new)
  const handleSaveModalItem = (savedItem: RABItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.id === savedItem.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = savedItem;
        return next;
      } else {
        return [...prev, savedItem];
      }
    });
    if (error) setError(null);
  };

  // Delete item from list
  const handleDeleteItem = (itemId: string, itemName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Priority count stats for filter chips
  const priorityCounts = useMemo(() => {
    const counts = {
      all: items.length,
      wajib: 0,
      sekunder: 0,
      opsional: 0,
      cadangan: 0,
    };
    items.forEach((it) => {
      if (counts[it.priority] !== undefined) {
        counts[it.priority]++;
      }
    });
    return counts;
  }, [items]);

  // Filtered items based on search query and priority tab
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !searchQuery.trim() ||
        it.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (it.notes && it.notes.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        it.unit.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesPriority =
        selectedPriorityFilter === 'all' || it.priority === selectedPriorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [items, searchQuery, selectedPriorityFilter]);

  // Calculate live total
  const totalBudget = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [items]);

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

    const validItems = items.filter((it) => it.name.trim().length > 0);
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
    <form onSubmit={handleSave} className="space-y-4 font-mono pb-20 sm:pb-16">
      {/* Editor Top Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#118EEA]/20 text-[#118EEA] border border-[#118EEA]/30 text-[10px] font-extrabold uppercase tracking-wider">
                RAB Editor
              </span>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                {initialPlan ? 'Edit Rancangan Anggaran' : 'Buat RAB Rencana Baru'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1 Rencana = 1 Kegiatan Tongkrongan (Camping / Bakar-Bakar / Turnamen)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan RAB</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* 1. Main Information Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Informasi Utama Kegiatan
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">* Wajib diisi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1.1 Nama Rencana Kegiatan */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-800 block">
              Nama Kegiatan / Rencana <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Camping Gunung Salak / Bakar-Bakar Tahun Baru"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
          </div>

          {/* 1.2 Penanggung Jawab (PJ) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">
              Penanggung Jawab (PJ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama PJ / Koordinator"
                list="member-names-list"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
              />
              <datalist id="member-names-list">
                {members.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 1.3 Status Rencana */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">Status Dokumen</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RABStatus)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            >
              <option value="draft">Draft (Perencanaan)</option>
              <option value="dialokasikan">Dialokasikan (Aktif)</option>
              <option value="selesai">Selesai (Terlaksana)</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* 1.4 Waktu Pelaksanaan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Waktu Pelaksanaan</span>
            </label>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="Contoh: Sabtu, 28 Des (19.00 WIB)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
          </div>

          {/* 1.5 Tempat / Lokasi */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Tempat / Lokasi Kegiatan</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Villa Pak Haji, Puncak / Teras Tongkrongan"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
          </div>

          {/* 1.6 Catatan / Keterangan */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Catatan / Keterangan</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional: syarat iuran dll"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
          </div>
        </div>
      </div>

      {/* 2. Rincian Anggaran Barang & Layanan (Compact Card List & Search/Filter) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Section Header with + Tambah Item button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Rincian Anggaran Barang & Jasa
                </h4>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                  {items.length} Item
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Klik kartu item untuk mengedit kuantitas, harga satuan, dan prioritas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddItem}
            className="px-4 py-2 bg-[#118EEA] hover:bg-[#0D7FD4] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Item Anggaran</span>
          </button>
        </div>

        {/* Search Bar & Priority Filter Chips */}
        <div className="space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama item anggaran, satuan, atau catatan..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-[#118EEA]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            {/* All */}
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedPriorityFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>Semua</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedPriorityFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {priorityCounts.all}
              </span>
            </button>

            {/* Wajib */}
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter('wajib')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedPriorityFilter === 'wajib'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <span>Wajib</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedPriorityFilter === 'wajib'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-200 text-rose-800'
                }`}
              >
                {priorityCounts.wajib}
              </span>
            </button>

            {/* Sekunder */}
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter('sekunder')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedPriorityFilter === 'sekunder'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span>Sekunder</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedPriorityFilter === 'sekunder'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {priorityCounts.sekunder}
              </span>
            </button>

            {/* Opsional */}
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter('opsional')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedPriorityFilter === 'opsional'
                  ? 'bg-[#118EEA] text-white'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              <span>Opsional</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedPriorityFilter === 'opsional'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-200 text-blue-800'
                }`}
              >
                {priorityCounts.opsional}
              </span>
            </button>

            {/* Cadangan */}
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter('cadangan')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedPriorityFilter === 'cadangan'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <span>Cadangan</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedPriorityFilter === 'cadangan'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {priorityCounts.cadangan}
              </span>
            </button>
          </div>
        </div>

        {/* Compact Summary Cards List */}
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              {items.length === 0 ? (
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Belum Ada Item Anggaran</h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                    Mulai tambahkan kebutuhan logistik, sewa peralatan, atau konsumsi untuk kegiatan ini.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="mt-3 px-4 py-2 bg-[#118EEA] hover:bg-[#0D7FD4] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Item Pertama</span>
                  </button>
                </div>
              ) : (
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Tidak Ada Item Yang Sesuai</h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                    Coba sesuaikan kata kunci pencarian atau filter kategori prioritas di atas.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedPriorityFilter('all');
                    }}
                    className="mt-2.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              // find actual index in full list for consistent numbering
              const originalIndex = items.findIndex((it) => it.id === item.id);
              const displayNum = originalIndex >= 0 ? originalIndex + 1 : idx + 1;
              const badge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.wajib;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditItem(item)}
                  className="group relative p-3 sm:p-3.5 bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-[#118EEA]/50 rounded-xl transition-all hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left Side: Number, Name, Priority Badge, Qty x Satuan @ Harga */}
                  <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                    {/* Index Number */}
                    <span className="w-6 h-6 rounded-lg bg-slate-200 group-hover:bg-[#118EEA]/10 group-hover:text-[#118EEA] text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0 transition-colors">
                      {displayNum}
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Item Name */}
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#118EEA] transition-colors truncate">
                          {item.name || 'Tanpa Nama'}
                        </h5>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Formula & Details */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-sans flex-wrap">
                        <span className="font-semibold text-slate-700">
                          {item.qty} {item.unit}
                        </span>
                        <span>×</span>
                        <span>Rp {item.unit_price.toLocaleString('id-ID')}</span>
                        {item.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 italic truncate max-w-xs">
                              {item.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Subtotal Amount & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    {/* Subtotal */}
                    <div className="text-left sm:text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-900 block">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {formatAmountK(item.subtotal)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditItem(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#118EEA] hover:bg-blue-50 transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, item.name, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Sticky Bottom Total Bar & Submit Button */}
      <div className="sticky bottom-16 sm:bottom-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              TOTAL ESTIMASI ANGGARAN (RAB)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                Rp {totalBudget.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                {formatAmountK(totalBudget)}
              </span>
              <span className="text-[11px] text-slate-500">
                ({items.length} item total)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>+ Tambah Item</span>
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Rancangan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Item Modal / Dialog */}
      <RABItemModal
        isOpen={isItemModalOpen}
        item={editingItem}
        onSave={handleSaveModalItem}
        onClose={() => setIsItemModalOpen(false)}
      />
    </form>
  );
};
