import React from 'react';
import { X, Check, Zap, Layers, Sparkles } from 'lucide-react';
import { TechUpgrade } from '../game/types';
import { sound } from '../game/audio';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  techs: TechUpgrade[];
  funds: number;
  onUnlockTech: (techId: string) => void;
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  isOpen,
  onClose,
  techs,
  funds,
  onUnlockTech,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Clean Tech & Policy Research
              </h2>
              <p className="text-xs text-slate-400">
                Unlock next-generation generation, storage, and grid-balancing innovations.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tech List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {techs.map((tech) => {
            const canAfford = funds >= tech.cost;

            return (
              <div
                key={tech.id}
                className={`p-4 rounded-xl border transition-all ${
                  tech.unlocked
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {tech.name}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                        · {tech.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tech.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{tech.effectDescription}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {tech.unlocked ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold">
                        <Check className="w-4 h-4" />
                        <span>Implemented</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playUpgrade();
                          onUnlockTech(tech.id);
                        }}
                        disabled={!canAfford}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          canAfford
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Research ₱{tech.cost.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Available Treasury: <strong className="text-white font-mono">₱{funds.toLocaleString()}</strong></span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
