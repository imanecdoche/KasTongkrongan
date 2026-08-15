import {
  User,
  Transaction,
  MemberLoan,
  SystemConfig,
  CreditRestorationItem,
  RABPlan,
  RABItem,
  RABItemPriority,
} from '../types';

const STORAGE_KEY = 'kas_tongkrongan_v3_realtime_db';
const RESTORATION_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 hari dalam milidetik

export interface AppState {
  users: User[];
  loans: MemberLoan[];
  transactions: Transaction[];
  credit_restorations?: CreditRestorationItem[];
  rabs?: RABPlan[];
  config: SystemConfig;
  updated_at?: string;
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

/**
 * Generate standard 2-letter uppercase initials from full name
 * e.g. "Budi Santoso" -> "BU", "Ahmad" -> "AH", "Rio" -> "RI"
 */
export function getTwoLetterInitial(name: string): string {
  if (!name) return '??';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = words[0][0] || '';
    const second = words[1][0] || '';
    return (first + second).toUpperCase();
  }

  if (words.length === 1) {
    const single = words[0];
    if (single.length >= 2) {
      return single.substring(0, 2).toUpperCase();
    }
    return (single + single).toUpperCase();
  }

  return 'KT';
}

/**
 * Check and process 3-day automatic credit limit restorations
 */
export function processCreditRestorations(state: AppState): AppState {
  if (!state.credit_restorations || state.credit_restorations.length === 0) {
    return state;
  }

  const now = new Date().getTime();
  let hasChanges = false;

  const updatedUsers = [...state.users];
  const updatedRestorations = state.credit_restorations.map((item) => {
    if (!item.is_restored) {
      const dueTime = new Date(item.restore_due_at).getTime();
      if (now >= dueTime) {
        // 3 days elapsed! Restore credit limit to default if user limit was reduced
        const userIndex = updatedUsers.findIndex((u) => u.id === item.member_id);
        if (userIndex !== -1) {
          const user = updatedUsers[userIndex];
          const defaultLimit = state.config.default_credit_limit || 20000;
          if (user.credit_limit < defaultLimit) {
            updatedUsers[userIndex] = {
              ...user,
              credit_limit: Math.min(defaultLimit, user.credit_limit + item.repaid_amount),
            };
          }
        }
        hasChanges = true;
        return {
          ...item,
          is_restored: true,
          restored_at: new Date().toISOString(),
        };
      }
    }
    return item;
  });

  if (hasChanges) {
    return {
      ...state,
      users: updatedUsers,
      credit_restorations: updatedRestorations,
    };
  }

  return state;
}

// Initial state loader
export function getInitialState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.users)) {
        return processCreditRestorations({
          users: parsed.users.map((u: User) => ({
            ...u,
            avatar_initial: getTwoLetterInitial(u.name),
          })),
          loans: parsed.loans || [],
          transactions: parsed.transactions || [],
          credit_restorations: parsed.credit_restorations || [],
          rabs: parsed.rabs || [],
          config: parsed.config || DEFAULT_CONFIG,
        });
      }
    }
  } catch (err) {
    console.error('Failed to load state from local cache', err);
  }

  const initial: AppState = {
    users: [],
    loans: [],
    transactions: [],
    credit_restorations: [],
    rabs: [],
    config: DEFAULT_CONFIG,
  };

  saveStateLocal(initial);
  return initial;
}

// WebSocket connection for real-time central database sync
let socket: WebSocket | null = null;
let reconnectTimer: any = null;
const stateSubscribers: Array<(state: AppState) => void> = [];

