import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface UnitOption {
  value: string;
  label: string;
  category?: string;
}

export const COMMON_UNITS: UnitOption[] = [
  { value: 'buah', label: 'buah', category: 'Umum' },
  { value: 'pcs', label: 'pcs (pieces)', category: 'Umum' },
  { value: 'pack', label: 'pack / bungkus', category: 'Kemasan' },
  { value: 'paket', label: 'paket', category: 'Layanan' },
  { value: 'set', label: 'set', category: 'Alat' },
  { value: 'lusin', label: 'lusin (12 pcs)', category: 'Jumlah' },
  { value: 'potong', label: 'potong', category: 'Bahan' },
  { value: 'lembar', label: 'lembar', category: 'Kertas/Plastik' },
  { value: 'liter', label: 'liter (L)', category: 'Cairan' },
  { value: 'kg', label: 'kg (Kilogram)', category: 'Berat' },
  { value: 'gram', label: 'gram (g)', category: 'Berat' },
  { value: 'meter', label: 'meter (m)', category: 'Panjang' },
  { value: 'cm', label: 'cm (Centimeter)', category: 'Panjang' },
  { value: 'botol', label: 'botol', category: 'Kemasan' },
  { value: 'kaleng', label: 'kaleng', category: 'Kemasan' },
  { value: 'dus', label: 'dus / karton', category: 'Kemasan' },
  { value: 'box', label: 'box', category: 'Kemasan' },
  { value: 'porsi', label: 'porsi', category: 'Konsumsi' },
  { value: 'piring', label: 'piring', category: 'Konsumsi' },
  { value: 'gelas', label: 'gelas / cup', category: 'Konsumsi' },
  { value: 'ikat', label: 'ikat', category: 'Sayur/Bahan' },
  { value: 'roll', label: 'roll / gulung', category: 'Perlengkapan' },
  { value: 'tabung', label: 'tabung (Gas/Galon)', category: 'Logistik' },
  { value: 'batang', label: 'batang', category: 'Bahan' },
  { value: 'pasang', label: 'pasang', category: 'Jumlah' },
  { value: 'renteng', label: 'renteng (sachet)', category: 'Kemasan' },
];

interface RABUnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const RABUnitCombobox: React.FC<RABUnitComboboxProps> = ({
  value,
  onChange,
  id,
  placeholder = 'Pilih satuan...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredUnits = COMMON_UNITS.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    return u.value.toLowerCase().includes(q) || u.label.toLowerCase().includes(q);
  });

  const selectedUnit = COMMON_UNITS.find((u) => u.value.toLowerCase() === (value || '').toLowerCase());
  const displayLabel = selectedUnit ? selectedUnit.value : value || '';

  const handleSelect = (unitVal: string) => {
    onChange(unitVal);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomApply = () => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim().toLowerCase());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="relative font-mono" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-2.5 py-2 bg-slate-50 hover:bg-white border rounded-xl text-left text-xs font-mono transition-all flex items-center justify-between gap-1 shadow-2xs ${
          isOpen ? 'ring-2 ring-slate-800 border-slate-800 bg-white' : 'border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={displayLabel ? 'font-bold text-slate-800' : 'text-slate-400'}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-slate-800' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 z-50 bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredUnits.length > 0) {
                      handleSelect(filteredUnits[0].value);
                    } else {
                      handleCustomApply();
                    }
                  }
                }}
                placeholder="Cari / ketik satuan..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
            {filteredUnits.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-[11px] text-slate-500">Satuan &quot;{searchTerm}&quot; belum terdaftar.</p>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  className="mt-1.5 px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 w-full"
                >
                  + Gunakan &quot;{searchTerm}&quot;
                </button>
              </div>
            ) : (
              filteredUnits.map((u) => {
                const isSelected = (value || '').toLowerCase() === u.value.toLowerCase();
                return (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => handleSelect(u.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">{u.value}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {u.category}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
