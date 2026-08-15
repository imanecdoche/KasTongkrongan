export type UserRole = 'member' | 'bendahara' | 'admin';

export interface User {
  id: string;
  name: string;
  phone_number: string;
  instagram: string;
  address: string;
  role: UserRole;
  avatar_initial: string; // 2 huruf pertama dari nama
  avatar_color: string;
  created_at?: string;
  joined_at?: string;

  // Credit & Loan Control by Treasurer
  credit_limit: number; // default Rp 20.000 (20K)
  is_credit_frozen: boolean; // default false
  freeze_reason?: string;
  unpaid_fine: number; // Denda yang belum dibayar
}

export type TransactionDirection = 'masuk' | 'keluar';

export type TransactionCategory =
  | 'iuran' // Bayar Iuran Kas
  | 'hutang' // Bayar Hutang / Pelunasan Pinjaman
  | 'denda' // Bayar Denda
  | 'iuran_plus_denda' // Bayar Iuran + Denda
  | 'pemasukan_lain' // Donasi / Pemasukan Lainnya
  | 'pinjaman_keluar' // Pencairan Pinjaman ke Anggota
  | 'konsumsi' // Pengeluaran Konsumsi / Snack Tongkrongan
  | 'logistik' // Pembelian Alat / Perlengkapan Tongkrongan
  | 'alokasi_rab' // Alokasi Dana Kas ke Rancangan Anggaran Biaya (RAB)
  | 'pengembalian_rab' // Pengembalian Sisa Dana RAB ke Kas Utama
  | 'pengeluaran_lain'; // Pengeluaran Operasional Lainnya

export type PaymentMethod = 'tunai' | 'qris' | 'transfer';

export interface Transaction {
  id: string;
  direction: TransactionDirection; // 'masuk' | 'keluar'
  category: TransactionCategory;
  amount: number;
  dues_portion?: number; // portion for iuran if combined
  fine_portion?: number; // portion for fine if combined
  member_id?: string;
  member_name: string;
  method: PaymentMethod;
  notes: string;
  created_at: string;
  proof_url?: string;
  loan_id?: string;
}

export type LoanStatus = 'active' | 'paid' | 'overdue';

export interface MemberLoan {
  id: string;
  member_id: string;
  member_name: string;
  amount: number;
  remaining_amount: number;
  fine_amount?: number;
  borrowed_at?: string;
  due_date: string;
  status: LoanStatus;
  notes: string;
  repaid_at?: string;
  created_at?: string;
}

// Scheduled 3-day Credit Restoration Queue
export interface CreditRestorationItem {
  id: string;
  member_id: string;
  member_name: string;
  loan_id: string;
  repaid_amount: number;
  repaid_at: string;
  restore_due_at: string; // Timestamp ISO 3 hari setelah pelunasan
  is_restored: boolean;
  restored_at?: string;
}

export interface SystemConfig {
  weekly_target: number;
  default_credit_limit: number; // 20000
  due_day?: string;
  treasurer_name: string;
  treasurer_phone: string;
  treasurer_bank_name: string;
  treasurer_account_number: string;
  treasurer_ewallet: string;
}

// -------------------------------------------------------------
// Rancangan Anggaran Biaya (RAB) Types & Interfaces
// -------------------------------------------------------------

export type RABItemPriority = 'wajib' | 'sekunder' | 'opsional' | 'cadangan';

export interface RABItem {
  id: string;
  name: string;
  unit: string; // e.g. "buah", "potong", "lembar", "cm", "pack", "pcs", "liter", "paket", "set", "lusin", "kg", etc.
  qty: number;
  unit_price: number;
  subtotal: number; // qty * unit_price
  priority: RABItemPriority;
  notes?: string;
}

export type RABStatus = 'draft' | 'dialokasikan' | 'selesai' | 'dibatalkan';

export interface RABPlan {
  id: string;
  name: string; // Nama Rencana (e.g. "Camping Gunung Salak", "Bakar-Bakar Tahun Baru")
  pic_name: string; // PJ (Penanggung Jawab)
  pic_member_id?: string;
  event_date: string; // Waktu pelaksanaan
  location: string; // Tempat kegiatan
  items: RABItem[];
  total_budget: number; // Akumulasi subtotal seluruh item
  allocated_amount: number; // Dana kas utama yang telah dialokasikan/dieksekusi
  status: RABStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
  executed_at?: string;
}

