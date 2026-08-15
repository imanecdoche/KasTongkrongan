import {
  User,
  Transaction,
  MemberLoan,
  SystemConfig,
  TransactionCategory,
  PaymentMethod,
} from '../types';

const STORAGE_KEY = 'kas_tongkrongan_v3_bendahara';
const BROADCAST_CHANNEL_NAME = 'kas_tongkrongan_sync_v3';

export interface AppState {
  users: User[];
  loans: MemberLoan[];
  transactions: Transaction[];
  config: SystemConfig;
}

export const DEFAULT_CONFIG: SystemConfig = {
  weekly_target: 20000,
  default_credit_limit: 20000, // 20K per member
  treasurer_name: 'Bendahara Tongkrongan',
  treasurer_phone: '0812-3456-7890',
  treasurer_bank_name: 'Bank BCA',
  treasurer_account_number: '1234567890',
  treasurer_ewallet: 'DANA (0812-3456-7890)',
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

  const initial: AppState = {
    users: [],
    loans: [],
    transactions: [],
    config: DEFAULT_CONFIG,
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

// Format numbers with thousand separator dots (e.g. 50000 -> 50.000)
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// Parse string with thousand dots or commas to number
export function parseRupiahInput(value: string): number {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

// Financial calculations for the main dashboard
export function calculateFinancialSummary(state: AppState) {
  let totalKasMasuk = 0;
  let totalKasKeluar = 0;
  let totalMasukBulanIni = 0;
  let totalKeluarBulanIni = 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  state.transactions.forEach((tx) => {
    const txDate = new Date(tx.created_at);
    if (tx.direction === 'masuk') {
      totalKasMasuk += tx.amount;
      if (txDate >= thirtyDaysAgo) {
        totalMasukBulanIni += tx.amount;
      }
    } else {
      totalKasKeluar += tx.amount;
      if (txDate >= thirtyDaysAgo) {
        totalKeluarBulanIni += tx.amount;
      }
    }
  });

  const saldoKasSaatIni = totalKasMasuk - totalKasKeluar;

  // Active Loans & Debt stats
  const totalHutangBeredar = state.loans
    .filter((l) => l.status === 'active' || l.status === 'overdue')
    .reduce((sum, l) => sum + l.remaining_amount, 0);

  const totalDendaTercatat = state.users.reduce((sum, u) => sum + (u.unpaid_fine || 0), 0);

  return {
    saldoKasSaatIni,
    totalKasMasuk,
    totalKasKeluar,
    totalMasukBulanIni,
    totalKeluarBulanIni,
    totalHutangBeredar,
    totalDendaTercatat,
    totalTransaksi: state.transactions.length,
    totalAnggota: state.users.length,
  };
}

// Member Detailed Statistics Calculation
export interface MemberStats {
  totalMasuk: number;
  masukPekanIni: number;
  masukBulanIni: number;
  sisaHutang: number;
  dendaTertunda: number;
  plafonKredit: number;
  sisaKreditTersedia: number;
  isCreditFrozen: boolean;
  skorKepatuhan: number; // 0 - 100
  labelKepatuhan: string; // 'Sangat Patuh', 'Patuh', 'Cukup', 'Perlu Perhatian'
  badgeColor: string;
  transaksiCount: number;
}

export function calculateMemberStats(user: User, state: AppState): MemberStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalMasuk = 0;
  let masukPekanIni = 0;
  let masukBulanIni = 0;
  let transaksiCount = 0;

  state.transactions.forEach((tx) => {
    if (tx.member_id === user.id && tx.direction === 'masuk') {
      totalMasuk += tx.amount;
      transaksiCount++;
      const txDate = new Date(tx.created_at);
      if (txDate >= sevenDaysAgo) {
        masukPekanIni += tx.amount;
      }
      if (txDate >= thirtyDaysAgo) {
        masukBulanIni += tx.amount;
      }
    }
  });

  // Calculate active loans for this member
  const memberLoans = state.loans.filter(
    (l) => l.member_id === user.id && (l.status === 'active' || l.status === 'overdue')
  );
  const sisaHutang = memberLoans.reduce((sum, l) => sum + l.remaining_amount, 0);
  const dendaTertunda = user.unpaid_fine || 0;

  const plafonKredit = user.credit_limit ?? 20000;
  const isCreditFrozen = !!user.is_credit_frozen;
  const sisaKreditTersedia = isCreditFrozen ? 0 : Math.max(0, plafonKredit - sisaHutang);

  // Calculate compliance score (0-100)
  let score = 100;
  if (isCreditFrozen) score -= 40;
  if (sisaHutang > 0) score -= 15;
  if (dendaTertunda > 0) score -= 20;

  // Bonus for active weekly contributions
  if (masukPekanIni >= (state.config.weekly_target || 20000)) {
    score = Math.min(100, score + 5);
  }

  score = Math.max(20, Math.min(100, score));

  let labelKepatuhan = 'Sangat Patuh';
  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';

  if (score >= 90) {
    labelKepatuhan = 'Sangat Patuh';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  } else if (score >= 75) {
    labelKepatuhan = 'Patuh';
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-300';
  } else if (score >= 60) {
    labelKepatuhan = 'Cukup';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-300';
  } else {
    labelKepatuhan = 'Perlu Perhatian';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-300';
  }

  return {
    totalMasuk,
    masukPekanIni,
    masukBulanIni,
    sisaHutang,
    dendaTertunda,
    plafonKredit,
    sisaKreditTersedia,
    isCreditFrozen,
    skorKepatuhan: score,
    labelKepatuhan,
    badgeColor,
    transaksiCount,
  };
}

export function resetAppState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  const fresh = getInitialState();
  return fresh;
}
