import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { AVATAR_COLORS, formatRupiah, parseRupiahInput } from '../../lib/storage';
import { X, UserPlus, UserCheck, Phone, Instagram, MapPin, Shield } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: User | null;
  onSave: (data: {
    name: string;
    phone_number: string;
    instagram: string;
    address: string;
    role: UserRole;
    credit_limit: number;
  }) => void;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [creditLimitStr, setCreditLimitStr] = useState('20.000');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setErrorMessage('');
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone_number);
      setInstagram(initialData.instagram);
      setAddress(initialData.address);
      setRole(initialData.role);
      setCreditLimitStr(formatRupiah(initialData.credit_limit ?? 20000));
    } else {
      setName('');
      setPhone('');
      setInstagram('');
      setAddress('');
      setRole('member');
      setCreditLimitStr('20.000');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Harap isi Nama Lengkap dan Nomor WhatsApp anggota.');
      return;
    }

    let cleanIg = instagram.trim();
    if (cleanIg && !cleanIg.startsWith('@')) {
      cleanIg = '@' + cleanIg;
    }

    onSave({
      name: name.trim(),
      phone_number: phone.trim(),
      instagram: cleanIg,
      address: address.trim(),
      role,
      credit_limit: parseRupiahInput(creditLimitStr) || 20000,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#118EEA] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
              {initialData ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">
                {initialData ? 'Ubah Data Anggota' : 'Daftarkan Anggota Baru'}
              </h2>
              <p className="text-xs text-sky-100">Pencatatan profil & plafon pinjaman</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}
          {/* Nama */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Nama Lengkap / Panggilan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              required
            />
          </div>

          {/* No HP / WhatsApp */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nomor HP / WhatsApp <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              required
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>Akun Instagram</span>
            </label>
            <input
              type="text"
              placeholder="@username"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            />
          </div>

          {/* Alamat */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Alamat / Domisili</span>
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Jl. Mawar No. 12, RT 02/05, Jakarta Selatan"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA] resize-none"
            />
          </div>

          {/* Role & Plafon Kredit */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#118EEA]" />
                <span>Peran</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
              >
                <option value="member">Anggota</option>
                <option value="bendahara">Bendahara</option>
                <option value="admin">Ketua / Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Plafon Kredit Awal</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#118EEA]">
                  Rp
                </span>
                <input
                  type="text"
                  value={creditLimitStr}
                  onChange={(e) => setCreditLimitStr(formatRupiah(parseRupiahInput(e.target.value)))}
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 text-right focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              {initialData ? 'Simpan Perubahan' : 'Daftarkan Anggota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
