import React, { useState, useEffect } from 'react';
import {
  User,
  Transaction,
  MemberLoan,
  SystemConfig,
  TransactionCategory,
  PaymentMethod,
} from './types';
import {
  getInitialState,
  saveState,
  calculateFinancialSummary,
  calculateMemberStats,
  formatRupiah,
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
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AdminSettingsModal } from './components/modals/AdminSettingsModal';
import { QRISViewerModal } from './components/modals/QRISViewerModal';
import { PWAInstallModal } from './components/modals/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  HandCoins,
  Receipt,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ChevronRight,
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
    }, 3000);
  };

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

  // Sync state changes with persistence
  const updateStateAndSave = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
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

    updateStateAndSave((prev) => {
      let updatedLoans = [...prev.loans];
      let updatedUsers = [...prev.users];

      // If category is hutang / debt repayment or if user has active loans
      if (data.category === 'hutang' && data.memberId) {
        let remainingRepayment = data.amount;
        updatedLoans = updatedLoans.map((loan) => {
          if (loan.member_id === data.memberId && loan.remaining_amount > 0 && remainingRepayment > 0) {
            const payAmt = Math.min(loan.remaining_amount, remainingRepayment);
            remainingRepayment -= payAmt;
            const newRemaining = loan.remaining_amount - payAmt;
            return {
              ...loan,
              remaining_amount: newRemaining,
              status: newRemaining === 0 ? ('paid' as const) : ('active' as const),
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
      };
    });

    showToast(`✅ Berhasil mencatat Kas Masuk Rp ${formatRupiah(data.amount)} dari ${data.memberName}`);
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

    updateStateAndSave((prev) => {
      let updatedLoans = [...prev.loans];

      // If category is pinjaman_keluar -> Create new MemberLoan
      if (data.category === 'pinjaman_keluar' && data.memberId) {
        const newLoan: MemberLoan = {
          id: `LOAN-${Date.now()}`,
          member_id: data.memberId,
          member_name: data.memberName,
          amount: data.amount,
          remaining_amount: data.amount,
          status: 'active',
          due_date: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          notes: data.notes,
        };
        updatedLoans = [newLoan, ...updatedLoans];
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        loans: updatedLoans,
      };
    });

    showToast(`📤 Berhasil mencatat Kas Keluar Rp ${formatRupiah(data.amount)} (${data.memberName})`);
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
    if (editingMember) {
      // Update existing member
      updateStateAndSave((prev) => ({
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
                credit_limit: data.credit_limit,
              }
            : u
        ),
      }));
      showToast(`Profil ${data.name} berhasil diperbarui!`);
      setEditingMember(null);
    } else {
      // Add new member
      const initials = data.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const newUser: User = {
        id: `USR-${Date.now()}`,
        name: data.name,
        phone_number: data.phone_number,
        instagram: data.instagram,
        address: data.address,
        role: data.role,
        avatar_initial: initials || 'TG',
        avatar_color: randomColor,
        credit_limit: data.credit_limit || 20000,
        is_credit_frozen: false,
        unpaid_fine: 0,
        joined_at: new Date().toISOString(),
      };

      updateStateAndSave((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      showToast(`Anggota baru ${data.name} berhasil didaftarkan!`);
    }
  };

  const handleDeleteMember = (userId: string) => {
    updateStateAndSave((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
    showToast('Anggota berhasil dihapus dari sistem.');
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
    updateStateAndSave((prev) => ({
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

    let text = `📢 *LAPORAN KEUANGAN KAS TONGKRONGAN*\n`;
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
      text += `${i + 1}. *${u.name}*\n`;
      text += `   • Total Masuk: Rp ${formatRupiah(stats.totalMasuk)}\n`;
      text += `   • Pekan Ini: Rp ${formatRupiah(stats.masukPekanIni)} | Bln Ini: Rp ${formatRupiah(stats.masukBulanIni)}\n`;
      if (stats.sisaHutang > 0) {
        text += `   • 🔴 Sisa Hutang: Rp ${formatRupiah(stats.sisaHutang)}\n`;
      }
      if (stats.dendaTertunda > 0) {
        text += `   • ⚡ Denda: Rp ${formatRupiah(stats.dendaTertunda)}\n`;
      }
      text += `   • Jatah Kredit: Rp ${formatRupiah(stats.plafonKredit)} (${stats.isCreditFrozen ? '⚠️ BEKU' : 'AKTIF'})\n`;
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
    setState(emptyState);
    saveState(emptyState);
    showToast('Semua data berhasil dikosongkan!');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#2B2F38] pb-24 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

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
                        <div key={user.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full ${user.avatar_color} text-white flex items-center justify-center font-bold text-xs font-heading`}
                            >
                              {user.avatar_initial}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{user.name}</p>
                              <p className="text-[10px] text-slate-400">
                                Masuk: Rp {formatRupiah(stats.totalMasuk)}
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
                              onClick={() => openKasMasukForUser(user)}
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
          />
        )}

        {activeTab === 'pinjaman' && (
          <LoanManagementModule
            loans={state.loans}
            users={state.users}
            onRepayLoan={handleRepayLoan}
            onOpenKasKeluarLoan={() => {
              setPreSelectedMemberId(undefined);
              setPreSelectedCategory('pinjaman_keluar');
              setIsKasKeluarOpen(true);
            }}
            onOpenManageCredit={(u) => setManagingCreditUser(u)}
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

      {/* 5. Modal Resi Digital */}
      <ReceiptModal
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
        transaction={selectedReceiptTx}
      />

      {/* 6. Modal Pengaturan Kas */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        config={state.config}
        onOpenInstallPWA={() => setIsInstallModalOpen(true)}
        onSaveConfig={(newConfig) => {
          updateStateAndSave((prev) => ({ ...prev, config: newConfig }));
        }}
        onResetData={handleResetData}
      />

      {/* 7. Modal QRIS Viewer */}
      <QRISViewerModal
        isOpen={isQRISOpen}
        onClose={() => setIsQRISOpen(false)}
        treasurerName={state.config.treasurer_name}
      />

      {/* 8. Modal Install PWA & Offline Guide */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onSuccess={() => showToast('Aplikasi KasTongkrongan berhasil dipasang!')}
      />
    </div>
  );
}
export default App;
