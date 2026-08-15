import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { AppState, calculateMemberStats, formatRupiah } from '../../lib/storage';
import {
  AlertTriangle,
  Trash2,
  X,
  Clock,
  ShieldAlert,
  CheckCircle2,
  UserX,
} from 'lucide-react';

interface DeleteMemberConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  state?: AppState;
  onConfirmDelete: (userId: string) => void;
}

export const DeleteMemberConfirmModal: React.FC<DeleteMemberConfirmModalProps> = ({
  isOpen,
  onClose,
  user,
  state,
  onConfirmDelete,
}) => {
  const [countdown, setCountdown] = useState(3);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset countdown to 3 every time modal is opened for a user
  useEffect(() => {
    if (isOpen && user) {
      setCountdown(3);
      setIsDeleting(false);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const stats = state ? calculateMemberStats(user, state) : null;
  const hasDebt = (stats?.sisaHutang || 0) > 0;
  const hasFine = (stats?.dendaTertunda || 0) > 0;

  const handleConfirm = () => {
    if (countdown > 0 || isDeleting) return;
    setIsDeleting(true);
    onConfirmDelete(user.id);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading">Konfirmasi Hapus Anggota</h2>
              <p className="text-xs text-rose-100">Tindakan ini memerlukan verifikasi pengaman</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Member Card Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl ${
                user.avatar_color || 'bg-rose-600'
              } text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs`}
            >
              {user.avatar_initial || user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate font-heading">{user.name}</h3>
              <p className="text-xs text-slate-500 truncate">
                {user.phone_number || 'Tidak ada nomor'} • Role: <span className="uppercase font-semibold">{user.role}</span>
              </p>
              {user.instagram && <p className="text-[11px] text-pink-600 font-medium">{user.instagram}</p>}
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-start gap-2.5">
              <UserX className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                Apakah Anda yakin ingin menghapus anggota <strong className="text-rose-950 font-bold">{user.name}</strong> dari daftar anggota kas tongkrongan?
              </div>
            </div>

            {hasDebt && (
              <div className="mt-2 pt-2 border-t border-rose-200/80 flex items-center justify-between text-xs text-rose-700 bg-rose-100/60 p-2 rounded-lg font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Sisa Hutang Belum Lunas:</span>
                </span>
                <strong className="text-rose-900 font-bold">Rp {formatRupiah(stats?.sisaHutang || 0)}</strong>
              </div>
            )}

            {hasFine && (
              <div className="mt-1 flex items-center justify-between text-xs text-amber-800 bg-amber-100/60 p-2 rounded-lg font-medium">
                <span>Denda Belum Dibayar:</span>
                <strong className="text-amber-950 font-bold">Rp {formatRupiah(stats?.dendaTertunda || 0)}</strong>
              </div>
            )}
          </div>

          {/* Safety countdown explanation */}
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-800 text-xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {countdown > 0 ? (
                <>
                  Tombol hapus terkunci selama <strong className="font-bold text-amber-900">{countdown} detik</strong> untuk mencegah ketidaksengajaan.
                </>
              ) : (
                <>
                  Tombol hapus sekarang <strong className="font-bold text-emerald-800">aktif</strong>. Silakan konfirmasi jika ingin melanjutkan.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={countdown > 0 || isDeleting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              countdown > 0 || isDeleting
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 cursor-pointer animate-in fade-in'
            }`}
          >
            {countdown > 0 ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-slate-400" />
                <span>Hapus Anggota ({countdown}s)</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Anggota Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
