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
}

export interface DuesCycle {
  id: string;
  cycle_name: string;
  target_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export type DuesStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface DuesRecord {
  id: string;
  cycle_id: string;
  user_id: string;
  user_name: string;
  amount_paid: number;
  target_amount: number;
  status: DuesStatus;
  fine_amount: number;
  days_late: number;
  last_updated: string;
}

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'defaulted';

export interface Loan {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  reason: string;
  status: LoanStatus;
  request_date: string;
  approved_date?: string;
  due_date: string;
  fine_amount: number;
  days_overdue: number;
  approved_by?: string;
  repaid_date?: string;
  payment_proof_url?: string;
  notes?: string;
}

export type TransactionType =
  | 'due_payment'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'fine_payment'
  | 'pocket_allocation'
  | 'expense';

export type PaymentMethod = 'qris' | 'transfer' | 'tunai';
export type TransactionStatus = 'verified' | 'pending' | 'rejected';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  user_id: string;
  user_name: string;
  method: PaymentMethod;
  proof_url?: string;
  status: TransactionStatus;
  notes: string;
  verified_by?: string;
  created_at: string;
  pocket_id?: string;
  cycle_id?: string;
  loan_id?: string;
}

export interface Pocket {
  id: string;
  name: string;
  target_amount: number;
  current_balance: number;
  description: string;
  tag: string;
}

export interface PsychTestScores {
  kejujuran: number; // 1-100
  ketegasan: number; // 1-100
  ketelitian: number; // 1-100
  pengambilan_keputusan: number; // 1-100
  komitmen: number; // 1-100
}

export interface Candidate {
  id: string;
  user_id: string;
  user_name: string;
  vision_mission: string;
  scores: PsychTestScores;
  answers: {
    question_1: string;
    question_2: string;
    question_3: string;
    question_4: string;
    question_5: string;
  };
  votes_count: number;
}

export interface VoteRecord {
  id: string;
  election_id: string;
  user_id: string;
  candidate_id: string;
  voted_at: string;
}

export interface Election {
  id: string;
  title: string;
  status: 'open' | 'closed';
  start_date: string;
  end_date: string;
  candidates: Candidate[];
  winner_id?: string;
}

export interface SystemConfig {
  weekly_target: number;
  daily_dues_fine: number;
  daily_loan_fine: number;
  loan_max_multiplier: number;
  loan_term_days: number;
  treasurer_name: string;
  treasurer_ewallet: string;
  treasurer_account_number: string;
  treasurer_bank_name: string;
  treasurer_phone: string;
}
