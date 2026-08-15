/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppState,
  getInitialState,
  saveState,
  subscribeToStateUpdates,
  calculateFinancials,
  runDailyAuditEngine,
  resetAppState,
  AVATAR_COLORS,
} from './lib/storage';
import {
  User,
  Transaction,
  Pocket,
  Candidate,
  SystemConfig,
  PaymentMethod,
  UserRole,
  DuesRecord,
} from './types';
import { Header } from './components/Header';
import { MainBalanceCard } from './components/MainBalanceCard';
import { DanaPockets } from './components/DanaPockets';
import { MemberManagementModule } from './components/MemberManagementModule';
import { WeeklyDuesModule } from './components/WeeklyDuesModule';
import { LoanSafetyNetModule } from './components/LoanSafetyNetModule';
import { TreasurerElectionModule } from './components/TreasurerElectionModule';
import { ActivityFeedModule } from './components/ActivityFeedModule';
import { BottomNavbar, NavigationTab } from './components/BottomNavbar';

// Modals
import { PaymentModal } from './components/modals/PaymentModal';
import { LoanRequestModal } from './components/modals/LoanRequestModal';
import { PocketModal } from './components/modals/PocketModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AdminSettingsModal } from './components/modals/AdminSettingsModal';
import { QRISViewerModal } from './components/modals/QRISViewerModal';

