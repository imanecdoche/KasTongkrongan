export type UserRole = 'member' | 'bendahara' | 'admin';

export interface User {
  id: string;
  name: string;
  phone_number: string;
  instagram: string;
  address: string;
  role: UserRole;
  avatar_initial: string;
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
