import React from 'react';
import { Wifi, WifiOff, Camera, BarChart3 } from 'lucide-react';

interface HeaderProps {
  isBackendHealthy: boolean;
  isWsConnected: boolean;
  isCameraActive: boolean;
  onOpenStats: () => void;
  stationName?: string;
  laneName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isBackendHealthy,
  isWsConnected,
  isCameraActive,
  onOpenStats,
  stationName = 'Estación Piura - Sullana',
  laneName = 'Carril 01 (Sentido Norte)',
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                PIURA<span className="text-amber-400">PASS</span>
              </h1>
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Fase 1 • CV
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {stationName} <span className="text-slate-600">•</span> {laneName}
            </p>
          </div>
        </div>

        {/* Telemetry & status pills */}
        <div className="flex items-center gap-2 text-xs">
          {/* Backend Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isBackendHealthy
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
            title={isBackendHealthy ? 'Servicio de Visión Activo' : 'Backend Desconectado'}
          >
            <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-semibold hidden sm:inline">IA:</span>
            <span>{isBackendHealthy ? 'YOLOv8 Online' : 'Offline'}</span>
          </div>

          {/* WebSocket Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isWsConnected
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {isWsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isWsConnected ? 'WS Sincronizado' : 'Reconectando'}</span>
          </div>

          {/* Camera Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isCameraActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCameraActive ? 'Cámara Activa' : 'En Espera'}</span>
          </div>

          {/* Stats Button */}
          <button
            onClick={onOpenStats}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors font-medium cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Métricas</span>
          </button>
        </div>
      </div>
    </header>
  );
};