// Lucide icons
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Vote,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  UserPlus,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(() => getInitialState());
  const [activeTab, setActiveTab] = useState<NavigationTab>('beranda');

  // Modal open states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPocketModalOpen, setIsPocketModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);

  // Subscribe to multi-tab real-time sync
  useEffect(() => {
    const unsubscribe = subscribeToStateUpdates((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const financials = calculateFinancials(state);

  // Active user switch handler
  const handleSelectUser = (user: User) => {
    const updated = { ...state, currentUser: user };
    setState(updated);
    saveState(updated);
  };

  // Member Management Handlers
  const handleAddMember = (memberData: {
    name: string;
    phone_number: string;
    instagram: string;
    address: string;
    role: UserRole;
  }) => {
    const colorIndex = state.users.length % AVATAR_COLORS.length;
    const newId = 'user_' + Date.now();

    const newUser: User = {
      id: newId,
      name: memberData.name,
      phone_number: memberData.phone_number,
      instagram: memberData.instagram,
      address: memberData.address,
      role: memberData.role,
      avatar_initial: memberData.name.charAt(0).toUpperCase(),
      avatar_color: AVATAR_COLORS[colorIndex],
      created_at: new Date().toISOString(),
    };

    const updatedUsers = [...state.users, newUser];

    // Create Dues Record for the active cycle
    const newDuesRecord: DuesRecord = {
      id: 'rec_' + Date.now(),
      cycle_id: state.activeCycle.id,
      user_id: newUser.id,
      user_name: newUser.name,
      amount_paid: 0,
      target_amount: state.activeCycle.target_amount,
      status: 'unpaid',
      fine_amount: 0,
      days_late: 0,
      last_updated: new Date().toISOString(),
    };

    let updatedConfig = { ...state.config };
    if (memberData.role === 'bendahara' || updatedConfig.treasurer_name === 'Belum Ditentukan') {
      updatedConfig.treasurer_name = newUser.name;
      updatedConfig.treasurer_phone = newUser.phone_number;
    }

    const updatedState: AppState = {
      ...state,
      users: updatedUsers,
      currentUser: state.currentUser || newUser,
      duesRecords: [...state.duesRecords, newDuesRecord],
      config: updatedConfig,
    };

    setState(updatedState);
    saveState(updatedState);
  };

  const handleUpdateMember = (id: string, memberData: Partial<User>) => {
    const updatedUsers = state.users.map((u) => {
      if (u.id === id) {
        return { ...u, ...memberData };
      }
      return u;
    });

    let updatedCurrentUser = state.currentUser;
    if (state.currentUser && state.currentUser.id === id) {
      updatedCurrentUser = { ...state.currentUser, ...memberData };
    }

    // Update member name in dues records if changed
    const updatedDuesRecords = state.duesRecords.map((r) => {
      if (r.user_id === id && memberData.name) {
        return { ...r, user_name: memberData.name };
      }
      return r;
    });

    let updatedConfig = { ...state.config };
    if (memberData.role === 'bendahara' && memberData.name) {
      updatedConfig.treasurer_name = memberData.name;
      if (memberData.phone_number) updatedConfig.treasurer_phone = memberData.phone_number;
    }

    const updatedState: AppState = {
      ...state,
      users: updatedUsers,
      currentUser: updatedCurrentUser,
      duesRecords: updatedDuesRecords,
      config: updatedConfig,
    };

    setState(updatedState);
    saveState(updatedState);
  };

  const handleDeleteMember = (id: string) => {
    const updatedUsers = state.users.filter((u) => u.id !== id);
    let nextCurrentUser = state.currentUser;
    if (state.currentUser && state.currentUser.id === id) {
      nextCurrentUser = updatedUsers.length > 0 ? updatedUsers[0] : null;
    }

    const updatedDuesRecords = state.duesRecords.filter((r) => r.user_id !== id);

    const updatedState: AppState = {
      ...state,
      users: updatedUsers,
      currentUser: nextCurrentUser,
      duesRecords: updatedDuesRecords,
    };

    setState(updatedState);
    saveState(updatedState);
  };

  // 1. Dues Payment Handlers (FR-3.2)
  const handlePaymentSuccess = (paymentData: {
    amount: number;
    method: PaymentMethod;
    notes: string;
    proofUrl?: string;
  }) => {
    if (!state.currentUser) {
      alert('Silakan pilih profil anggota terlebih dahulu.');
      return;
    }

    const isInstantAutoApprove = paymentData.method === 'qris';
    const txId = 'tx_' + Date.now();

    const newTx: Transaction = {
      id: txId,
      type: 'due_payment',
      amount: paymentData.amount,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      method: paymentData.method,
      proof_url: paymentData.proofUrl,
      status: isInstantAutoApprove ? 'verified' : 'pending',
      notes: paymentData.notes,
      verified_by: isInstantAutoApprove ? 'QRIS Gateway Otomatis' : undefined,
      created_at: new Date().toISOString(),
      cycle_id: state.activeCycle.id,
    };

    // Update dues record if verified
    let updatedRecords = [...state.duesRecords];
    let updatedPockets = [...state.pockets];

    if (isInstantAutoApprove) {
      updatedRecords = updatedRecords.map((r) => {
        if (r.user_id === state.currentUser?.id && r.cycle_id === state.activeCycle.id) {
          const newAmount = r.amount_paid + paymentData.amount;
          const isLunas = newAmount >= r.target_amount;
          return {
            ...r,
            amount_paid: newAmount,
            status: isLunas ? 'paid' : 'partial',
            fine_amount: isLunas ? 0 : r.fine_amount,
            last_updated: new Date().toISOString(),
          };
        }
        return r;
      });

      // Distribute into first pocket
      if (updatedPockets.length > 0) {
        updatedPockets[0] = {
          ...updatedPockets[0],
          current_balance: updatedPockets[0].current_balance + paymentData.amount,
        };
      }
    }

    const updatedState: AppState = {
      ...state,
      transactions: [newTx, ...state.transactions],
      duesRecords: updatedRecords,
      pockets: updatedPockets,
    };

    setState(updatedState);
    saveState(updatedState);
    setSelectedReceiptTx(newTx);
  };

  // 2. Bendahara Verification Handler (FR-3.3)
  const handleVerifyTransaction = (txId: string, status: 'verified' | 'rejected') => {
    const tx = state.transactions.find((t) => t.id === txId);
    if (!tx) return;

    let updatedRecords = [...state.duesRecords];
    let updatedPockets = [...state.pockets];

    if (status === 'verified') {
      if (tx.type === 'due_payment') {
        updatedRecords = updatedRecords.map((r) => {
          if (r.user_id === tx.user_id && r.cycle_id === state.activeCycle.id) {
            const newAmount = r.amount_paid + tx.amount;
            const isLunas = newAmount >= r.target_amount;
            return {
              ...r,
              amount_paid: newAmount,
              status: isLunas ? 'paid' : 'partial',
              fine_amount: isLunas ? 0 : r.fine_amount,
              last_updated: new Date().toISOString(),
            };
          }
          return r;
        });

        // Add to pocket
        if (updatedPockets.length > 0) {
          updatedPockets[0] = {
            ...updatedPockets[0],
            current_balance: updatedPockets[0].current_balance + tx.amount,
          };
        }
      } else if (tx.type === 'fine_payment') {
        // Clear fine
        updatedRecords = updatedRecords.map((r) => {
          if (r.user_id === tx.user_id) {
            return {
              ...r,
              fine_amount: Math.max(0, r.fine_amount - tx.amount),
            };
          }
          return r;
        });
      }
    }

    const updatedTransactions = state.transactions.map((t) =>
      t.id === txId
        ? {
            ...t,
            status,
            verified_by: (state.currentUser?.name || 'Bendahara') + ' (Bendahara)',
          }
        : t
    );

    const updatedState: AppState = {
      ...state,
      transactions: updatedTransactions,
      duesRecords: updatedRecords,
      pockets: updatedPockets,
    };

    setState(updatedState);
    saveState(updatedState);
  };

  // 3. Loan Application Handler (FR-4.1)
  const handleLoanRequestSuccess = (data: { amount: number; reason: string }) => {
    if (!state.currentUser) {
      alert('Silakan pilih profil anggota terlebih dahulu.');
      return;
    }

    const newLoan = {
      id: 'loan_' + Date.now(),
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      amount: data.amount,
      reason: data.reason,
      status: 'pending' as const,
      request_date: new Date().toISOString(),
      due_date: new Date(Date.now() + state.config.loan_term_days * 24 * 60 * 60 * 1000).toISOString(),
      fine_amount: 0,
      days_overdue: 0,
    };

    const newTx: Transaction = {
      id: 'tx_loan_req_' + Date.now(),
      type: 'loan_disbursement',
      amount: data.amount,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      method: 'transfer',
      status: 'pending',
      notes: `Pengajuan Dana Talangan: "${data.reason}" (Menunggu Verifikasi Bendahara)`,
      created_at: new Date().toISOString(),
      loan_id: newLoan.id,
    };

    const updatedState: AppState = {
      ...state,
      loans: [newLoan, ...state.loans],
      transactions: [newTx, ...state.transactions],
    };

    setState(updatedState);
    saveState(updatedState);
    alert('Pengajuan dana talangan darurat berhasil dikirim ke Bendahara!');
  };

  // 4. Loan Approval Handler (FR-4.2)
  const handleApproveLoan = (loanId: string, status: 'approved' | 'rejected', notes?: string) => {
    const loan = state.loans.find((l) => l.id === loanId);
    if (!loan) return;

    let updatedPockets = [...state.pockets];
    if (status === 'approved') {
      const pocketIdx = updatedPockets.findIndex((p) => p.tag === 'Dana Darurat') !== -1 ? updatedPockets.findIndex((p) => p.tag === 'Dana Darurat') : 0;
      if (updatedPockets[pocketIdx]) {
        updatedPockets[pocketIdx] = {
          ...updatedPockets[pocketIdx],
          current_balance: Math.max(0, updatedPockets[pocketIdx].current_balance - loan.amount),
        };
      }
    }

    const updatedLoans = state.loans.map((l) =>
      l.id === loanId
        ? {
            ...l,
            status,
            approved_date: new Date().toISOString(),
            approved_by: state.currentUser?.name || 'Bendahara',
            due_date: new Date(Date.now() + state.config.loan_term_days * 24 * 60 * 60 * 1000).toISOString(),
            notes: notes || (status === 'approved' ? 'Disetujui Bendahara' : 'Ditolak Bendahara'),
          }
        : l
    );

    // Update related transaction
    const updatedTransactions = state.transactions.map((t) =>
      t.loan_id === loanId
        ? {
            ...t,
            status: status === 'approved' ? ('verified' as const) : ('rejected' as const),
            verified_by: state.currentUser?.name || 'Bendahara',
          }
        : t
    );

    const updatedState: AppState = {
      ...state,
      loans: updatedLoans,
      transactions: updatedTransactions,
      pockets: updatedPockets,
    };

    setState(updatedState);
    saveState(updatedState);
  };

  // 5. Loan Repayment Handler
  const handleRepayLoan = (loanId: string, amount: number) => {
    const loan = state.loans.find((l) => l.id === loanId);
    if (!loan) return;

    const updatedPockets = [...state.pockets];
    const pocketIdx = updatedPockets.findIndex((p) => p.tag === 'Dana Darurat') !== -1 ? updatedPockets.findIndex((p) => p.tag === 'Dana Darurat') : 0;
    if (updatedPockets[pocketIdx]) {
      updatedPockets[pocketIdx] = {
        ...updatedPockets[pocketIdx],
        current_balance: updatedPockets[pocketIdx].current_balance + amount,
      };
    }

    const updatedLoans = state.loans.map((l) =>
      l.id === loanId
        ? {
            ...l,
            status: 'paid' as const,
            repaid_date: new Date().toISOString(),
          }
        : l
    );

    const newTx: Transaction = {
      id: 'tx_repay_' + Date.now(),
      type: 'loan_repayment',
      amount,
      user_id: loan.user_id,
      user_name: loan.user_name,
      method: 'transfer',
      status: 'verified',
      notes: `Pelunasan Dana Talangan Darurat (+Denda Rp${loan.fine_amount.toLocaleString('id-ID')})`,
      verified_by: state.currentUser?.name || 'Bendahara',
      created_at: new Date().toISOString(),
      loan_id: loan.id,
    };

    const updatedState: AppState = {
      ...state,
      loans: updatedLoans,
      transactions: [newTx, ...state.transactions],
      pockets: updatedPockets,
    };

    setState(updatedState);
    saveState(updatedState);
    setSelectedReceiptTx(newTx);
  };

  // 6. Pocket Management Handlers (FR-5.2)
  const handleAddPocket = (pocketData: Omit<Pocket, 'id'>) => {
    const newPocket: Pocket = {
      ...pocketData,
      id: 'pocket_' + Date.now(),
    };
    const updatedState: AppState = {
      ...state,
      pockets: [...state.pockets, newPocket],
    };
    setState(updatedState);
    saveState(updatedState);
  };

  const handleReallocatePocket = (fromId: string, toId: string, amount: number) => {
    const updatedPockets = state.pockets.map((p) => {
      if (p.id === fromId) {
        return { ...p, current_balance: p.current_balance - amount };
      }
      if (p.id === toId) {
        return { ...p, current_balance: p.current_balance + amount };
      }
      return p;
    });

    const fromName = state.pockets.find((p) => p.id === fromId)?.name;
    const toName = state.pockets.find((p) => p.id === toId)?.name;

    const newTx: Transaction = {
      id: 'tx_alloc_' + Date.now(),
      type: 'pocket_allocation',
      amount,
      user_id: state.currentUser?.id || 'admin',
      user_name: state.currentUser?.name || 'Admin',
      method: 'transfer',
      status: 'verified',
      notes: `Pergeseran alokasi dana dari [${fromName}] ke [${toName}]`,
      verified_by: state.currentUser?.name || 'Admin',
      created_at: new Date().toISOString(),
    };

    const updatedState: AppState = {
      ...state,
      pockets: updatedPockets,
      transactions: [newTx, ...state.transactions],
    };

    setState(updatedState);
    saveState(updatedState);
  };

  // 7. Voting & Election Handlers (FR-2.3)
  const handleVote = (candidateId: string) => {
    if (!state.currentUser) {
      alert('Silakan pilih profil anggota terlebih dahulu.');
      return;
    }

    if (state.election.status === 'closed') {
      alert('Periode pemilihan bendahara telah ditutup.');
      return;
    }

    const existingVoteIndex = state.votes.findIndex((v) => v.user_id === state.currentUser?.id);
    let updatedVotes = [...state.votes];

    if (existingVoteIndex !== -1) {
      // Change vote
      const oldCandidateId = updatedVotes[existingVoteIndex].candidate_id;
      updatedVotes[existingVoteIndex] = {
        ...updatedVotes[existingVoteIndex],
        candidate_id: candidateId,
        voted_at: new Date().toISOString(),
      };

      const updatedCandidates = state.election.candidates.map((c) => {
        if (c.id === oldCandidateId) return { ...c, votes_count: Math.max(0, c.votes_count - 1) };
        if (c.id === candidateId) return { ...c, votes_count: c.votes_count + 1 };
        return c;
      });

      const updatedState: AppState = {
        ...state,
        votes: updatedVotes,
        election: { ...state.election, candidates: updatedCandidates },
      };
      setState(updatedState);
      saveState(updatedState);
      alert('Pilihan suara berhasil diperbarui!');
    } else {
      // New vote
      const newVote = {
        id: 'vote_' + Date.now(),
        election_id: state.election.id,
        user_id: state.currentUser.id,
        candidate_id: candidateId,
        voted_at: new Date().toISOString(),
      };
      updatedVotes.push(newVote);

      const updatedCandidates = state.election.candidates.map((c) =>
        c.id === candidateId ? { ...c, votes_count: c.votes_count + 1 } : c
      );

      const updatedState: AppState = {
        ...state,
        votes: updatedVotes,
        election: { ...state.election, candidates: updatedCandidates },
      };
      setState(updatedState);
      saveState(updatedState);
      alert('Suara Anda berhasil dicatat secara sah!');
    }
  };

  const handleAddCandidate = (candidateData: Omit<Candidate, 'id' | 'votes_count'>) => {
    const newCand: Candidate = {
      ...candidateData,
      id: 'cand_' + Date.now(),
      votes_count: 0,
    };

    const updatedState: AppState = {
      ...state,
      election: {
        ...state.election,
        candidates: [...state.election.candidates, newCand],
      },
    };

    setState(updatedState);
    saveState(updatedState);
  };

  const handleToggleElectionStatus = () => {
    const newStatus = state.election.status === 'open' ? 'closed' : 'open';
    const updatedState: AppState = {
      ...state,
      election: {
        ...state.election,
        status: newStatus,
      },
    };
    setState(updatedState);
    saveState(updatedState);
  };

  // 8. Admin & Audit Runner Handlers
  const handleSaveConfig = (newConfig: SystemConfig) => {
    const updatedState: AppState = {
      ...state,
      config: newConfig,
    };
    setState(updatedState);
    saveState(updatedState);
  };

  const handleRunAuditEngine = () => {
    const res = runDailyAuditEngine(state);
    setState(res.updatedState);
    return res;
  };

  const handleResetData = () => {
    const fresh = resetAppState();
    setState(fresh);
    alert('Seluruh data simulasi kas berhasil di-reset.');
  };

  const pendingVerificationCount = state.transactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 text-[#2B2F38] selection:bg-[#118EEA] selection:text-white">
      {/* Top Header Bar */}
      <Header
        currentUser={state.currentUser}
        users={state.users}
        onSelectUser={handleSelectUser}
        onOpenSettings={() => setIsAdminModalOpen(true)}
        onOpenQRIS={() => setIsQRISModalOpen(true)}
        onNavigateToMembers={() => setActiveTab('anggota')}
      />

      {/* Main Content Rendered by Tab */}
      <main className="transition-all duration-200">
        {activeTab === 'beranda' && (
          <div className="space-y-6 pb-6">
            {/* DANA Signature Blue Card */}
            <MainBalanceCard
              totalKasKomunal={financials.totalKasKomunal}
              availableBalance={financials.availableBalance}
              borrowedAmount={financials.borrowedAmount}
              totalPendingFines={financials.totalPendingFines}
              config={state.config}
              activeCycleName={state.activeCycle.cycle_name}
              onOpenPaymentModal={() => {
                if (state.users.length === 0) {
                  setActiveTab('anggota');
                  return;
                }
                setIsPaymentModalOpen(true);
              }}
              onOpenLoanModal={() => {
                if (state.users.length === 0) {
                  setActiveTab('anggota');
                  return;
                }
                setIsLoanModalOpen(true);
              }}
              onOpenVotingTab={() => setActiveTab('pemilihan')}
              onOpenQRISModal={() => setIsQRISModalOpen(true)}
              onTriggerAudit={() => {
                const res = handleRunAuditEngine();
                alert(`Audit Harian Selesai! Denda Ditambahkan: Rp${(res.duesFinesAdded + res.loanFinesAdded).toLocaleString('id-ID')}`);
              }}
            />

            {/* Quick Member Onboarding Banner when 0 users */}
            {state.users.length === 0 && (
              <section className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-[#118EEA] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E7F3FE] text-[#118EEA] flex items-center justify-center mx-auto">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2B2F38] font-heading">
                      Selamat Datang di Kas Tongkrongan
                    </h3>
                    <p className="text-xs text-[#727986] max-w-md mx-auto mt-1">
                      Belum ada anggota yang terdaftar. Tambahkan anggota tongkrongan (Nama, No HP/WhatsApp, Instagram, dan Alamat) untuk memulai pencatatan iuran kas dan tata kelola keuangan bersama.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('anggota')}
                    className="px-5 py-2.5 bg-[#118EEA] hover:bg-[#0B63C5] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tambah Anggota Sekarang</span>
                  </button>
                </div>
              </section>
            )}

            {/* DANA Pocket Layout (FR-5.2) */}
            <DanaPockets
              pockets={state.pockets}
              onOpenManagePockets={() => setIsPocketModalOpen(true)}
            />

            {/* Quick Status Anggota Minggu Ini */}
            <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-2">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#2B2F38] font-heading">
                      Status Setoran Kas Minggu Ini
                    </h3>
                    <p className="text-xs text-[#727986]">{state.activeCycle.cycle_name}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('iuran')}
                    className="text-xs font-bold text-[#118EEA] hover:underline flex items-center gap-1"
                  >
                    <span>Lihat Rincian</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {state.duesRecords.slice(0, 4).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-[#F5F6F8] rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E7F3FE] text-[#118EEA] font-bold text-xs flex items-center justify-center font-heading">
                          {rec.user_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2B2F38]">{rec.user_name}</p>
                          <p className="text-[11px] text-[#727986]">
                            Rp {rec.amount_paid.toLocaleString('id-ID')} / Rp {rec.target_amount.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {rec.status === 'paid' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF9EE] text-[#34C759] border border-[#34C759]/30">
                          LUNAS
                        </span>
                      ) : rec.fine_amount > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFECEB] text-[#FF3B30] border border-[#FF3B30]/30">
                          +DENDA Rp{rec.fine_amount.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          BELUM LUNAS
                        </span>
                      )}
                    </div>
                  ))}

                  {state.duesRecords.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-[#727986]">
                      Belum ada catatan iuran. Daftarkan anggota di tab Anggota.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Live Feed Preview */}
            <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-1">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#2B2F38] font-heading">
                    Aktivitas Kas Terbaru (Live Feed)
                  </h3>
                  <button
                    onClick={() => setActiveTab('mutasi')}
                    className="text-xs font-bold text-[#118EEA] hover:underline flex items-center gap-1"
                  >
                    <span>Semua Mutasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {state.transactions.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedReceiptTx(tx)}
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors -mx-2 px-2 rounded-xl"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#2B2F38]">{tx.user_name}</p>
                        <p className="text-[11px] text-[#727986] line-clamp-1">{tx.notes}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold font-heading text-[#118EEA]">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {state.transactions.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#727986]">
                      Belum ada riwayat transaksi kas tercatat.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'anggota' && (
          <MemberManagementModule
            currentUser={state.currentUser}
            users={state.users}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onSelectActiveUser={handleSelectUser}
          />
        )}

        {activeTab === 'iuran' && (
          <WeeklyDuesModule
            currentUser={state.currentUser}
            activeCycle={state.activeCycle}
            duesRecords={state.duesRecords}
            pendingTransactions={state.transactions}
            config={state.config}
            onOpenPaymentModal={() => {
              if (state.users.length === 0) {
                setActiveTab('anggota');
                return;
              }
              setIsPaymentModalOpen(true);
            }}
            onVerifyTransaction={handleVerifyTransaction}
            onNavigateToMembers={() => setActiveTab('anggota')}
          />
        )}

        {activeTab === 'pinjaman' && (
          <LoanSafetyNetModule
            currentUser={state.currentUser}
            loans={state.loans}
            config={state.config}
            availableCash={financials.availableBalance}
            onOpenLoanModal={() => {
              if (state.users.length === 0) {
                setActiveTab('anggota');
                return;
              }
              setIsLoanModalOpen(true);
            }}
            onApproveLoan={handleApproveLoan}
            onRepayLoan={handleRepayLoan}
          />
        )}

        {activeTab === 'pemilihan' && (
          <TreasurerElectionModule
            currentUser={state.currentUser}
            election={state.election}
            votes={state.votes}
            onVote={handleVote}
            onAddCandidate={handleAddCandidate}
            onToggleElectionStatus={handleToggleElectionStatus}
            onNavigateToMembers={() => setActiveTab('anggota')}
          />
        )}

        {activeTab === 'mutasi' && (
          <ActivityFeedModule
            transactions={state.transactions}
            onSelectTransaction={(tx) => setSelectedReceiptTx(tx)}
            totalKasKomunal={financials.totalKasKomunal}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingVerificationCount}
        membersCount={state.users.length}
      />

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        currentUser={state.currentUser}
        config={state.config}
        targetAmount={state.config.weekly_target}
        onSuccess={handlePaymentSuccess}
      />

      <LoanRequestModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        currentUser={state.currentUser}
        config={state.config}
        activeLoan={state.loans.find((l) => l.user_id === state.currentUser?.id && l.status === 'approved')}
        onSuccess={handleLoanRequestSuccess}
      />

      <PocketModal
        isOpen={isPocketModalOpen}
        onClose={() => setIsPocketModalOpen(false)}
        pockets={state.pockets}
        totalAvailableCash={financials.availableBalance}
        onAddPocket={handleAddPocket}
        onReallocate={handleReallocatePocket}
      />

      <ReceiptModal
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
        transaction={selectedReceiptTx}
      />

      <AdminSettingsModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        config={state.config}
        lastAuditDate={state.lastAuditDate}
        onSaveConfig={handleSaveConfig}
        onRunAuditEngine={handleRunAuditEngine}
        onResetData={handleResetData}
      />

      <QRISViewerModal
        isOpen={isQRISModalOpen}
        onClose={() => setIsQRISModalOpen(false)}
        treasurerName={state.config.treasurer_name}
      />
    </div>
  );
}
