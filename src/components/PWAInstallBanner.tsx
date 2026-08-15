import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { subscribeInstallPrompt, triggerPWAInstall, isStandalone, isIOSDevice } from '../lib/pwa';

interface PWAInstallBannerProps {
  onOpenModal: () => void;
  onInstalled?: () => void;
}

export function PWAInstallBanner({ onOpenModal, onInstalled }: PWAInstallBannerProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    setDismissed(isDismissed);
    setStandalone(isStandalone());

    const unsubscribe = subscribeInstallPrompt((available) => {
      setCanInstall(available);
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleQuickInstall = async () => {
    if (canInstall) {
      const outcome = await triggerPWAInstall();
      if (outcome === 'accepted') {
        onInstalled?.();
      }
    } else {
      onOpenModal();
    }
  };

  // If already running standalone or dismissed, hide
  if (standalone || dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#0E77C7] via-[#118EEA] to-[#1677FF] text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs transition-all animate-fadeIn">
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <Smartphone size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold truncate">
            <span>Install KasTongkrongan</span>
            <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded font-medium">PWA</span>
          </div>
          <p className="text-[11px] text-blue-100/90 truncate hidden sm:block">
            Jalankan mandiri di layar utama tanpa browser bar & hemat kuota
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleQuickInstall}
          className="flex items-center gap-1.5 bg-white text-[#0E77C7] hover:bg-blue-50 font-bold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all text-xs cursor-pointer"
        >
          <Download size={13} />
          <span>{canInstall ? 'Install' : isIOS ? 'Petunjuk' : 'Pasang'}</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          title="Tutup banner"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
