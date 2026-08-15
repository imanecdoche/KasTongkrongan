import React, { useState } from 'react';
import { RABPlan, RABStatus, PaymentMethod, Transaction } from '../../types';
import { RABEditor } from './RABEditor';
import { RABDocumentView } from './RABDocumentView';
import { RABExecutionModal } from './RABExecutionModal';
import { RABRefundModal } from './RABRefundModal';
import {
  AppState,
  calculateRABSummary,
  calculateFinancialSummary,
  formatAmountK,
  formatRupiah,
} from '../../lib/storage';
import {
  Plus,
  FileText,
  Zap,
  RotateCcw,
  Edit3,
  Trash2,
  Calendar,
  MapPin,
  UserCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface RABModuleProps {
  state: AppState;
  onUpdateState: (nextState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const RABModule: React.FC<RABModuleProps> = ({
  state,
  onUpdateState,
  onShowToast,
}) => {
  const rabs = state.rabs || [];
  const financial = calculateFinancialSummary(state);
  const availableCash = financial.saldoKasSaatIni; // Available cash in main pool

  // Modes: 'list' | 'create' | 'edit' | 'view_doc'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view_doc'>('list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [executionModalPlan, setExecutionModalPlan] = useState<RABPlan | null>(null);
  const [refundModalPlan, setRefundModalPlan] = useState<RABPlan | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<RABPlan | null>(null);

  const selectedPlan = rabs.find((r) => r.id === selectedPlanId);

  // Filtered plans
  const filteredPlans = rabs.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  // Calculate totals
  const totalRABBudget = rabs.reduce((acc, r) => acc + (r.total_budget || 0), 0);
  const totalRABAllocated = rabs.reduce((acc, r) => acc + (r.allocated_amount || 0), 0);

  // 1. Save / Update Plan
  const handleSavePlan = (plan: RABPlan) => {
    const exists = rabs.some((r) => r.id === plan.id);
    let nextRabs: RABPlan[];

    if (exists) {
      nextRabs = rabs.map((r) => (r.id === plan.id ? plan : r));
      onShowToast(`✅ Rencana RAB "${plan.name}" berhasil diperbarui.`);
    } else {
      nextRabs = [plan, ...rabs];
      onShowToast(`🎉 Rencana RAB "${plan.name}" berhasil dibuat!`);
    }

    onUpdateState({
      ...state,
      rabs: nextRabs,
      updated_at: new Date().toISOString(),
    });

    setSelectedPlanId(plan.id);
    setViewMode('view_doc');
  };

  // 2. Delete Plan
  const handleDeletePlan = (planId: string) => {
    const plan = rabs.find((r) => r.id === planId);
    if (!plan) return;

    if ((plan.allocated_amount || 0) > 0) {
      onShowToast(`⚠️ Tidak dapat menghapus RAB "${plan.name}" karena masih ada dana kas Rp ${formatRupiah(plan.allocated_amount)} yang teralokasi. Kembalikan dana terlebih dahulu.`);
      return;
    }

    const nextRabs = rabs.filter((r) => r.id !== planId);
    onUpdateState({
      ...state,
      rabs: nextRabs,
      updated_at: new Date().toISOString(),
    });

    setDeleteConfirmPlan(null);
    if (selectedPlanId === planId) {
      setSelectedPlanId(null);
      setViewMode('list');
    }
    onShowToast(`🗑️ Rencana RAB "${plan.name}" telah dihapus.`);
  };

  // 3. Execute Cash Allocation (Moves cash from Main Pool to RAB Plan, records in Jurnal & Report)
  const handleExecuteAllocation = (
    plan: RABPlan,
    data: { amount: number; method: PaymentMethod; notes: string }
  ) => {
    const currentAlloc = plan.allocated_amount || 0;
    const newAlloc = currentAlloc + data.amount;

    // Create official Kas Keluar Transaction
    const newTx: Transaction = {
      id: 'tx_rab_out_' + Date.now(),
      member_id: plan.pic_member_id || 'system_rab',
      member_name: plan.pic_name || 'PJ ' + plan.name,
      direction: 'keluar',
      category: 'alokasi_rab',
      amount: data.amount,
      method: data.method,
      notes: data.notes || `Alokasi Kas ke RAB: ${plan.name}`,
      created_at: new Date().toISOString(),
    };

    // Update RAB status if not already dialokasikan
    const nextStatus: RABStatus = plan.status === 'draft' ? 'dialokasikan' : plan.status;

    const updatedPlan: RABPlan = {
      ...plan,
      allocated_amount: newAlloc,
      status: nextStatus,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextRabs = rabs.map((r) => (r.id === plan.id ? updatedPlan : r));

    onUpdateState({
      ...state,
      transactions: [newTx, ...state.transactions],
      rabs: nextRabs,
      updated_at: new Date().toISOString(),
    });

    setExecutionModalPlan(null);
    onShowToast(
      `⚡ Berhasil mengalokasikan Rp ${formatRupiah(data.amount)} ke RAB "${plan.name}". Mutasi kas keluar tercatat di jurnal!`
    );
  };

  // 4. Refund Cash Allocation (Returns cash from RAB Plan back to Main Pool, records in Jurnal & Report)
  const handleRefundAllocation = (
    plan: RABPlan,
    data: { amount: number; method: PaymentMethod; notes: string }
  ) => {
    const currentAlloc = plan.allocated_amount || 0;
    const newAlloc = Math.max(0, currentAlloc - data.amount);

    // Create official Kas Masuk Transaction
    const newTx: Transaction = {
      id: 'tx_rab_in_' + Date.now(),
      member_id: plan.pic_member_id || 'system_rab',
      member_name: plan.pic_name || 'PJ ' + plan.name,
      direction: 'masuk',
      category: 'pengembalian_rab',
      amount: data.amount,
      method: data.method,
      notes: data.notes || `Pengembalian Kas dari RAB: ${plan.name}`,
      created_at: new Date().toISOString(),
    };

    const updatedPlan: RABPlan = {
      ...plan,
      allocated_amount: newAlloc,
      status: newAlloc === 0 ? 'draft' : plan.status,
      updated_at: new Date().toISOString(),
    };

    const nextRabs = rabs.map((r) => (r.id === plan.id ? updatedPlan : r));

    onUpdateState({
      ...state,
      transactions: [newTx, ...state.transactions],
      rabs: nextRabs,
      updated_at: new Date().toISOString(),
    });

    setRefundModalPlan(null);
    onShowToast(
      `🔄 Berhasil mengembalikan Rp ${formatRupiah(data.amount)} ke Kas Utama. Mutasi kas masuk tercatat di jurnal!`
    );
  };

  // Render Create / Edit Mode
  if (viewMode === 'create') {
    return (
      <RABEditor
        members={state.users}
        onSave={handleSavePlan}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'edit' && selectedPlan) {
    return (
      <RABEditor
        initialPlan={selectedPlan}
        members={state.users}
        onSave={handleSavePlan}
        onCancel={() => setViewMode('view_doc')}
      />
    );
  }

  // Render View Document Mode
  if (viewMode === 'view_doc' && selectedPlan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-1.5"
          >
            ← Kembali ke Daftar RAB
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit RAB</span>
            </button>
          </div>
        </div>

        <RABDocumentView
          rab={selectedPlan}
          treasurerName={state.config.treasurer_name}
          availableCashBalance={availableCash}
          onShowToast={onShowToast}
          onOpenExecuteModal={() => setExecutionModalPlan(selectedPlan)}
          onOpenRefundModal={() => setRefundModalPlan(selectedPlan)}
        />

        {/* Modal Eksekusi */}
        {executionModalPlan && (
          <RABExecutionModal
            isOpen={true}
            onClose={() => setExecutionModalPlan(null)}
            rab={executionModalPlan}
            availableCashBalance={availableCash}
            onExecute={(data) => handleExecuteAllocation(executionModalPlan, data)}
          />
        )}

        {/* Modal Pengembalian */}
        {refundModalPlan && (
          <RABRefundModal
            isOpen={true}
            onClose={() => setRefundModalPlan(null)}
            rab={refundModalPlan}
            onRefund={(data) => handleRefundAllocation(refundModalPlan, data)}
          />
        )}
      </div>
    );
  }

  // Default: List Mode
  return (
    <div className="space-y-4 font-mono">
      {/* 1. Header and Quick Metrics */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Rancangan Anggaran Biaya (RAB)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Perencanaan anggaran kegiatan tongkrongan (camping, bakar-bakar, dll) & alokasi kas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat RAB Rencana</span>
          </button>
        </div>

        {/* Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">TOTAL RENCANA:</span>
            <span className="text-base font-bold text-slate-900">{rabs.length} Rencana</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">SALDO KAS UTAMA:</span>
            <span className={`text-base font-bold ${availableCash > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
              {formatAmountK(availableCash)}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">TOTAL ANGGARAN RAB:</span>
            <span className="text-base font-bold text-slate-900">{formatAmountK(totalRABBudget)}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">DANA KAS TERALOKASI:</span>
            <span className="text-base font-bold text-blue-600">{formatAmountK(totalRABAllocated)}</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'draft', label: 'Draft' },
            { id: 'dialokasikan', label: 'Dialokasikan' },
            { id: 'selesai', label: 'Selesai' },
            { id: 'dibatalkan', label: 'Dibatalkan' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. List of RAB Plans */}
      {filteredPlans.length === 0 ? (
        <div className="p-8 bg-white border border-slate-300 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Belum Ada Rencana Anggaran Biaya (RAB)</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Rencanakan kegiatan camping, nobar, bakar-bakar, atau proyek tongkrongan dengan rincian biaya barang dan alokasi saldo kas otomatis.
          </p>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat RAB Rencana Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPlans.map((plan) => {
            const sum = calculateRABSummary(plan);
            return (
              <div
                key={plan.id}
                className="bg-white border border-slate-300 hover:border-slate-400 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs transition-all flex flex-col justify-between"
              >
                {/* Header Strip */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            plan.status === 'dialokasikan'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : plan.status === 'selesai'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : plan.status === 'dibatalkan'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {plan.status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {plan.items.length} item barang
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                        {plan.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setViewMode('edit');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Rencana"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmPlan(plan)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Rencana"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 text-[10px] block">PJ:</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {plan.pic_name || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Waktu:</span>
                      <span className="font-medium text-slate-700 truncate block">
                        {plan.event_date || '-'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block">Lokasi:</span>
                      <span className="font-medium text-slate-700 truncate block">
                        {plan.location || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Progress Strip */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Estimasi Total:</span>
                    <span className="font-bold text-slate-900">
                      {formatAmountK(sum.totalBudget)} ({formatRupiah(sum.totalBudget)})
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        sum.allocationPercentage >= 100
                          ? 'bg-emerald-500'
                          : sum.allocationPercentage > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${sum.allocationPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold">
                      Kas: {formatAmountK(sum.allocatedAmount)} ({sum.allocationPercentage}%)
                    </span>
                    <span className="text-amber-700 font-semibold">
                      Sisa: {formatAmountK(sum.remainingNeeded)}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setViewMode('view_doc');
                    }}
                    className="flex-1 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat & Ekspor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionModalPlan(plan)}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="Alokasikan Saldo Kas Utama ke RAB ini"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Eksekusi</span>
                  </button>

                  {(plan.allocated_amount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setRefundModalPlan(plan)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Kembalikan Dana ke Kas Utama"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white max-w-sm w-full p-5 rounded-2xl border border-slate-300 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Hapus Rencana RAB?</h4>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus rencana &quot;{deleteConfirmPlan.name}&quot;? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeletePlan(deleteConfirmPlan.id)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Modal */}
      {executionModalPlan && (
        <RABExecutionModal
          isOpen={true}
          onClose={() => setExecutionModalPlan(null)}
          rab={executionModalPlan}
          availableCashBalance={availableCash}
          onExecute={(data) => handleExecuteAllocation(executionModalPlan, data)}
        />
      )}

      {/* Refund Modal */}
      {refundModalPlan && (
        <RABRefundModal
          isOpen={true}
          onClose={() => setRefundModalPlan(null)}
          rab={refundModalPlan}
          onRefund={(data) => handleRefundAllocation(refundModalPlan, data)}
        />
      )}
    </div>
  );
};
