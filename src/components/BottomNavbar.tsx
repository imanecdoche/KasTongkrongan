import React from 'react';
import { Home, Users, Calendar, ShieldAlert, FileText } from 'lucide-react';

export type NavigationTab = 'beranda' | 'anggota' | 'iuran' | 'pinjaman' | 'mutasi';

interface BottomNavbarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingCount?: number;
  membersCount?: number;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  membersCount = 0,
}) => {
  const tabs = [
    { id: 'beranda' as NavigationTab, label: 'Beranda', icon: Home },
    { id: 'anggota' as NavigationTab, label: 'Anggota', icon: Users },
    { id: 'iuran' as NavigationTab, label: 'Iuran Kas', icon: Calendar },
    { id: 'pinjaman' as NavigationTab, label: 'Pinjaman', icon: ShieldAlert },
    { id: 'mutasi' as NavigationTab, label: 'Mutasi', icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-none">
      <div className="max-w-4xl mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? 'text-[#118EEA]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.id === 'iuran' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
                {tab.id === 'anggota' && membersCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold flex items-center justify-center">
                    {membersCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