export function initRealtimeDatabase(onUpdate: (state: AppState) => void) {
  stateSubscribers.push(onUpdate);

  // 1. Initial fetch from Backend Database REST API
  fetch('/api/state')
    .then((res) => res.json())
    .then((res) => {
      if (res && res.status === 'success' && res.data) {
        const syncedState = processCreditRestorations(res.data);
        saveStateLocal(syncedState);
        onUpdate(syncedState);
      }
    })
    .catch((err) => {
      console.warn('[DB] Offline/Local mode fallback for initial load:', err);
    });

  // 2. Connect WebSocket for instant live sync across all devices
  function connectWS() {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/kas`;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[Realtime DB] Connected to central database stream.');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if ((payload.type === 'SYNC_STATE' || payload.type === 'INIT_STATE') && payload.state) {
            const freshState = processCreditRestorations(payload.state);
            saveStateLocal(freshState);
            stateSubscribers.forEach((cb) => cb(freshState));
          }
        } catch (err) {
          console.error('[Realtime DB] Error parsing websocket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('[Realtime DB] Disconnected, attempting reconnect in 3s...');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWS, 3000);
      };

      socket.onerror = (err) => {
        console.warn('[Realtime DB] WebSocket error:', err);
        socket?.close();
      };
    } catch (err) {
      console.error('[Realtime DB] Failed to create WebSocket connection:', err);
    }
  }

  connectWS();

  return () => {
    const idx = stateSubscribers.indexOf(onUpdate);
    if (idx !== -1) {
      stateSubscribers.splice(idx, 1);
    }
  };
}

export function saveStateLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to local cache', err);
  }
}

/**
 * Persist state to Central Database & Realtime broadcast
 */
export async function persistStateToDatabase(state: AppState): Promise<AppState> {
  const processedState = processCreditRestorations(state);
  saveStateLocal(processedState);

  // If WebSocket connected, send instant update
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: 'UPDATE_STATE',
        state: processedState,
        timestamp: Date.now(),
      })
    );
  }

  // Backup sync via HTTP POST
  try {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedState),
    }).catch((err) => {
      console.warn('[Realtime DB] HTTP background sync notice:', err);
    });
  } catch (err) {
    // Ignore network error in offline mode
  }

  return processedState;
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
  totalPinjam: number;
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
  pendingRestorations: CreditRestorationItem[];
}

export function calculateMemberStats(user: User, state: AppState): MemberStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalMasuk = 0;
  let totalPinjam = 0;
  let masukPekanIni = 0;
  let masukBulanIni = 0;
  let transaksiCount = 0;

  const isMatchingMember = (memberId?: string, memberName?: string) => {
    if (memberId && memberId === user.id) return true;
    if (memberName && user.name && memberName.toLowerCase().trim() === user.name.toLowerCase().trim()) return true;
    return false;
  };

  state.transactions.forEach((tx) => {
    if (isMatchingMember(tx.member_id, tx.member_name)) {
      transaksiCount++;
      const txDate = new Date(tx.created_at);
      if (tx.direction === 'masuk') {
        totalMasuk += tx.amount;
        if (txDate >= sevenDaysAgo) {
          masukPekanIni += tx.amount;
        }
        if (txDate >= thirtyDaysAgo) {
          masukBulanIni += tx.amount;
        }
      } else if (tx.category === 'pinjaman_keluar' || tx.direction === 'keluar') {
        totalPinjam += tx.amount;
      }
    }
  });

  // Calculate active loans for this member (match ID or Name)
  const allMemberLoans = state.loans.filter((l) => isMatchingMember(l.member_id, l.member_name));
  const activeMemberLoans = allMemberLoans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const sisaHutang = activeMemberLoans.reduce((sum, l) => sum + l.remaining_amount, 0);

  // If totalPinjam was 0 from transactions, fallback to total amount from loan records
  if (totalPinjam === 0 && allMemberLoans.length > 0) {
    totalPinjam = allMemberLoans.reduce((sum, l) => sum + l.amount, 0);
  }

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

  // Pending 3-day restorations for this member
  const pendingRestorations = (state.credit_restorations || []).filter(
    (item) => isMatchingMember(item.member_id, item.member_name) && !item.is_restored
  );

  return {
    totalMasuk,
    totalPinjam,
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
    pendingRestorations,
  };
}

export async function resetAppState(): Promise<AppState> {
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const json = await res.json();
    if (json && json.data) {
      saveStateLocal(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn('[DB] Fallback local reset:', err);
  }

  localStorage.removeItem(STORAGE_KEY);
  const fresh = getInitialState();
  return fresh;
}

/**
 * Format nominal singkat dengan suffix 'k' (contoh: 5.000 -> 5k, 5.500 -> 5,5k, 12.000 -> 12k, 12.250 -> 12,25k)
 */
export function formatAmountK(amount: number): string {
  const kVal = (amount || 0) / 1000;
  const formatted = kVal.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return `${formatted}k`;
}

export interface RABSummary {
  totalBudget: number;
  allocatedAmount: number;
  remainingNeeded: number;
  allocationPercentage: number;
  totalItems: number;
  priorityTotals: {
    wajib: number;
    sekunder: number;
    opsional: number;
    cadangan: number;
  };
  priorityCounts: {
    wajib: number;
    sekunder: number;
    opsional: number;
    cadangan: number;
  };
}

/**
 * Calculate financial breakdown & stats for an RAB plan
 */
export function calculateRABSummary(rab: RABPlan): RABSummary {
  const items = rab.items || [];
  let totalBudget = 0;
  const priorityTotals = {
    wajib: 0,
    sekunder: 0,
    opsional: 0,
    cadangan: 0,
  };
  const priorityCounts = {
    wajib: 0,
    sekunder: 0,
    opsional: 0,
    cadangan: 0,
  };

  items.forEach((item) => {
    const subtotal = (item.qty || 0) * (item.unit_price || 0);
    totalBudget += subtotal;
    const prio = item.priority || 'wajib';
    if (priorityTotals[prio] !== undefined) {
      priorityTotals[prio] += subtotal;
      priorityCounts[prio] += 1;
    } else {
      priorityTotals.wajib += subtotal;
      priorityCounts.wajib += 1;
    }
  });

  const allocatedAmount = rab.allocated_amount || 0;
  const remainingNeeded = Math.max(0, totalBudget - allocatedAmount);
  const allocationPercentage = totalBudget > 0 ? Math.min(100, Math.round((allocatedAmount / totalBudget) * 100)) : 0;

  return {
    totalBudget,
    allocatedAmount,
    remainingNeeded,
    allocationPercentage,
    totalItems: items.length,
    priorityTotals,
    priorityCounts,
  };
}

