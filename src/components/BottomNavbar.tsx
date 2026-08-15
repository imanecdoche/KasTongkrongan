import React from 'react';
import { Home, Users, HandCoins, Receipt, FileText } from 'lucide-react';

export type NavigationTab = 'beranda' | 'anggota' | 'pinjaman' | 'mutasi' | 'laporan';

interface BottomNavbarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  membersCount: number;
  activeLoansCount: number;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  activeTab,
  onSelectTab,
  membersCount,
  activeLoansCount,
}) => {
  const tabs = [
    {
      id: 'beranda' as NavigationTab,
      label: 'Beranda',
      icon: Home,
    },
    {
      id: 'anggota' as NavigationTab,
      label: 'Anggota',
      icon: Users,
      badge: membersCount > 0 ? membersCount : undefined,
    },
    {
      id: 'pinjaman' as NavigationTab,
      label: 'Pinjaman',
      icon: HandCoins,
      badge: activeLoansCount > 0 ? activeLoansCount : undefined,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'mutasi' as NavigationTab,
      label: 'Buku Kas',
      icon: Receipt,
    },
    {
      id: 'laporan' as NavigationTab,
      label: 'Laporan',
      icon: FileText,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="w-full max-w-lg mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center relative transition-colors ${
                isActive ? 'text-[#118EEA]' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center ${
                      tab.badgeColor || 'bg-[#118EEA]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${isActive ? 'font-bold text-[#118EEA]' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-1 bg-[#118EEA] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
