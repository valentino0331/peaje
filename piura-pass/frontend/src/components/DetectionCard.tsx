import React, { useState } from 'react';
import {
  Car,
  Bike,
  Truck,
  Bus as BusIcon,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ShieldAlert,
  Maximize2,
} from 'lucide-react';
import type {
  DetectionResponse,
  VehicleCategory,
  OperatorConfirmationRequest,
} from '../types/detection';

interface DetectionCardProps {
  detection: DetectionResponse | null;
  onConfirmCategory: (req: OperatorConfirmationRequest) => Promise<void>;
  isConfirming: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Motocicleta: <Bike className="w-5 h-5 text-amber-400" />,
  Mototaxi: <Bike className="w-5 h-5 text-cyan-400" />,
  Automóvil: <Car className="w-5 h-5 text-emerald-400" />,
  SUV: <Car className="w-5 h-5 text-blue-400" />,
  Camioneta: <Truck className="w-5 h-5 text-indigo-400" />,
  Bus: <BusIcon className="w-5 h-5 text-orange-400" />,
  Camión: <Truck className="w-5 h-5 text-rose-400" />,
  Desconocido: <AlertTriangle className="w-5 h-5 text-slate-400" />,
};

const CATEGORY_TARIFFS: Record<VehicleCategory, number> = {
  Motocicleta: 2.00,
  Mototaxi: 2.50,
  Automóvil: 3.50,
  SUV: 4.00,
  Camioneta: 4.00,
  Bus: 6.00,
  Camión: 8.00,
  Desconocido: 3.50,
};

export const DetectionCard: React.FC<DetectionCardProps> = ({
  detection,
  onConfirmCategory,
  isConfirming,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);
  const [copiedEventId, setCopiedEventId] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  if (!detection || !detection.primary_vehicle) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[320px]">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-slate-500">
          <Car className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-300 mb-1">Esperando Detección de Vehículo</h3>
        <p className="text-xs text-slate-500 max-w-xs">
          Apunta la cámara del celular hacia el carril de peaje. El clasificador YOLOv8 identificará el vehículo automáticamente.
        </p>
      </div>
    );
  }

  const { primary_vehicle, event_id, status, annotated_image_base64 } = detection;

  const currentCategory = selectedCategory || primary_vehicle.category;
  const currentTariff = CATEGORY_TARIFFS[currentCategory] || primary_vehicle.provisional_tariff;
  const confidencePercent = Math.round(primary_vehicle.confidence * 100);

  const handleCopyEventId = () => {
    navigator.clipboard.writeText(event_id);
    setCopiedEventId(true);
    setTimeout(() => setCopiedEventId(false), 2000);
  };

  const handleConfirm = async () => {
    await onConfirmCategory({
      event_id,
      confirmed_category: currentCategory,
      operator_notes: 'Validado por operador en carril',
      operator_id: 'OP-PIURA-01',
    });
  };

  // Color de confianza
  const getConfidenceBadgeColor = (conf: number) => {
    if (conf >= 0.8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (conf >= 0.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Card Header */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">EVENT ID:</span>
          <button
            onClick={handleCopyEventId}
            className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 hover:border-amber-500/40 transition cursor-pointer"
            title="Copiar ID de evento"
          >
            {event_id}
            {copiedEventId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              status === 'CONFIRMED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : primary_vehicle.requires_review
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Main Vehicle Info Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              {CATEGORY_ICONS[currentCategory] || <Car className="w-6 h-6 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">{currentCategory}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${getConfidenceBadgeColor(
                    primary_vehicle.confidence
                  )}`}
                >
                  {confidencePercent}% conf.
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Clase base COCO:{' '}
                <span className="font-mono text-slate-300 font-semibold">{primary_vehicle.raw_class}</span>
                {' • '}
                BBox: <span className="font-mono text-slate-300">{primary_vehicle.bbox.width}x{primary_vehicle.bbox.height}px</span>
              </p>
            </div>
          </div>

          {/* Big Tariff Display */}
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-5 self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Tarifa Peaje
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              S/ {currentTariff.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Warning Review Banner if applicable */}
        {primary_vehicle.requires_review && status !== 'CONFIRMED' && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Validación de Operador Sugerida</p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                {primary_vehicle.review_reason ||
                  'Las características del vehículo sugieren ambigüedad (e.g. mototaxi o pickup). Valida la categoría.'}
              </p>
            </div>
          </div>
        )}

        {/* Annotated Snapshot Preview Thumbnail */}
        {annotated_image_base64 && (
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black group max-h-48 flex items-center justify-center">
            <img
              src={annotated_image_base64}
              alt="Detección de vehículo"
              className="w-full h-auto max-h-48 object-contain"
            />
            <button
              onClick={() => setShowImageModal(true)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur cursor-pointer transition opacity-80 group-hover:opacity-100"
              title="Ver imagen completa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-cyan-400 border border-cyan-400/30">
              Bounding Box YOLOv8
            </div>
          </div>
        )}

        {/* Fast Operator Override Toolstrip */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Confirmar / Corregir Categoría Vehicular:</span>
            <span className="text-[11px] font-normal text-slate-400">1-Tap para cambiar</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                'Motocicleta',
                'Mototaxi',
                'Automóvil',
                'SUV',
                'Camioneta',
                'Bus',
                'Camión',
              ] as VehicleCategory[]
            ).map((cat) => {
              const isSelected = currentCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                    S/{CATEGORY_TARIFFS[cat].toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleConfirm}
              disabled={isConfirming || status === 'CONFIRMED'}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {status === 'CONFIRMED' ? 'Categoría Validada en Carril' : 'Validar y Asignar Tarifa'}
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Zoom Modal */}
      {showImageModal && annotated_image_base64 && (
        <div
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
            <img
              src={annotated_image_base64}
              alt="Detección completa"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-400 mt-2 font-mono">
              Haz clic en cualquier lugar para cerrar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
