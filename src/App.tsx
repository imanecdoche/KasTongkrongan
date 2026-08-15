import React, { useState, useEffect } from 'react';
import {
  User,
  Transaction,
  MemberLoan,
  SystemConfig,
  TransactionCategory,
  PaymentMethod,
  CreditRestorationItem,
} from './types';
import {
  getInitialState,
  initRealtimeDatabase,
  persistStateToDatabase,
  calculateFinancialSummary,
  calculateMemberStats,
  formatRupiah,
  getTwoLetterInitial,
  AVATAR_COLORS,
  AppState,
} from './lib/storage';
import { Header } from './components/Header';
import { MainBalanceCard } from './components/MainBalanceCard';
import { MemberManagementModule } from './components/MemberManagementModule';
import { LoanManagementModule } from './components/LoanManagementModule';
import { ActivityFeedModule } from './components/ActivityFeedModule';
import { BottomNavbar, NavigationTab } from './components/BottomNavbar';

// Modals
import { KasMasukModal } from './components/modals/KasMasukModal';
import { KasKeluarModal } from './components/modals/KasKeluarModal';
import { MemberFormModal } from './components/modals/MemberFormModal';
import { ManageCreditModal } from './components/modals/ManageCreditModal';
import { MemberDetailModal } from './components/modals/MemberDetailModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AdminSettingsModal } from './components/modals/AdminSettingsModal';
import { QRISViewerModal } from './components/modals/QRISViewerModal';
import { PWAInstallModal } from './components/modals/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Receipt,
  ChevronRight,
  Radio,
  Wifi,
} from 'lucide-react';

