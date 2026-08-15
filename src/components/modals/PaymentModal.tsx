import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Upload, Banknote, CreditCard, ShieldCheck } from 'lucide-react';
import { User, SystemConfig, PaymentMethod } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  config: SystemConfig;
  targetAmount: number;
  onSuccess: (paymentData: {
    amount: number;
    method: PaymentMethod;
    notes: string;
    proofUrl?: string;
  }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  config,
  targetAmount,
  onSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('qris');
  const [amount, setAmount] = useState<number>(targetAmount || 20000);
  const [notes, setNotes] = useState<string>('Iuran Kas Mingguan');
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedEwallet, setCopiedEwallet] = useState(false);
  const [proofUploaded, setProofUploaded] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'bank' | 'ewallet') => {
    navigator.clipboard.writeText(text);
    if (type === 'bank') {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedEwallet(true);
      setTimeout(() => setCopiedEwallet(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setProofUploaded(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Silakan tambahkan atau pilih profil anggota terlebih dahulu di tab Anggota.');
      return;
    }
    if (amount <= 0) return;

    onSuccess({
      amount: Number(amount),
      method,
      notes,
      proofUrl: proofUploaded ? `uploaded_proof_${Date.now()}.png` : undefined,
    });
    onClose();
  };

  return (
    <div id="payment-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        id="payment-modal-container"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">Setor Iuran Kas</h3>
            <p className="text-xs text-[#727986]">Konfirmasi pembayaran kas mingguan</p>
          </div>
          <button
            id="close-payment-modal-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Member Info */}
          <div className="p-3 bg-[#F5F6F8] rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#727986]">Pembayar:</span>
              <p className="text-sm font-semibold text-[#2B2F38]">{currentUser ? currentUser.name : 'Belum Memilih Profil'}</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-[#E7F3FE] text-[#118EEA] rounded-full border border-[#118EEA]/20">
              {currentUser ? currentUser.role.toUpperCase() : 'TAMU'}
            </span>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nominal Pembayaran (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
              <input
                id="payment-amount-input"
                type="number"
                min="5000"
                step="5000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[15000, 20000, 40000, 50000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    amount === preset
                      ? 'bg-[#118EEA] text-white border-[#118EEA]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Rp{preset.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1.5">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('qris')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === 'qris'
                    ? 'border-[#118EEA] bg-[#E7F3FE] text-[#118EEA] font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs">QRIS DANA</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === 'transfer'
                    ? 'border-[#118EEA] bg-[#E7F3FE] text-[#118EEA] font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('tunai')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === 'tunai'
                    ? 'border-[#118EEA] bg-[#E7F3FE] text-[#118EEA] font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Setor Tunai</span>
              </button>
            </div>
          </div>

          {/* Method-Specific Instructions */}
          {method === 'qris' && (
            <div className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B2F38]">QRIS Kas Tongkrongan</span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Semua E-Wallet & Bank
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                {/* Clean CSS-based stylized QR code box */}
                <div className="w-36 h-36 border-2 border-slate-800 p-2 relative flex flex-col justify-between bg-white">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                    <div className="w-8 h-8 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <span className="text-[10px] font-bold tracking-widest text-[#118EEA] border border-[#118EEA] px-1 bg-white">
                      KAS TONGKRONGAN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                    <div className="w-4 h-4 bg-slate-900" />
                  </div>
                </div>
                <p className="text-[11px] text-[#727986] mt-2 text-center">NMID: ID102026889901 • Kas Resmi</p>
              </div>
            </div>
          )}

          {method === 'transfer' && (
            <div className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[#727986]">Rekening Resmi Bendahara:</p>
                  <p className="text-xs font-bold text-[#2B2F38]">{config.treasurer_bank_name}</p>
                  <p className="text-sm font-mono font-bold text-[#118EEA] mt-0.5">{config.treasurer_account_number}</p>
                  <p className="text-xs text-[#2B2F38]">a.n {config.treasurer_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(config.treasurer_account_number, 'bank')}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-[#2B2F38] hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBank ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[#727986]">E-Wallet Kas:</p>
                  <p className="text-xs font-bold text-[#2B2F38]">{config.treasurer_ewallet}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(config.treasurer_phone, 'ewallet')}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-[#2B2F38] hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedEwallet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEwallet ? 'Tersalin' : 'Salin No'}</span>
                </button>
              </div>
            </div>
          )}

          {method === 'tunai' && (
            <div className="p-4 bg-[#E7F3FE] rounded-xl border border-[#118EEA]/20 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#118EEA] mt-0.5 shrink-0" />
                <p className="text-xs text-[#2B2F38] leading-relaxed">
                  Serahkan uang tunai langsung ke <strong>{config.treasurer_name} (Bendahara)</strong>. Bendahara akan memverifikasi dan mengonversi dana ke saldo digital tongkrongan.
                </p>
              </div>
            </div>
          )}

          {/* Upload Proof */}
          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Bukti Pembayaran / Resi</label>
            <label className="border-2 border-dashed border-slate-300 hover:border-[#118EEA] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-white transition-colors">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                {fileName ? fileName : 'Upload tangkapan layar / bukti transfer'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau screenshot transaksi</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Catatan Setoran</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
              placeholder="Contoh: Iuran Minggu ke-3 + Lunas"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="confirm-payment-submit-btn"
              className="flex-1 py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
            >
              Kirim Konfirmasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
