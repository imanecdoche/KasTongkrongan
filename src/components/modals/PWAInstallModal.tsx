import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Wifi,
  WifiOff,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { triggerPWAInstall, isStandalone, isIOSDevice } from '../../lib/pwa';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PWAInstallModal({ isOpen, onClose, onSuccess }: PWAInstallModalProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setStandalone(isStandalone());
    setIsIOS(isIOSDevice());
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const result = await triggerPWAInstall();
    setIsInstalling(false);
    if (result === 'accepted') {
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#118EEA] to-[#0A6CBD] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md flex-shrink-0 flex items-center justify-center">
              <img src="/icon-192.png" alt="KasTongkrongan Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold tracking-wide text-white mb-1">
                <Sparkles size={11} className="text-yellow-300" />
                Progressive Web App (PWA)
              </div>
              <h2 className="text-lg font-bold leading-tight">Install KasTongkrongan</h2>
              <p className="text-xs text-blue-100 mt-0.5">Jalankan mandiri di layar utama HP / Desktop</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[#2B2F38]">
          {/* Status Alert if already installed */}
          {standalone ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Aplikasi Sudah Terpasang Mandiri!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Anda saat ini sedang membuka KasTongkrongan dalam mode Standalone PWA. Data tersimpan di perangkat lokal.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-[#118EEA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <Wifi size={14} /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <WifiOff size={14} /> Mode Offline
                  </span>
                )}
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">Cache Shell Aktif</span>
              </div>
              <span className="text-[11px] font-medium bg-blue-100/70 px-2 py-0.5 rounded-md">Bebas Kuota</span>
            </div>
          )}

          {/* Keuntungan Memasang PWA */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Keunggulan Mode Mandiri (PWA)</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#118EEA] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone size={14} />
                </div>
                <div>
                  <span className="font-bold text-gray-800">Layar Penuh Tanpa URL Bar</span>
                  <p className="text-gray-500 text-[11px] leading-snug">
                    Tampilan bersih layaknya aplikasi Android/iOS asli dari Play Store / App Store.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <span className="font-bold text-gray-800">Bisa Diakses Tanpa Sinyal (Offline)</span>
                  <p className="text-gray-500 text-[11px] leading-snug">
                    Buku kas tetap dapat dibuka dan dicatat saat nongkrong di tempat minim sinyal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Download size={14} />
                </div>
                <div>
                  <span className="font-bold text-gray-800">Ringan & Langsung Pakai</span>
                  <p className="text-gray-500 text-[11px] leading-snug">
                    Ukuran kurang dari 1 MB, tidak menghabiskan memori penyimpanan HP.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* iOS / Safari Step-by-step Guide */}
          {isIOS && !standalone && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Share2 size={14} className="text-amber-700" />
                Cara Pasang di iPhone / iPad (Safari):
              </h4>
              <ol className="text-xs text-amber-950 space-y-2 pl-4 list-decimal">
                <li>
                  Ketuk tombol <strong className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-amber-200 text-blue-600"><Share2 size={11} /> Bagikan (Share)</strong> di bilah bawah browser Safari.
                </li>
                <li>
                  Geser ke bawah lalu pilih menu <strong className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-amber-200"><PlusSquare size={11} /> Tambahkan ke Layar Utama</strong> (Add to Home Screen).
                </li>
                <li>
                  Ketuk tombol <strong className="text-blue-600">Tambah (Add)</strong> di pojok kanan atas.
                </li>
              </ol>
            </div>
          )}

          {/* Android / Chrome Step Guide */}
          {!isIOS && !standalone && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
              <p>
                Klik tombol di bawah atau pilih menu titik tiga browser <strong className="text-gray-800">⋮ &gt; Pasang Aplikasi / Tambahkan ke Layar Utama</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            Tutup
          </button>
          
          {!standalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#118EEA] hover:bg-[#0E77C7] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Download size={15} />
              {isInstalling ? 'Memproses...' : 'Pasang Aplikasi Sekarang'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
