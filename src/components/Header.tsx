import React, { useState } from 'react';
import { User } from '../types';
import { Settings, ChevronDown, Check, UserPlus, Users } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  onOpenSettings: () => void;
  onOpenQRIS: () => void;
  onNavigateToMembers: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSelectUser,
  onOpenSettings,
  onOpenQRIS,
  onNavigateToMembers,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'bendahara':
        return { text: 'BENDAHARA', bg: 'bg-[#0B63C5]', textCol: 'text-white' };
      case 'admin':
        return { text: 'ADMIN', bg: 'bg-slate-900', textCol: 'text-white' };
      case 'member':
        return { text: 'ANGGOTA', bg: 'bg-white/20', textCol: 'text-white' };
      default:
        return { text: 'BELUM ADA PROFIL', bg: 'bg-amber-500', textCol: 'text-white' };
    }
  };

  const badge = getRoleBadge(currentUser?.role);

  return (
    <header className="bg-[#118EEA] text-white pt-4 pb-6 px-4 sm:px-6 shadow-none sticky top-0 z-30">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* User Info & Switcher */}
        <div className="relative">
          {currentUser ? (
            <button
              id="user-profile-switcher-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 text-left focus:outline-none group p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white text-[#118EEA] font-extrabold flex items-center justify-center text-sm shadow-none font-heading border-2 border-white/60">
                {currentUser.avatar_initial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-100 font-medium">Halo,</span>
                  <span className="text-sm font-bold text-white tracking-wide font-heading group-hover:underline flex items-center gap-1">
                    {currentUser.name}
                    <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${badge.bg} ${badge.textCol}`}>
                    {badge.text}
                  </span>
                  <span className="text-[11px] text-blue-100 hidden sm:inline">• {currentUser.phone_number}</span>
                </div>
              </div>
            </button>
          ) : (
            <button
              id="user-profile-add-first-btn"
              onClick={onNavigateToMembers}
              className="flex items-center gap-2.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-left transition-colors border border-white/20"
            >
              <div className="w-8 h-8 rounded-lg bg-white text-[#118EEA] flex items-center justify-center font-bold">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Tambah / Pilih Anggota</p>
                <p className="text-[10px] text-blue-100">Belum ada akun aktif</p>
              </div>
            </button>
          )}

          {/* User Selector Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 text-[#2B2F38] py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#2B2F38]">Ganti Profil Aktif</p>
                    <p className="text-[11px] text-[#727986]">{users.length} Anggota Terdaftar</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigateToMembers();
                    }}
                    className="text-xs font-bold text-[#118EEA] hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Anggota</span>
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(u);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-[#E7F3FE]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${u.avatar_color} text-white font-bold text-xs flex items-center justify-center`}>
                            {u.avatar_initial}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#2B2F38]">{u.name}</p>
                            <p className="text-[10px] text-[#727986] capitalize">{u.role} • {u.phone_number}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#118EEA]" />}
                      </button>
                    );
                  })}

                  {users.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Belum ada anggota. Klik di bawah untuk menambahkan.
                    </div>
                  )}
                </div>

                <div className="px-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigateToMembers();
                    }}
                    className="w-full py-2 bg-[#E7F3FE] text-[#118EEA] hover:bg-[#118EEA] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Kelola Seluruh Anggota</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right tools: Real-time badge & Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B63C5] text-[11px] font-medium text-white border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sinkron Real-Time</span>
          </div>

          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            title="Pengaturan Parameter Sistem"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

