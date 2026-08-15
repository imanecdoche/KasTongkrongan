import React from 'react';
import {
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Vote,
  Play,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { SystemConfig } from '../types';

interface MainBalanceCardProps {
  totalKasKomunal: number;
  availableBalance: number;
  borrowedAmount: number;
  totalPendingFines: number;
  config: SystemConfig;
  activeCycleName: string;
  onOpenPaymentModal: () => void;
  onOpenLoanModal: () => void;
  onOpenVotingTab: () => void;
  onOpenQRISModal: () => void;
  onTriggerAudit: () => void;
}

export const MainBalanceCard: React.FC<MainBalanceCardProps> = ({
  totalKasKomunal,
  availableBalance,
  borrowedAmount,
  totalPendingFines,
  config,
  activeCycleName,
  onOpenPaymentModal,
  onOpenLoanModal,
  onOpenVotingTab,
  onOpenQRISModal,
  onTriggerAudit,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto -mt-3 px-4 sm:px-6">
      {/* DANA Signature Blue Card */}
      <div className="bg-[#118EEA] rounded-2xl p-5 sm:p-6 text-white border border-[#0B63C5] space-y-5">
        {/* Top bar inside card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-blue-100 uppercase">KAS TONGKRONGAN</span>
              <p className="text-[11px] text-blue-200">{activeCycleName}</p>
            </div>
          </div>

          <button
            id="quick-qris-btn"
            onClick={onOpenQRISModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#118EEA] rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-none"
          >
            <QrCode className="w-4 h-4" />
            <span>QRIS Kas</span>
          </button>
        </div>

        {/* Main Balance Display */}
        <div>
          <span className="text-xs text-blue-100 font-medium">Total Saldo Kas Komunal</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
              Rp {totalKasKomunal.toLocaleString('id-ID')}
            </h1>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Target Mingguan: <strong>Rp{config.weekly_target.toLocaleString('id-ID')}</strong> / orang • Periode 7 Hari
          </p>
        </div>

        {/* Financial Breakdown Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-[#0B63C5] rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200">Saldo Tersedia (Pocket)</span>
              <p className="text-sm font-bold text-white">Rp {availableBalance.toLocaleString('id-ID')}</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
          </div>

          <div className="p-3 bg-[#0B63C5] rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200">Sedang Dipinjam Anggota</span>
              <p className="text-sm font-bold text-amber-300">Rp {borrowedAmount.toLocaleString('id-ID')}</p>
            </div>
            <Clock className="w-4 h-4 text-amber-300" />
          </div>

          <div className="p-3 bg-[#0B63C5] rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200">Denda Tertunggak</span>
              <p className="text-sm font-bold text-rose-300">Rp {totalPendingFines.toLocaleString('id-ID')}</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-300" />
          </div>
        </div>

        {/* Quick Actions (4 Core Actions) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/15">
          <button
            id="quick-pay-dues-btn"
            onClick={onOpenPaymentModal}
            className="p-3 bg-white text-[#118EEA] hover:bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors group font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-[#E7F3FE] flex items-center justify-center text-[#118EEA]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs">Bayar Kas</span>
          </button>

          <button
            id="quick-borrow-loan-btn"
            onClick={onOpenLoanModal}
            className="p-3 bg-white text-[#118EEA] hover:bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors group font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-[#E7F3FE] flex items-center justify-center text-[#118EEA]">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-xs">Pinjam Kas</span>
          </button>

          <button
            id="quick-vote-btn"
            onClick={onOpenVotingTab}
            className="p-3 bg-white text-[#118EEA] hover:bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors group font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-[#E7F3FE] flex items-center justify-center text-[#118EEA]">
              <Vote className="w-4 h-4" />
            </div>
            <span className="text-xs">Voting Bendahara</span>
          </button>

          <button
            id="quick-audit-fine-btn"
            onClick={onTriggerAudit}
            className="p-3 bg-white text-[#118EEA] hover:bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors group font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-[#E7F3FE] flex items-center justify-center text-[#118EEA]">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs">Audit & Denda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
