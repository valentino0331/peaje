import React from 'react';
import { X, Activity, Layers } from 'lucide-react';
import type { SystemStats } from '../types/detection';

interface StatsModalProps {
  stats: SystemStats | null;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => {
  if (!stats) return null;

  const total = stats.total_vehicles_detected || 1;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Métricas del Motor de Visión Artificial
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5">
          {/* Top Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Frames</span>
              <div className="text-xl font-black text-slate-100 font-mono mt-1">
                {stats.total_frames_processed}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Detectados</span>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                {stats.total_vehicles_detected}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Duplicados</span>
              <div className="text-xl font-black text-cyan-400 font-mono mt-1">
                {stats.duplicates_filtered}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Correcciones</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {stats.operator_overrides}
              </div>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Distribución por Categoría Vehicular
            </h4>

            <div className="flex flex-col gap-2">
              {Object.entries(stats.category_distribution || {}).map(([category, count]) => {
                const percentage = Math.round((count / total) * 100) || 0;
                return (
                  <div key={category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{category}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
