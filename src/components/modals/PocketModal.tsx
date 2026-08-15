import React, { useState } from 'react';
import { X, FolderPlus, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Pocket } from '../../types';

interface PocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: Pocket[];
  totalAvailableCash: number;
  onAddPocket: (pocket: Omit<Pocket, 'id'>) => void;
  onReallocate: (fromPocketId: string, toPocketId: string, amount: number) => void;
}

export const PocketModal: React.FC<PocketModalProps> = ({
  isOpen,
  onClose,
  pockets,
  totalAvailableCash,
  onAddPocket,
  onReallocate,
}) => {
  const [activeTab, setActiveTab] = useState<'reallocate' | 'new'>('reallocate');

  // Reallocate state
  const [fromPocketId, setFromPocketId] = useState<string>(pockets[0]?.id || '');
  const [toPocketId, setToPocketId] = useState<string>(pockets[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(50000);

  // New pocket state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(500000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Agenda Khusus');

  if (!isOpen) return null;

  const handleReallocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromPocketId === toPocketId) {
      alert('Pilih dua pocket yang berbeda.');
      return;
    }
    const sourcePocket = pockets.find((p) => p.id === fromPocketId);
    if (!sourcePocket || sourcePocket.current_balance < transferAmount) {
      alert('Saldo pocket sumber tidak mencukupi.');
      return;
    }

    onReallocate(fromPocketId, toPocketId, Number(transferAmount));
    onClose();
  };

  const handleNewPocketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPocket({
      name: name.trim(),
      target_amount: Number(targetAmount),
      current_balance: Number(initialBalance),
      description: description.trim() || 'Pocket alokasi kas tongkrongan',
      tag: tag.trim() || 'Agenda Khusus',
    });
    onClose();
  };

  return (
    <div id="pocket-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        id="pocket-modal-container"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">Kelola Pocket Kas</h3>
            <p className="text-xs text-[#727986]">Alokasi tabungan agenda & dana darurat</p>
          </div>
          <button
            id="close-pocket-modal-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 bg-[#F5F6F8] rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('reallocate')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'reallocate'
                  ? 'bg-white text-[#118EEA] shadow-none border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Geser Alokasi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'new'
                  ? 'bg-white text-[#118EEA] shadow-none border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Pocket Baru</span>
            </button>
          </div>
        </div>

        {activeTab === 'reallocate' ? (
          <form onSubmit={handleReallocateSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Dari Pocket Sumber</label>
              <select
                value={fromPocketId}
                onChange={(e) => setFromPocketId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
              >
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Saldo: Rp{p.current_balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Ke Pocket Tujuan</label>
              <select
                value={toPocketId}
                onChange={(e) => setToPocketId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
              >
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Saldo: Rp{p.current_balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nominal yang Digeser (Rp)</label>
              <input
                type="number"
                min="10000"
                step="10000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                id="submit-reallocate-btn"
                className="flex-1 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
              >
                Konfirmasi Geser
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleNewPocketSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nama Pocket Agenda</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Sewa Villa Puncak, Nobar Final"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Target Dana (Rp)</label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Kategori Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                >
                  <option value="Agenda Liburan">Agenda Liburan</option>
                  <option value="Dana Darurat">Dana Darurat</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Investasi Bersama">Investasi Bersama</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Deskripsi Singkat</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian target atau tanggal pelaksanaan acara..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                id="submit-new-pocket-btn"
                className="flex-1 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
              >
                Simpan Pocket
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