export function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [activeTab, setActiveTab] = useState<NavigationTab>('beranda');

  // Modal States
  const [isKasMasukOpen, setIsKasMasukOpen] = useState(false);
  const [isKasKeluarOpen, setIsKasKeluarOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [managingCreditUser, setManagingCreditUser] = useState<User | null>(null);
  const [detailMember, setDetailMember] = useState<User | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isQRISOpen, setIsQRISOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Preselection for modals
  const [preSelectedMemberId, setPreSelectedMemberId] = useState<string | undefined>(undefined);
  const [preSelectedCategory, setPreSelectedCategory] = useState<TransactionCategory | undefined>(undefined);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Realtime Database sync subscription
  useEffect(() => {
    const unsubscribe = initRealtimeDatabase((syncedState) => {
      setState(syncedState);
    });
    return () => unsubscribe();
  }, []);

  // Handle URL shortcut actions (PWA shortcuts like ?action=kas-masuk or ?tab=anggota)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const tab = params.get('tab') as NavigationTab | null;

      if (action === 'kas-masuk') {
        setIsKasMasukOpen(true);
      } else if (action === 'kas-keluar') {
        setIsKasKeluarOpen(true);
      }

      if (tab && ['beranda', 'anggota', 'pinjaman', 'mutasi'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // Sync state changes with Realtime DB persistence
  const updateStateAndPersist = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      persistStateToDatabase(next);
      return next;
    });
  };

  // Calculate real-time financial stats
  const summary = calculateFinancialSummary(state);
  const activeLoans = state.loans.filter((l) => l.status === 'active' || l.status === 'overdue');

  // -------------------------------------------------------------
  // HANDLERS FOR TRANSACTION (KAS MASUK & KAS KELUAR)
  // -------------------------------------------------------------

  const handleKasMasukSuccess = (data: {
    amount: number;
    category: TransactionCategory;
    memberId?: string;
    memberName: string;
    method: PaymentMethod;
    notes: string;
    duesPortion?: number;
    finePortion?: number;
  }) => {
    const newTx: Transaction = {
      id: `TX-IN-${Date.now()}`,
      direction: 'masuk',
      category: data.category,
      amount: data.amount,
      member_id: data.memberId,
      member_name: data.memberName,
      method: data.method,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    updateStateAndPersist((prev) => {
      let updatedLoans = [...prev.loans];
      let updatedUsers = [...prev.users];
      let updatedRestorations: CreditRestorationItem[] = [...(prev.credit_restorations || [])];

      // If category is hutang / debt repayment
      if (data.category === 'hutang') {
        let remainingRepayment = data.amount;
        let totalRepaidForThisMember = 0;

        updatedLoans = updatedLoans.map((loan) => {
          const isTargetLoan =
            (data.memberId && loan.member_id === data.memberId) ||
            (loan.member_name.toLowerCase().trim() === data.memberName.toLowerCase().trim());

          if (isTargetLoan && loan.remaining_amount > 0 && remainingRepayment > 0) {
            const payAmt = Math.min(loan.remaining_amount, remainingRepayment);
            remainingRepayment -= payAmt;
            totalRepaidForThisMember += payAmt;
            const newRemaining = loan.remaining_amount - payAmt;

            // Schedule 3-day automatic credit restoration
            if (payAmt > 0) {
              const restorationDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
              updatedRestorations.push({
                id: `RESTORE-${Date.now()}-${loan.id}`,
                member_id: loan.member_id,
                member_name: loan.member_name,
                loan_id: loan.id,
                repaid_amount: payAmt,
                repaid_at: new Date().toISOString(),
                restore_due_at: restorationDue,
                is_restored: false,
              });
            }

            return {
              ...loan,
              remaining_amount: newRemaining,
              status: newRemaining === 0 ? ('paid' as const) : ('active' as const),
              repaid_at: newRemaining === 0 ? new Date().toISOString() : undefined,
            };
          }
          return loan;
        });
      }

      // If category is denda / fine payment
      if (data.category === 'denda' && data.memberId) {
        updatedUsers = updatedUsers.map((u) => {
          if (u.id === data.memberId) {
            const currentFine = u.unpaid_fine || 0;
            return { ...u, unpaid_fine: Math.max(0, currentFine - data.amount) };
          }
          return u;
        });
      }

      // If iuran + denda split
      if (data.category === 'iuran_plus_denda' && data.memberId && data.finePortion) {
        updatedUsers = updatedUsers.map((u) => {
          if (u.id === data.memberId) {
            const currentFine = u.unpaid_fine || 0;
            return { ...u, unpaid_fine: Math.max(0, currentFine - (data.finePortion || 0)) };
          }
          return u;
        });
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        loans: updatedLoans,
        users: updatedUsers,
        credit_restorations: updatedRestorations,
      };
    });

    if (data.category === 'hutang') {
      showToast(`✅ Hutang Rp ${formatRupiah(data.amount)} terbayar! Limit kredit akan pulih otomatis dalam 3 hari.`);
    } else {
      showToast(`✅ Berhasil mencatat Kas Masuk Rp ${formatRupiah(data.amount)} dari ${data.memberName}`);
    }
  };

  const handleKasKeluarSuccess = (data: {
    amount: number;
    category: TransactionCategory;
    memberId?: string;
    memberName: string;
    method: PaymentMethod;
    notes: string;
    dueDate?: string;
  }) => {
    const newTx: Transaction = {
      id: `TX-OUT-${Date.now()}`,
      direction: 'keluar',
      category: data.category,
      amount: data.amount,
      member_id: data.memberId,
      member_name: data.memberName,
      method: data.method,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    updateStateAndPersist((prev) => {
      let updatedLoans = [...prev.loans];
      let updatedUsers = [...prev.users];

      // If category is pinjaman_keluar -> Kurangi jatah kredit anggota & catat pinjaman
      if (data.category === 'pinjaman_keluar') {
        const borrowerId = data.memberId || `BORROWER-${Date.now()}`;
        const newLoan: MemberLoan = {
          id: `LOAN-${Date.now()}`,
          member_id: borrowerId,
          member_name: data.memberName,
          amount: data.amount,
          remaining_amount: data.amount,
          status: 'active',
          due_date: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          notes: data.notes,
        };
        updatedLoans = [newLoan, ...updatedLoans];

        // Kurangi jatah kredit langsung jika anggota terdaftar
        if (data.memberId) {
          updatedUsers = updatedUsers.map((u) => {
            if (u.id === data.memberId) {
              const currentCredit = u.credit_limit ?? 20000;
              return {
                ...u,
                credit_limit: Math.max(0, currentCredit - data.amount),
              };
            }
            return u;
          });
        }
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        loans: updatedLoans,
        users: updatedUsers,
      };
    });

    if (data.category === 'pinjaman_keluar') {
      showToast(`🤝 Pinjaman Rp ${formatRupiah(data.amount)} cair ke ${data.memberName}. Limit kreditnya telah dikurangi.`);
    } else {
      showToast(`📤 Berhasil mencatat Kas Keluar Rp ${formatRupiah(data.amount)} (${data.memberName})`);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR MEMBER MANAGEMENT
  // -------------------------------------------------------------

  const handleSaveMember = (data: {
    name: string;
    phone_number: string;
    instagram: string;
    address: string;
    role: any;
    credit_limit: number;
  }) => {
    const initials = getTwoLetterInitial(data.name);

    if (editingMember) {
      // Update existing member
      updateStateAndPersist((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === editingMember.id
            ? {
                ...u,
                name: data.name,
                phone_number: data.phone_number,
                instagram: data.instagram,
                address: data.address,
                role: data.role,
                avatar_initial: initials,
                credit_limit: data.credit_limit,
              }
            : u
        ),
      }));
      showToast(`Profil ${data.name} berhasil diperbarui!`);
      setEditingMember(null);
    } else {
      // Add new member
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const newUser: User = {
        id: `USR-${Date.now()}`,
        name: data.name,
        phone_number: data.phone_number,
        instagram: data.instagram,
        address: data.address,
        role: data.role,
        avatar_initial: initials,
        avatar_color: randomColor,
        credit_limit: data.credit_limit || 20000,
        is_credit_frozen: false,
        unpaid_fine: 0,
        joined_at: new Date().toISOString(),
      };

      updateStateAndPersist((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      showToast(`Anggota baru ${data.name} (${initials}) berhasil didaftarkan!`);
    }
  };

  const handleDeleteMember = (userId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
    showToast('Anggota berhasil dihapus dari database.');
  };

  const handleSaveCreditAndStatus = (
    userId: string,
    data: {
      credit_limit: number;
      is_credit_frozen: boolean;
      freeze_reason?: string;
      unpaid_fine: number;
    }
  ) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              credit_limit: data.credit_limit,
              is_credit_frozen: data.is_credit_frozen,
              freeze_reason: data.freeze_reason,
              unpaid_fine: data.unpaid_fine,
            }
          : u
      ),
    }));
    showToast('Status kredit & denda anggota berhasil diperbarui!');
  };

  // -------------------------------------------------------------
  // SHORTCUTS FOR MEMBER ACTIONS
  // -------------------------------------------------------------

  const openKasMasukForUser = (user: User, category: TransactionCategory = 'iuran') => {
    setPreSelectedMemberId(user.id);
    setPreSelectedCategory(category);
    setIsKasMasukOpen(true);
  };

  const openKasKeluarForUser = (user: User) => {
    setPreSelectedMemberId(user.id);
    setPreSelectedCategory('pinjaman_keluar');
    setIsKasKeluarOpen(true);
  };

  const handleRepayLoan = (loan: MemberLoan) => {
    setPreSelectedMemberId(loan.member_id);
    setPreSelectedCategory('hutang');
    setIsKasMasukOpen(true);
  };

  // -------------------------------------------------------------
  // WHATSAPP SUMMARY GENERATOR
  // -------------------------------------------------------------

  const copyWhatsAppSummary = () => {
    const nowStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let text = `📢 *LAPORAN KEUANGAN REAL-TIME KAS TONGKRONGAN*\n`;
    text += `📅 Update: ${nowStr}\n`;
    text += `👤 Bendahara: ${state.config.treasurer_name}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *SALDO KAS SAAT INI: Rp ${formatRupiah(summary.saldoKasSaatIni)}*\n`;
    text += `📥 Total Kas Masuk: Rp ${formatRupiah(summary.totalKasMasuk)}\n`;
    text += `📤 Total Kas Keluar: Rp ${formatRupiah(summary.totalKasKeluar)}\n`;
    text += `🤝 Piutang Pinjaman di Anggota: Rp ${formatRupiah(summary.totalHutangBeredar)}\n`;
    text += `⚠️ Total Denda Tercatat: Rp ${formatRupiah(summary.totalDendaTercatat)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👥 *STATUS ANGGOTA (${state.users.length} Orang):*\n`;
    state.users.forEach((u, i) => {
      const stats = calculateMemberStats(u, state);
      text += `${i + 1}. *[${u.avatar_initial}] ${u.name}*\n`;
      text += `   • Total Masuk: Rp ${formatRupiah(stats.totalMasuk)}\n`;
      text += `   • Pekan Ini: Rp ${formatRupiah(stats.masukPekanIni)} | Bln: Rp ${formatRupiah(stats.masukBulanIni)}\n`;
      if (stats.sisaHutang > 0) {
        text += `   • 🔴 Sisa Hutang: Rp ${formatRupiah(stats.sisaHutang)}\n`;
      }
      if (stats.dendaTertunda > 0) {
        text += `   • ⚡ Denda: Rp ${formatRupiah(stats.dendaTertunda)}\n`;
      }
      text += `   • Sisa Kredit: Rp ${formatRupiah(u.credit_limit || 0)} (Maks: Rp ${formatRupiah(stats.plafonKredit)})\n`;
      text += `   • Kepatuhan: ${stats.skorKepatuhan}% (${stats.labelKepatuhan})\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 Pembayaran iuran/pelunasan dapat ditransfer ke:\n`;
    if (state.config.treasurer_bank_name) {
      text += `• ${state.config.treasurer_bank_name}: ${state.config.treasurer_account_number}\n`;
    }
    if (state.config.treasurer_ewallet) {
      text += `• E-Wallet: ${state.config.treasurer_ewallet}\n`;
    }
    text += `_Terima kasih atas kedisiplinan dan transparansi bersama!_`;

    navigator.clipboard.writeText(text);
    showToast('📋 Ringkasan laporan berhasil disalin! Siap dibagikan ke WhatsApp.');
  };

  const handleResetData = () => {
    const emptyState: AppState = {
      users: [],
      transactions: [],
      loans: [],
      credit_restorations: [],
      config: {
        weekly_target: 20000,
        due_day: 'Sabtu',
        treasurer_name: 'Bendahara Tongkrongan',
        treasurer_phone: '081234567890',
        treasurer_bank_name: 'Bank BCA',
        treasurer_account_number: '8830123456',
        treasurer_ewallet: 'DANA (081234567890)',
        default_credit_limit: 20000,
      },
    };
    updateStateAndPersist(() => emptyState);
    showToast('Semua database kas berhasil dikosongkan!');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#2B2F38] pb-24 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Realtime Central DB Status Indicator Badge */}
      <div className="w-full bg-slate-900 text-white px-4 py-1 text-[11px] font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Central Real-time Database: Aktif & Tersinkronisasi</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>Live WebSocket Sync</span>
        </div>
      </div>

      {/* PWA In-App Install Banner */}
      <PWAInstallBanner
        onOpenModal={() => setIsInstallModalOpen(true)}
        onInstalled={() => showToast('KasTongkrongan berhasil dipasang ke Layar Utama!')}
      />

      {/* Header */}
      <Header
        config={state.config}
        totalMembers={state.users.length}
        onOpenSettings={() => setIsAdminSettingsOpen(true)}
        onOpenQRIS={() => setIsQRISOpen(true)}
        onOpenInstallPWA={() => setIsInstallModalOpen(true)}
        onOpenAddMember={() => {
          setEditingMember(null);
          setIsMemberFormOpen(true);
        }}
      />

      {/* TAB CONTENT */}
      <main className="space-y-4">
        {activeTab === 'beranda' && (
          <>
            {/* 1. Main Balance Card */}
            <MainBalanceCard
              saldoKasSaatIni={summary.saldoKasSaatIni}
              totalKasMasuk={summary.totalKasMasuk}
              totalKasKeluar={summary.totalKasKeluar}
              totalMasukBulanIni={summary.totalMasukBulanIni}
              totalKeluarBulanIni={summary.totalKeluarBulanIni}
              totalHutangBeredar={summary.totalHutangBeredar}
              totalDendaTercatat={summary.totalDendaTercatat}
              totalAnggota={state.users.length}
              onOpenKasMasuk={() => {
                setPreSelectedMemberId(undefined);
                setPreSelectedCategory('iuran');
                setIsKasMasukOpen(true);
              }}
              onOpenKasKeluar={() => {
                setPreSelectedMemberId(undefined);
                setPreSelectedCategory('pinjaman_keluar');
                setIsKasKeluarOpen(true);
              }}
              onCopySummary={copyWhatsAppSummary}
            />

            {/* Quick Actions & Highlights */}
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Member Overview Strip */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 font-heading flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#118EEA]" />
                    <span>Anggota Tongkrongan ({state.users.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('anggota')}
                    className="text-xs font-bold text-[#118EEA] hover:underline flex items-center gap-0.5"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {state.users.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
                    <p className="text-xs text-slate-500">Belum ada anggota terdaftar di sistem kas.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(null);
                        setIsMemberFormOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-[#118EEA] text-white rounded-xl text-xs font-bold"
                    >
                      + Tambah Anggota Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {state.users.slice(0, 4).map((user) => {
                      const stats = calculateMemberStats(user, state);
                      return (
                        <div
                          key={user.id}
                          className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 px-1 rounded-lg transition-colors"
                          onClick={() => setDetailMember(user)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full ${user.avatar_color} text-white flex items-center justify-center font-bold text-xs font-heading`}
                            >
                              {user.avatar_initial}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{user.name}</p>
                              <p className="text-[10px] text-slate-400">
                                Sisa Kredit: Rp {formatRupiah(user.credit_limit || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {stats.sisaHutang > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                Hutang: Rp {formatRupiah(stats.sisaHutang)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openKasMasukForUser(user);
                              }}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold"
                              title="Catat Kas Masuk"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Recent Transactions Strip */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 font-heading flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#118EEA]" />
                    <span>Mutasi Kas Terakhir</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('mutasi')}
                    className="text-xs font-bold text-[#118EEA] hover:underline flex items-center gap-0.5"
                  >
                    <span>Buku Kas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {state.transactions.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
                    <p className="text-xs text-slate-500">Belum ada transaksi kas yang dicatat.</p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreSelectedMemberId(undefined);
                          setPreSelectedCategory('iuran');
                          setIsKasMasukOpen(true);
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        + Kas Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreSelectedMemberId(undefined);
                          setPreSelectedCategory('konsumsi');
                          setIsKasKeluarOpen(true);
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                      >
                        - Kas Keluar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {state.transactions.slice(0, 4).map((tx) => {
                      const isMasuk = tx.direction === 'masuk';
                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedReceiptTx(tx)}
                          className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 px-1 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isMasuk
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {isMasuk ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                {tx.member_name}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{tx.notes}</p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-black font-heading ${
                              isMasuk ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isMasuk ? '+' : '-'} Rp {formatRupiah(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'anggota' && (
          <MemberManagementModule
            state={state}
            onOpenAddMember={() => {
              setEditingMember(null);
              setIsMemberFormOpen(true);
            }}
            onOpenEditMember={(u) => {
              setEditingMember(u);
              setIsMemberFormOpen(true);
            }}
            onDeleteMember={handleDeleteMember}
            onOpenKasMasukWithMember={(u) => openKasMasukForUser(u, 'iuran')}
            onOpenKasKeluarWithMember={(u) => openKasKeluarForUser(u)}
            onOpenManageCredit={(u) => setManagingCreditUser(u)}
            onOpenMemberDetail={(u) => setDetailMember(u)}
          />
        )}

        {activeTab === 'pinjaman' && (
          <LoanManagementModule
            loans={state.loans}
            users={state.users}
            transactions={state.transactions}
            onRepayLoan={handleRepayLoan}
            onOpenKasKeluarLoan={() => {
              setPreSelectedMemberId(undefined);
              setPreSelectedCategory('pinjaman_keluar');
              setIsKasKeluarOpen(true);
            }}
            onOpenManageCredit={(u) => setManagingCreditUser(u)}
            onOpenMemberDetail={(u) => setDetailMember(u)}
          />
        )}

        {activeTab === 'mutasi' && (
          <ActivityFeedModule
            transactions={state.transactions}
            onSelectTransaction={(tx) => setSelectedReceiptTx(tx)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        membersCount={state.users.length}
        activeLoansCount={activeLoans.length}
      />

      {/* ------------------------------------------------------------- */}
      {/* ALL MODAL DIALOGS */}
      {/* ------------------------------------------------------------- */}

      {/* 1. Modal Kas Masuk */}
      <KasMasukModal
        isOpen={isKasMasukOpen}
        onClose={() => setIsKasMasukOpen(false)}
        users={state.users}
        preSelectedMemberId={preSelectedMemberId}
        preSelectedCategory={preSelectedCategory || 'iuran'}
        onSuccess={handleKasMasukSuccess}
      />

      {/* 2. Modal Kas Keluar */}
      <KasKeluarModal
        isOpen={isKasKeluarOpen}
        onClose={() => setIsKasKeluarOpen(false)}
        users={state.users}
        availableBalance={summary.saldoKasSaatIni}
        preSelectedMemberId={preSelectedMemberId}
        preSelectedCategory={preSelectedCategory || 'pinjaman_keluar'}
        onSuccess={handleKasKeluarSuccess}
      />

      {/* 3. Modal Form Anggota (Tambah / Edit) */}
      <MemberFormModal
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        initialData={editingMember}
        onSave={handleSaveMember}
      />

      {/* 4. Modal Wewenang Kredit & Status Anggota */}
      <ManageCreditModal
        isOpen={!!managingCreditUser}
        onClose={() => setManagingCreditUser(null)}
        user={managingCreditUser}
        onSave={handleSaveCreditAndStatus}
      />

      {/* 5. Modal Member Detail & Trackrecord Lengkap */}
      <MemberDetailModal
        isOpen={!!detailMember}
        onClose={() => setDetailMember(null)}
        user={detailMember}
        state={state}
        onOpenKasMasuk={(u) => openKasMasukForUser(u, 'iuran')}
        onOpenKasKeluar={(u) => openKasKeluarForUser(u)}
        onDeleteMember={handleDeleteMember}
      />

      {/* 6. Modal Resi Digital */}
      <ReceiptModal
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
        transaction={selectedReceiptTx}
      />

      {/* 7. Modal Pengaturan Kas */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        config={state.config}
        onOpenInstallPWA={() => setIsInstallModalOpen(true)}
        onSaveConfig={(newConfig) => {
          updateStateAndPersist((prev) => ({ ...prev, config: newConfig }));
        }}
        onResetData={handleResetData}
      />

      {/* 8. Modal QRIS Viewer */}
      <QRISViewerModal
        isOpen={isQRISOpen}
        onClose={() => setIsQRISOpen(false)}
        treasurerName={state.config.treasurer_name}
      />

      {/* 9. Modal Install PWA & Offline Guide */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onSuccess={() => showToast('Aplikasi KasTongkrongan berhasil dipasang!')}
      />
    </div>
  );
}
export default App;
