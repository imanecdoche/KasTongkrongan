import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Instagram,
  MapPin,
  Shield,
  Award,
  UserCheck,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  ExternalLink,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { AVATAR_COLORS } from '../lib/storage';

interface MemberManagementModuleProps {
  currentUser: User | null;
  users: User[];
  onAddMember: (memberData: {
    name: string;
    phone_number: string;
    instagram: string;
    address: string;
    role: UserRole;
  }) => void;
  onUpdateMember: (id: string, memberData: Partial<User>) => void;
  onDeleteMember: (id: string) => void;
  onSelectActiveUser: (user: User) => void;
}

export const MemberManagementModule: React.FC<MemberManagementModuleProps> = ({
  currentUser,
  users,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSelectActiveUser,
}) => {
  const [showAddForm, setShowAddForm] = useState(users.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('member');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const formatInstagram = (val: string) => {
    let clean = val.trim();
    if (clean.startsWith('http') || clean.includes('instagram.com/')) {
      const parts = clean.split('instagram.com/');
      clean = parts[1] ? parts[1].replace('/', '') : clean;
    }
    if (clean && !clean.startsWith('@')) {
      return '@' + clean;
    }
    return clean;
  };

  const formatWhatsAppUrl = (phoneNum: string) => {
    let digits = phoneNum.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.substring(1);
    }
    return `https://wa.me/${digits}`;
  };

  const formatInstagramUrl = (igHandle: string) => {
    const handle = igHandle.replace('@', '').trim();
    return `https://instagram.com/${handle}`;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama anggota wajib diisi.');
      return;
    }
    if (!phone.trim()) {
      alert('Nomor HP / WhatsApp wajib diisi.');
      return;
    }

    const cleanIg = formatInstagram(instagram);

    onAddMember({
      name: name.trim(),
      phone_number: phone.trim(),
      instagram: cleanIg,
      address: address.trim(),
      role,
    });

    // Reset Form
    setName('');
    setPhone('');
    setInstagram('');
    setAddress('');
    setRole('member');
    if (users.length > 0) {
      setShowAddForm(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditPhone(user.phone_number);
    setEditInstagram(user.instagram || '');
    setEditAddress(user.address || '');
    setEditRole(user.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editPhone.trim()) {
      alert('Nama dan Nomor HP tidak boleh kosong.');
      return;
    }

    onUpdateMember(id, {
      name: editName.trim(),
      phone_number: editPhone.trim(),
      instagram: formatInstagram(editInstagram),
      address: editAddress.trim(),
      role: editRole,
      avatar_initial: editName.trim().charAt(0).toUpperCase(),
    });

    setEditingId(null);
  };

  const copyMemberContacts = () => {
    if (users.length === 0) return;

    let text = '*DAFTAR ANGGOTA & KONTAK TONGKRONGAN*\n\n';
    users.forEach((u, i) => {
      text += `${i + 1}. *${u.name}* (${u.role.toUpperCase()})\n`;
      text += `   - No HP: ${u.phone_number}\n`;
      if (u.instagram) text += `   - Instagram: ${u.instagram}\n`;
      if (u.address) text += `   - Alamat: ${u.address}\n`;
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    setCopiedNotification('Daftar kontak berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      u.name.toLowerCase().includes(q) ||
      u.phone_number.toLowerCase().includes(q) ||
      (u.instagram && u.instagram.toLowerCase().includes(q)) ||
      (u.address && u.address.toLowerCase().includes(q));

    if (!matchQuery) return false;
    if (roleFilter === 'all') return true;
    return u.role === roleFilter;
  });

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'bendahara':
        return { label: 'BENDAHARA', bg: 'bg-[#0B63C5] text-white border-transparent' };
      case 'admin':
        return { label: 'ADMIN', bg: 'bg-slate-800 text-white border-transparent' };
      default:
        return { label: 'ANGGOTA', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#E7F3FE] text-[#118EEA] border border-[#118EEA]/30">
              MANAJEMEN ANGGOTA
            </span>
            <span className="text-xs text-[#727986]">• {users.length} Terdaftar</span>
          </div>
          <h2 className="text-lg font-bold text-[#2B2F38] font-heading mt-1">Data Anggota Tongkrongan</h2>
          <p className="text-xs text-[#727986]">
            Kelola profil, nomor WhatsApp, akun Instagram, dan alamat seluruh anggota.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {users.length > 0 && (
            <button
              type="button"
              onClick={copyMemberContacts}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Kontak</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{showAddForm ? 'Tutup Formulir' : 'Tambah Anggota'}</span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* ADD MEMBER FORM */}
      {showAddForm && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#2B2F38] font-heading flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#118EEA]" />
              <span>Formulir Pendaftaran Anggota Tongkrongan</span>
            </h3>
            <p className="text-xs text-[#727986] mt-0.5">
              Masukkan informasi anggota baru secara lengkap (Nama, No HP, Akun Instagram, dan Alamat).
            </p>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-[#2B2F38] mb-1">
                  Nama Lengkap / Panggilan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dimas Prasetyo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:bg-white focus:outline-none focus:border-[#118EEA]"
                />
              </div>

              {/* Field 2: No HP / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-[#2B2F38] mb-1">
                  Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 0812-3456-7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:bg-white focus:outline-none focus:border-[#118EEA]"
                  />
                </div>
              </div>

              {/* Field 3: Instagram */}
              <div>
                <label className="block text-xs font-bold text-[#2B2F38] mb-1">
                  Akun Instagram
                </label>
                <div className="relative">
                  <Instagram className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Contoh: @dimas_pras"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:bg-white focus:outline-none focus:border-[#118EEA]"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold text-[#2B2F38] mb-1">
                  Peran di Tongkrongan
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] font-medium focus:bg-white focus:outline-none focus:border-[#118EEA]"
                >
                  <option value="member">Anggota Tongkrongan (Standar)</option>
                  <option value="bendahara">Bendahara Kas (Pengelola)</option>
                  <option value="admin">Admin Komunitas (Pengawas)</option>
                </select>
              </div>

              {/* Field 4: Alamat */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2B2F38] mb-1">
                  Alamat Tempat Tinggal / Kos
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Contoh: Jl. Anggrek No. 15, RT 03/RW 04, Kos Putra Sejahtera"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:bg-white focus:outline-none focus:border-[#118EEA]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {users.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
              >
                Simpan Data Anggota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH */}
      {users.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `Semua (${users.length})` },
              { id: 'bendahara', label: `Bendahara (${users.filter((u) => u.role === 'bendahara').length})` },
              { id: 'member', label: `Anggota (${users.filter((u) => u.role === 'member').length})` },
              { id: 'admin', label: `Admin (${users.filter((u) => u.role === 'admin').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  roleFilter === tab.id
                    ? 'bg-[#118EEA] text-white'
                    : 'bg-[#F5F6F8] text-[#727986] hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama / nohp / ig / alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F5F6F8] border border-slate-200 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA] w-full sm:w-64"
            />
          </div>
        </div>
      )}

      {/* MEMBER LIST */}
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const isCurrent = currentUser?.id === user.id;
          const isEditing = editingId === user.id;
          const badge = getRoleBadge(user.role);

          if (isEditing) {
            return (
              <div key={user.id} className="bg-white p-5 rounded-2xl border-2 border-[#118EEA] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-[#118EEA]">Edit Data: {user.name}</span>
                  <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2 bg-[#F5F6F8] border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2 bg-[#F5F6F8] border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Akun Instagram</label>
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      className="w-full p-2 bg-[#F5F6F8] border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Peran</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full p-2 bg-[#F5F6F8] border border-slate-300 rounded-xl"
                    >
                      <option value="member">Anggota</option>
                      <option value="bendahara">Bendahara</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Alamat</label>
                    <textarea
                      rows={2}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full p-2 bg-[#F5F6F8] border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleSaveEdit(user.id)}
                    className="px-4 py-1.5 rounded-lg bg-[#118EEA] text-white text-xs font-bold"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={user.id}
              className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
                isCurrent ? 'border-2 border-[#118EEA]' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Avatar & Info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl ${user.avatar_color} text-white font-extrabold text-lg flex items-center justify-center font-heading shrink-0`}
                  >
                    {user.avatar_initial}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#2B2F38] font-heading">{user.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300">
                          PROFIL AKTIF
                        </span>
                      )}
                    </div>

                    {/* Details list: HP, IG, Alamat */}
                    <div className="space-y-1 pt-1 text-xs text-[#727986]">
                      {/* No HP with WhatsApp Link */}
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-[#2B2F38]">{user.phone_number}</span>
                        <a
                          href={formatWhatsAppUrl(user.phone_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 ml-1"
                        >
                          <span>Chat WA</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Instagram */}
                      {user.instagram && (
                        <div className="flex items-center gap-2">
                          <Instagram className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[#2B2F38]">{user.instagram}</span>
                          <a
                            href={formatInstagramUrl(user.instagram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#118EEA] font-bold hover:underline flex items-center gap-0.5 ml-1"
                          >
                            <span>Buka IG</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {/* Alamat */}
                      {user.address && (
                        <div className="flex items-start gap-2 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-700 leading-snug">{user.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => onSelectActiveUser(user)}
                      className="px-3 py-1.5 bg-[#E7F3FE] text-[#118EEA] hover:bg-[#118EEA] hover:text-white rounded-xl text-xs font-bold transition-colors"
                      title="Pilih akun ini untuk bertransaksi / simulasi"
                    >
                      Pilih Profil
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => startEdit(user)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit Data Anggota"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus data anggota ${user.name}?`)) {
                        onDeleteMember(user.id);
                      }
                    }}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus Anggota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {users.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E7F3FE] text-[#118EEA] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2B2F38] font-heading">Belum Ada Anggota Tongkrongan</h3>
              <p className="text-xs text-[#727986] max-w-md mx-auto mt-1">
                Data anggota masih kosong. Gunakan formulir di atas untuk mendaftarkan anggota tongkrongan pertama mencakup nama, no hp, akun instagram, dan alamat.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-[#118EEA] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Buka Formulir Pendaftaran</span>
            </button>
          </div>
        )}

        {users.length > 0 && filteredUsers.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-[#727986]">
            Tidak ada anggota yang sesuai dengan kata kunci pencarian.
          </div>
        )}
      </div>
    </div>
  );
};
