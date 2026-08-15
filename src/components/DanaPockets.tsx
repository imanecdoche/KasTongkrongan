import React from 'react';
import { Pocket } from '../types';
import { Layers, Plus, ArrowRightLeft, ShieldCheck, Compass, Utensils, Sparkles } from 'lucide-react';

interface DanaPocketsProps {
  pockets: Pocket[];
  onOpenManagePockets: () => void;
}

export const DanaPockets: React.FC<DanaPocketsProps> = ({ pockets, onOpenManagePockets }) => {
  const getPocketIcon = (name: string, tag: string) => {
    if (tag.includes('Darurat') || name.includes('Darurat')) {
      return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    }
    if (tag.includes('Liburan') || name.includes('Pantai')) {
      return <Compass className="w-4 h-4 text-[#118EEA]" />;
    }
    return <Utensils className="w-4 h-4 text-amber-600" />;
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E7F3FE] flex items-center justify-center text-[#118EEA]">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-[#2B2F38] uppercase tracking-wide font-heading">
            POCKET TONGKRONGAN
          </h2>
        </div>

        <button
          id="manage-pockets-btn"
          onClick={onOpenManagePockets}
          className="text-xs text-[#118EEA] font-bold hover:underline flex items-center gap-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Kelola / Geser Saldo</span>
        </button>
      </div>

      {/* Pockets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {pockets.map((pocket) => {
          const progressPercent = Math.min(100, Math.round((pocket.current_balance / pocket.target_amount) * 100));

          return (
            <div
              key={pocket.id}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F5F6F8] text-[#727986] border border-slate-200">
                    {pocket.tag}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#F5F6F8] flex items-center justify-center">
                    {getPocketIcon(pocket.name, pocket.tag)}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#2B2F38] font-heading">{pocket.name}</h3>
                <p className="text-[11px] text-[#727986] mt-0.5 line-clamp-2">{pocket.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-[#2B2F38]">
                    Rp {pocket.current_balance.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-[#727986]">
                    Target: Rp {pocket.target_amount.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#118EEA]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#727986]">
                  <span>Capaian Target</span>
                  <span className="font-bold text-[#118EEA]">{progressPercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
