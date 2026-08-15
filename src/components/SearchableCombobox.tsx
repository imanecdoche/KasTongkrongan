import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: string | React.ReactNode;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  description?: string;
  group?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  allowCustomInput?: boolean;
  onCustomInputChange?: (text: string) => void;
  customInputValue?: string;
}

const BADGE_COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih salah satu...',
  searchPlaceholder = 'Ketik untuk mencari...',
  label,
  required = false,
  disabled = false,
  error,
  helperText,
  id,
  allowCustomInput = false,
  onCustomInputChange,
  customInputValue = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) => {
    const term = searchTerm.toLowerCase();
    const labelMatch = option.label.toLowerCase().includes(term);
    const descMatch = option.description?.toLowerCase().includes(term) ?? false;
    const badgeMatch = option.badge?.toLowerCase().includes(term) ?? false;
    const groupMatch = option.group?.toLowerCase().includes(term) ?? false;
    return labelMatch || descMatch || badgeMatch || groupMatch;
  });

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Select Button / Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between gap-2 shadow-2xs ${
          isOpen ? 'ring-2 ring-[#118EEA] border-[#118EEA] bg-white' : 'border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'} ${
          error ? 'border-rose-500 ring-1 ring-rose-400' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 text-base leading-none">
                  {selectedOption.icon}
                </span>
              )}
              <div className="truncate flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-bold truncate">
                    {selectedOption.label}
                  </span>
                  {selectedOption.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                        BADGE_COLOR_MAP[selectedOption.badgeColor || 'slate']
                      }`}
                    >
                      {selectedOption.badge}
                    </span>
                  )}
                </div>
                {selectedOption.description && (
                  <p className="text-[11px] text-slate-400 truncate font-normal">
                    {selectedOption.description}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#118EEA]' : ''
          }`}
        />
      </button>

      {/* Helper text or Error message */}
      {error ? (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-98 duration-150">
          {/* Search Input Filter */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] focus:border-transparent font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-50 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-500 font-medium">Tidak ada opsi yang cocok dengan &quot;{searchTerm}&quot;</p>
                {allowCustomInput && onCustomInputChange && (
                  <button
                    type="button"
                    onClick={() => {
                      onCustomInputChange(searchTerm);
                      setIsOpen(false);
                    }}
                    className="mt-2 text-xs font-bold text-[#118EEA] hover:underline"
                  >
                    Gunakan &quot;{searchTerm}&quot; sebagai input manual
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-sky-50 text-[#118EEA] font-bold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {opt.icon && (
                        <span className="text-base shrink-0 leading-none">
                          {opt.icon}
                        </span>
                      )}
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate ${isSelected ? 'text-[#118EEA]' : 'text-slate-800'}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                                BADGE_COLOR_MAP[opt.badgeColor || 'slate']
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-[11px] text-slate-400 truncate font-normal mt-0.5">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#118EEA] shrink-0" />
                    )}
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
