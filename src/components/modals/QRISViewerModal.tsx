import React from 'react';
import { X, QrCode, Download, Share2, ShieldCheck } from 'lucide-react';

interface QRISViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasurerName: string;
}

export const QRISViewerModal: React.FC<QRISViewerModalProps> = ({ isOpen, onClose, treasurerName }) => {
  if (!isOpen) return null;

  return (
    <div id="qris-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        id="qris-modal-container"
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-[#118EEA] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wide font-heading">QRIS KAS RESMI</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">KAS TONGKRONGAN BERSAMA</h3>
            <p className="text-xs text-[#727986] mt-0.5">NMID: ID102026889901 • Kas Resmi</p>
            <p className="text-xs font-semibold text-[#118EEA] mt-0.5">a.n Bendahara: {treasurerName}</p>
          </div>

          {/* Stylized high contrast QR pattern */}
          <div className="bg-white p-4 border-2 border-slate-900 rounded-xl inline-block shadow-none">
            <div className="w-48 h-48 border-2 border-slate-900 p-2 flex flex-col justify-between bg-white relative">
              <div className="flex justify-between">
                <div className="w-10 h-10 border-4 border-slate-950 bg-slate-950 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white" />
                </div>
                <div className="w-10 h-10 border-4 border-slate-950 bg-slate-950 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white" />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <div className="px-2 py-0.5 bg-[#118EEA] text-white text-[10px] font-black tracking-widest rounded">
                  QRIS NASIONAL
                </div>
                <div className="w-20 h-1 bg-slate-900 my-1" />
                <span className="text-[9px] font-bold text-slate-800">DANA • BCA • GOPAY • SHOPEEPAY</span>
              </div>

              <div className="flex justify-between">
                <div className="w-10 h-10 border-4 border-slate-950 bg-slate-950 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white" />
                </div>
                <div className="w-6 h-6 bg-slate-950" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Mendukung seluruh aplikasi Bank & Dompet Digital</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
