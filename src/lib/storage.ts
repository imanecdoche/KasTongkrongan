import {
  User,
  DuesCycle,
  DuesRecord,
  Loan,
  Transaction,
  Pocket,
  Election,
  VoteRecord,
  SystemConfig,
  UserRole,
} from '../types';

const STORAGE_KEY = 'kas_tongkrongan_clean_v2';
const BROADCAST_CHANNEL_NAME = 'kas_tongkrongan_sync_channel';

export interface AppState {
  currentUser: User | null;
  users: User[];
  config: SystemConfig;
  activeCycle: DuesCycle;
  pastCycles: DuesCycle[];
  duesRecords: DuesRecord[];
  loans: Loan[];
  transactions: Transaction[];
  pockets: Pocket[];
  election: Election;
  votes: VoteRecord[];
  lastAuditDate: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  weekly_target: 20000,
  daily_dues_fine: 500,
  daily_loan_fine: 1000,
  loan_max_multiplier: 1.0,
  loan_term_days: 7,
  treasurer_name: 'Belum Ditentukan',
  treasurer_ewallet: 'DANA (08xx-xxxx-xxxx)',
  treasurer_account_number: 'Rekening Bendahara (BCA/Mandiri)',
  treasurer_bank_name: 'Bank Central Asia (BCA)',
  treasurer_phone: '-',
};

const DEFAULT_CYCLE: DuesCycle = {
  id: 'cycle_current',
  cycle_name: 'Periode Minggu Berjalan',
  target_amount: 20000,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
};

const DEFAULT_ELECTION: Election = {
  id: 'elect_current',
  title: 'Pemilihan Bendahara Kas Tongkrongan',
  status: 'open',
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  candidates: [],
};

export const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-purple-600',
  'bg-cyan-600',
];

export function getInitialState(): AppState {
  try {
    // Clear legacy dummy key if present
    if (localStorage.getItem('kas_tongkrongan_data_v1')) {
      localStorage.removeItem('kas_tongkrongan_data_v1');
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load state from localStorage', err);
  }

  // Pure clean state with NO dummy data, NO dummy users, NO dummy transactions
  const initial: AppState = {
    currentUser: null,
    users: [],
    config: DEFAULT_CONFIG,
    activeCycle: DEFAULT_CYCLE,
    pastCycles: [],
    duesRecords: [],
    loans: [],
    transactions: [],
    pockets: [],
    election: DEFAULT_ELECTION,
    votes: [],
    lastAuditDate: new Date().toISOString(),
  };

  saveState(initial);
  return initial;
}

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
}

export function subscribeToStateUpdates(callback: (state: AppState) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        callback(JSON.parse(event.newValue));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'STATE_UPDATED') {
      const state = getInitialState();
      callback(state);
    }
  };

  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

// Financial calculation helper:
export function calculateFinancials(state: AppState) {
  const totalInPockets = state.pockets.reduce((sum, p) => sum + p.current_balance, 0);

  const borrowedAmount = state.loans
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCollectedDues = state.duesRecords.reduce((sum, r) => sum + r.amount_paid, 0);

  const totalPendingFines =
    state.duesRecords.reduce((sum, r) => sum + r.fine_amount, 0) +
    state.loans.filter((l) => l.status === 'approved').reduce((sum, l) => sum + l.fine_amount, 0);

  const availableBalance = totalInPockets;
  const totalKasKomunal = availableBalance + borrowedAmount;

  return {
    totalKasKomunal,
    availableBalance,
    borrowedAmount,
    totalCollectedDues,
    totalPendingFines,
  };
}

// Daily Audit & Fine Calculation Engine
export function runDailyAuditEngine(state: AppState): {
  updatedState: AppState;
  duesFinesAdded: number;
  loanFinesAdded: number;
  auditNotes: string[];
} {
  const now = new Date();
  const auditNotes: string[] = [];
  let duesFinesAdded = 0;
  let loanFinesAdded = 0;

  if (state.duesRecords.length === 0 && state.loans.length === 0) {
    return {
      updatedState: { ...state, lastAuditDate: now.toISOString() },
      duesFinesAdded: 0,
      loanFinesAdded: 0,
      auditNotes: ['Belum ada catatan iuran atau pinjaman untuk diaudit.'],
    };
  }

  // 1. Audit Dues: for any member who hasn't paid full target (or is overdue)
  const updatedDuesRecords = state.duesRecords.map((record) => {
    if (record.amount_paid < record.target_amount) {
      const newDaysLate = record.days_late + 1;
      const additionalFine = state.config.daily_dues_fine;
      duesFinesAdded += additionalFine;
      auditNotes.push(
        `Denda iuran Rp${additionalFine.toLocaleString('id-ID')} ditambahkan untuk ${record.user_name} (Keterlambatan: ${newDaysLate} hari).`
      );
      return {
        ...record,
        status: 'overdue' as const,
        days_late: newDaysLate,
        fine_amount: record.fine_amount + additionalFine,
        last_updated: now.toISOString(),
      };
    }
    return record;
  });

  // 2. Audit Loans: for any approved loan past 7 days due date
  const updatedLoans = state.loans.map((loan) => {
    if (loan.status === 'approved') {
      const dueDate = new Date(loan.due_date);
      if (now > dueDate) {
        const diffTime = Math.abs(now.getTime() - dueDate.getTime());
        const daysPast = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const additionalFine = state.config.daily_loan_fine;
        loanFinesAdded += additionalFine;
        auditNotes.push(
          `Denda pinjaman Rp${additionalFine.toLocaleString('id-ID')} ditambahkan untuk ${loan.user_name} (Melewati jatuh tempo ${daysPast} hari).`
        );
        return {
          ...loan,
          days_overdue: daysPast,
          fine_amount: loan.fine_amount + additionalFine,
        };
      }
    }
    return loan;
  });

  // 3. Create an automated audit transaction log
  const newTransactions = [...state.transactions];
  if (auditNotes.length > 0) {
    const auditTx: Transaction = {
      id: 'tx_audit_' + Date.now(),
      type: 'fine_payment',
      amount: duesFinesAdded + loanFinesAdded,
      user_id: 'system',
      user_name: 'Sistem Audit Otomatis (Cron WIB)',
      method: 'tunai',
      status: 'verified',
      notes: `Akumulasi denda harian: ${duesFinesAdded > 0 ? `Iuran Rp${duesFinesAdded.toLocaleString('id-ID')}` : ''} ${
        loanFinesAdded > 0 ? `Pinjaman Rp${loanFinesAdded.toLocaleString('id-ID')}` : ''
      }. Catatan: ${auditNotes.join(' ')}`,
      created_at: now.toISOString(),
      verified_by: 'Sistem Pusat',
    };
    newTransactions.unshift(auditTx);
  }

  const updatedState: AppState = {
    ...state,
    duesRecords: updatedDuesRecords,
    loans: updatedLoans,
    transactions: newTransactions,
    lastAuditDate: now.toISOString(),
  };

  saveState(updatedState);
  return { updatedState, duesFinesAdded, loanFinesAdded, auditNotes };
}

// Reset data to pure empty state
export function resetAppState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  const fresh = getInitialState();
  return fresh;
}
