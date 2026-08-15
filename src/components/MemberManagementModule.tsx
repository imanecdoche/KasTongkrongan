import React, { useState } from 'react';
import { User } from '../types';
import { AppState, calculateMemberStats, formatRupiah } from '../lib/storage';
import {
  Search,
  UserPlus,
  Phone,
  Instagram,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Settings2,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
  AlertTriangle,
  Award,
  CreditCard,
} from 'lucide-react';

interface MemberManagementModuleProps {
  state: AppState;
  onOpenAddMember: () => void;
  onOpenEditMember: (user: User) => void;
  onDeleteMember: (id: string) => void;
  onOpenKasMasukWithMember: (user: User) => void;
  onOpenKasKeluarWithMember: (user: User) => void;
  onOpenManageCredit: (user: User) => void;
}

export const MemberManagementModule: React.FC<MemberManagementModuleProps> = ({
  state,
  onOpenAddMember,
  onOpenEditMember,
  onDeleteMember,
  onOpenKasMasukWithMember,
  onOpenKasKeluarWithMember,
  onOpenManageCredit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_debt' | 'frozen' | 'has_fine'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'highest_contribution' | 'highest_debt' | 'compliance'>('highest_contribution');

  // Filter & Search
  const filteredUsers = state.users.filter((user) => {
    const stats = calculateMemberStats(user, state);
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone_number.includes(searchQuery) ||
      (user.instagram && user.instagram.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.address && user.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'has_debt') return stats.sisaHutang > 0;
    if (filterType === 'frozen') return stats.isCreditFrozen;
    if (filterType === 'has_fine') return stats.dendaTertunda > 0;

    return true;
  });

  // Sort
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const statsA = calculateMemberStats(a, state);
    const statsB = calculateMemberStats(b, state);

    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'highest_contribution') return statsB.totalMasuk - statsA.totalMasuk;
    if (sortBy === 'highest_debt') return statsB.sisaHutang - statsA.sisaHutang;
    if (sortBy === 'compliance') return statsB.skorKepatuhan - statsA.skorKepatuhan;
    return 0;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Module Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#2B2F38] font-heading flex items-center gap-2">
            <span>Daftar Anggota & Statistik Realtime</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E7F3FE] text-[#118EEA]">
              {state.users.length} Terdaftar
            </span>
          </h2>
          <p className="text-xs text-[#727986] mt-0.5">
            Pencatatan kontribusi kas masuk, kredit pinjaman 20K, hutang, dan skor kepatuhan
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddMember}
          className="px-4 py-2.5 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#118EEA]/20 flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Anggota</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, IG, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#118EEA]"
            >
              <option value="highest_contribution">Kontribusi Tertinggi</option>
              <option value="name">Nama (A-Z)</option>
              <option value="highest_debt">Hutang Terbanyak</option>
              <option value="compliance">Skor Kepatuhan</option>
            </select>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'all', label: 'Semua Anggota' },
            { id: 'has_debt', label: '🔴 Ada Hutang Aktif' },
            { id: 'frozen', label: '⚠️ Kredit Dibekukan' },
            { id: 'has_fine', label: '⚡ Ada Denda' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterType === f.id
                  ? 'bg-[#118EEA] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {state.users.length === 0 ? 'Belum Ada Anggota Terdaftar' : 'Tidak Ada Anggota yang Cocok'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {state.users.length === 0
                ? 'Daftarkan anggota tongkrongan Anda untuk mulai mencatat iuran kas masuk, kredit pinjaman 20K, dan rekam jejak keuangan.'
                : 'Coba ubah kata kunci pencarian atau filter yang dipilih.'}
            </p>
          </div>
          {state.users.length === 0 && (
            <button
              type="button"
              onClick={onOpenAddMember}
              className="px-4 py-2 bg-[#118EEA] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Anggota Pertama</span>
            </button>
          )}
        </div>
      )}

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedUsers.map((user) => {
          const stats = calculateMemberStats(user, state);
          const cleanPhone = user.phone_number.replace(/\D/g, '');
          const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : '#';
          const igLink = user.instagram ? `https://instagram.com/${user.instagram.replace('@', '')}` : '#';

          return (
            <div
              key={user.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Card Header: Avatar, Name, Role & Compliance Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${user.avatar_color} text-white flex items-center justify-center font-bold text-base font-heading shadow-xs shrink-0`}
                  >
                    {user.avatar_initial}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 font-heading">{user.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                        {user.role}
                      </span>
                    </div>

                    {/* Contact Links */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      {user.phone_number && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-600 flex items-center gap-1 font-medium"
                          title="Hubungi via WhatsApp"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{user.phone_number}</span>
                        </a>
                      )}
                      {user.instagram && (
                        <a
                          href={igLink}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-pink-600 flex items-center gap-1 font-medium"
                          title="Lihat Instagram"
                        >
                          <Instagram className="w-3 h-3 text-pink-600" />
                          <span>{user.instagram}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skor Kepatuhan Badge */}
                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${stats.badgeColor}`}>
                    <Award className="w-3 h-3" />
                    <span>{stats.skorKepatuhan}% • {stats.labelKepatuhan}</span>
                  </span>
                </div>
              </div>

              {/* Address (if any) */}
              {user.address && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{user.address}</span>
                </div>
              )}

              {/* COMPREHENSIVE STATS MATRIX */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {/* 1. Total Masuk */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-150 rounded-xl">
                  <span className="text-[10px] font-semibold text-emerald-700 block">Total Masuk</span>
                  <p className="text-xs font-black text-emerald-900 font-heading mt-0.5">
                    Rp {formatRupiah(stats.totalMasuk)}
                  </p>
                  <span className="text-[9px] text-emerald-700/80 block">
                    {stats.transaksiCount}x transaksi
                  </span>
                </div>

                {/* 2. Pekan & Bulan Ini */}
                <div className="p-2.5 bg-sky-50/70 border border-sky-150 rounded-xl">
                  <span className="text-[10px] font-semibold text-[#118EEA] block">Kontribusi Pekan</span>
                  <p className="text-xs font-black text-sky-900 font-heading mt-0.5">
                    Rp {formatRupiah(stats.masukPekanIni)}
                  </p>
                  <span className="text-[9px] text-sky-600 block">
                    Bln ini: Rp {formatRupiah(stats.masukBulanIni)}
                  </span>
                </div>

                {/* 3. Jatah Kredit & Sisa Tersedia */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-600">Jatah Kredit</span>
                    {stats.isCreditFrozen ? (
                      <span className="text-[9px] font-extrabold text-rose-600">BEKU</span>
                    ) : (
                      <span className="text-[9px] font-extrabold text-emerald-600">AKTIF</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-800 font-heading mt-0.5">
                    Rp {formatRupiah(stats.plafonKredit)}
                  </p>
                  <span className="text-[9px] text-slate-500 block">
                    Sisa: Rp {formatRupiah(stats.sisaKreditTersedia)}
                  </span>
                </div>

                {/* 4. Hutang & Denda */}
                <div className={`p-2.5 rounded-xl border ${stats.sisaHutang > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] font-semibold block ${stats.sisaHutang > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    Sisa Hutang
                  </span>
                  <p className={`text-xs font-black font-heading mt-0.5 ${stats.sisaHutang > 0 ? 'text-rose-900' : 'text-slate-800'}`}>
                    Rp {formatRupiah(stats.sisaHutang)}
                  </p>
                  <span className={`text-[9px] block ${stats.dendaTertunda > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    Denda: Rp {formatRupiah(stats.dendaTertunda)}
                  </span>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* + Kas Masuk */}
                  <button
                    type="button"
                    onClick={() => onOpenKasMasukWithMember(user)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    title="Catat uang masuk dari anggota ini"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Masuk</span>
                  </button>

                  {/* - Kas Keluar / Pinjamkan */}
                  <button
                    type="button"
                    onClick={() => onOpenKasKeluarWithMember(user)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    title="Cairkan pinjaman untuk anggota ini"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>- Pinjamkan</span>
                  </button>

                  {/* Kelola Kredit Button */}
                  <button
                    type="button"
                    onClick={() => onOpenManageCredit(user)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    title="Ubah plafon kredit / bekukan"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#118EEA]" />
                    <span>Kredit</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenEditMember(user)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                    title="Ubah Data Anggota"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus anggota "${user.name}" dari sistem kas tongkrongan?`)) {
                        onDeleteMember(user.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Hapus Anggota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
