import React, { useRef } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  Play,
  Upload,
  AlertTriangle,
  Sparkles,
  Focus,
} from 'lucide-react';
import type { CameraState } from '../hooks/useCamera';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraState: CameraState;
  isProcessing: boolean;
  autoDetect: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleFacing: () => void;
  onToggleAutoDetect: () => void;
  onManualCapture: () => void;
  onFileUpload: (file: File) => void;
  onLoadSyntheticSample: (type: 'car' | 'mototaxi' | 'truck') => void;
  latencyMs?: number;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  cameraState,
  isProcessing,
  autoDetect,
  onStartCamera,
  onStopCamera,
  onToggleFacing,
  onToggleAutoDetect,
  onManualCapture,
  onFileUpload,
  onLoadSyntheticSample,
  latencyMs,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Viewport Top Bar */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            {cameraState.isStreaming && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                cameraState.isStreaming ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            ></span>
          </span>
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            {cameraState.isStreaming ? 'TRANSMISIÓN EN VIVO' : 'CÁMARA APAGADA'}
          </span>
          {cameraState.isStreaming && (
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              {cameraState.facingMode === 'environment' ? 'LENTE TRASERO' : 'FRONTAL'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {latencyMs !== undefined && (
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <span className="text-slate-500">IA:</span>
              <span className="text-amber-400 font-bold">{latencyMs} ms</span>
            </div>
          )}
          {autoDetect && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 animate-spin" />
              Auto-Scan
            </span>
          )}
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraState.isStreaming ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />

        {/* HUD Visual Reticles Overlay when Streaming */}
        {cameraState.isStreaming && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            {/* Top HUD Markers */}
            <div className="flex justify-between items-start text-[10px] font-mono text-cyan-400/70 select-none">
              <div className="border-t-2 border-l-2 border-cyan-400/60 w-8 h-8 flex items-start justify-start p-1">
                L-01
              </div>
              <div className="flex flex-col items-center">
                <Focus className="w-5 h-5 text-cyan-400/40 animate-pulse" />
                <span className="text-[9px] tracking-widest text-cyan-300/80 mt-1">ZONA DE DETECCIÓN</span>
              </div>
              <div className="border-t-2 border-r-2 border-cyan-400/60 w-8 h-8 flex items-start justify-end p-1">
                YOLOv8
              </div>
            </div>

            {/* Central Lane Guidance Reticle */}
            <div className="self-center w-48 sm:w-64 h-36 sm:h-44 border border-dashed border-amber-400/40 rounded-xl flex items-center justify-center">
              <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-wider px-2 py-1 bg-black/40 rounded backdrop-blur-sm">
                Enfoque al vehículo
              </span>
            </div>

            {/* Bottom HUD Markers */}
            <div className="flex justify-between items-end text-[10px] font-mono text-cyan-400/70 select-none">
              <div className="border-b-2 border-l-2 border-cyan-400/60 w-8 h-8"></div>
              <div className="text-[9px] text-slate-400">PIURA PASS ITS • CV-CORE</div>
              <div className="border-b-2 border-r-2 border-cyan-400/60 w-8 h-8"></div>
            </div>
          </div>
        )}

        {/* Placeholder when Camera is stopped */}
        {!cameraState.isStreaming && (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-400">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1">Cámara de Carril Desactivada</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Activa la cámara del dispositivo para iniciar el reconocimiento automático de vehículos en el carril.
            </p>
            <button
              onClick={onStartCamera}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Activar Cámara Trasera
            </button>
          </div>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3"></div>
            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">
              Inferencia YOLOv8 en progreso...
            </span>
          </div>
        )}

        {/* Camera Permission / Error Banner */}
        {cameraState.error && (
          <div className="absolute bottom-4 left-4 right-4 bg-rose-950/90 border border-rose-600/50 rounded-xl p-3 text-rose-200 text-xs flex items-start gap-2.5 backdrop-blur z-30">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Acceso a cámara requerido</p>
              <p className="text-[11px] text-rose-300 leading-normal">{cameraState.error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Operator Controls Toolstrip */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {cameraState.isStreaming ? (
            <button
              onClick={onStopCamera}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              <CameraOff className="w-4 h-4 text-rose-400" />
              Detener Cámara
            </button>
          ) : (
            <button
              onClick={onStartCamera}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow shadow-amber-500/20 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Iniciar Cámara
            </button>
          )}

          {/* Toggle Facing */}
          <button
            onClick={onToggleFacing}
            disabled={!cameraState.isStreaming}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            title="Alternar entre cámara trasera y delantera"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            Cambiar Lente
          </button>

          {/* Auto Detect Toggle */}
          <button
            onClick={onToggleAutoDetect}
            disabled={!cameraState.isStreaming}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
              autoDetect
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border-slate-700 text-slate-300'
            }`}
          >
            <Zap className={`w-4 h-4 ${autoDetect ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            Auto-Scan {autoDetect ? 'ON' : 'OFF'}
          </button>

          {/* Manual Snapshot */}
          <button
            onClick={onManualCapture}
            disabled={!cameraState.isStreaming || isProcessing}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Focus className="w-4 h-4" />
            Capturar Ahora
          </button>
        </div>

        {/* Secondary / Fallback Options (Upload & Sample Presets) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>Muestras de prueba:</span>
            <button
              onClick={() => onLoadSyntheticSample('car')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer font-medium"
            >
              Auto
            </button>
            <button
              onClick={() => onLoadSyntheticSample('mototaxi')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer font-medium"
            >
              Mototaxi
            </button>
            <button
              onClick={() => onLoadSyntheticSample('truck')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer font-medium"
            >
              Camión
            </button>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer font-medium text-[11px]"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Subir Foto desde Galería
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
