import React from 'react';
import { History, RefreshCw } from 'lucide-react';
import type { DetectionHistoryItem } from '../types/detection';

interface DetectionHistoryProps {
  history: DetectionHistoryItem[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const DetectionHistory: React.FC<DetectionHistoryProps> = ({
  history,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Historial de Tránsito en Carril
          </h3>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
            {history.length} eventos
          </span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          title="Actualizar historial"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Table / List */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No hay registros de vehículos procesados en la sesión actual.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 text-[11px] font-mono">
                <th className="py-2.5 px-3">EVENT ID</th>
                <th className="py-2.5 px-3">CATEGORÍA</th>
                <th className="py-2.5 px-3">CONFIANZA</th>
                <th className="py-2.5 px-3 text-right">TARIFA</th>
                <th className="py-2.5 px-3 text-center">ESTADO</th>
                <th className="py-2.5 px-3 text-right">HORA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {history.map((item) => {
                const date = new Date(item.timestamp);
                const timeStr = isNaN(date.getTime())
                  ? item.timestamp
                  : date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={item.event_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400 font-medium">
                      {item.event_id.replace('EVT-PIURA-', '')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-1.5">
                      {item.category}
                      {item.operator_override && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                          title="Corregido por operador"
                        />
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {Math.round(item.confidence * 100)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100 text-right">
                      S/ {item.tariff.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          item.status === 'CONFIRMED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : item.status === 'REQUIRES_REVIEW'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 text-right">
                      {timeStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
