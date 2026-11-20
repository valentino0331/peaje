import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { DetectionCard } from './components/DetectionCard';
import { DetectionHistory } from './components/DetectionHistory';
import { StatsModal } from './components/StatsModal';
import { useCamera } from './hooks/useCamera';
import { useWebSocket } from './hooks/useWebSocket';
import {
  detectFrameBlob,
  detectFrameBase64,
  confirmOperatorCategory,
  fetchDetectionHistory,
  fetchDetectionStats,
  fetchHealth,
} from './services/api';
import type {
  DetectionResponse,
  DetectionHistoryItem,
  SystemStats,
  OperatorConfirmationRequest,
} from './types/detection';
import { generateVehicleSampleDataUrl } from './utils/sampleImages';

export function App() {
  const {
    videoRef,
    state: cameraState,
    startCamera,
    stopCamera,
    toggleCameraFacing,
    captureFrameBlob,
  } = useCamera();

  const { isConnected: isWsConnected, lastMessage } = useWebSocket();

  const [currentDetection, setCurrentDetection] = useState<DetectionResponse | null>(null);
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const autoDetectTimerRef = useRef<any>(null);

  // Comprobar estado inicial del backend y cargar datos
  const loadInitialData = useCallback(async () => {
    try {
      const health = await fetchHealth();
      setIsBackendHealthy(health.status === 'healthy');
      const hist = await fetchDetectionHistory(30);
      setHistory(hist);
      const st = await fetchDetectionStats();
      setStats(st);
    } catch {
      setIsBackendHealthy(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadInitialData, 15000);
    return () => clearInterval(interval);
  }, [loadInitialData]);

  // Manejar mensajes en tiempo real vía WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'NEW_DETECTION') {
      fetchDetectionHistory(30).then(setHistory).catch(console.warn);
      fetchDetectionStats().then(setStats).catch(console.warn);
    } else if (lastMessage.type === 'CATEGORY_CONFIRMED') {
      if (currentDetection && currentDetection.event_id === lastMessage.event_id) {
        setCurrentDetection((prev) =>
          prev
            ? {
                ...prev,
                status: 'CONFIRMED',
                primary_vehicle: prev.primary_vehicle
                  ? {
                      ...prev.primary_vehicle,
                      category: lastMessage.confirmed_category,
                      provisional_tariff: lastMessage.updated_tariff,
                    }
                  : null,
              }
            : null
        );
      }
      fetchDetectionHistory(30).then(setHistory).catch(console.warn);
    }
  }, [lastMessage, currentDetection]);

  // Función núcleo de inferencia
  const executeDetection = useCallback(
    async (blobOrBase64: Blob | string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        let response: DetectionResponse;
        if (typeof blobOrBase64 === 'string') {
          response = await detectFrameBase64(blobOrBase64);
        } else {
          response = await detectFrameBlob(blobOrBase64);
        }

        setLatencyMs(response.processing_time_ms);

        if (response.status === 'DUPLICATE_IGNORED') {
          console.log(`Vehículo duplicado ignorado (evento: ${response.event_id})`);
        } else if (response.status === 'NO_VEHICLE') {
          // No hay vehículo en el frame
        } else {
          setCurrentDetection(response);
          const hist = await fetchDetectionHistory(30);
          setHistory(hist);
        }
      } catch (err: any) {
        console.error('Error al procesar detección:', err);
        setErrorMessage(err.message || 'Error en comunicación con el backend');
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

  // Captura manual
  const handleManualCapture = useCallback(async () => {
    const blob = await captureFrameBlob();
    if (!blob) {
      setErrorMessage('No se pudo capturar frame de la cámara activa.');
      return;
    }
    await executeDetection(blob);
  }, [captureFrameBlob, executeDetection]);

  // Bucle de auto-detección (cada 1200ms)
  useEffect(() => {
    if (autoDetect && cameraState.isStreaming) {
      autoDetectTimerRef.current = setInterval(async () => {
        if (!isProcessing) {
          const blob = await captureFrameBlob();
          if (blob) {
            executeDetection(blob);
          }
        }
      }, 1200);
    } else {
      if (autoDetectTimerRef.current) {
        clearInterval(autoDetectTimerRef.current);
        autoDetectTimerRef.current = null;
      }
    }

    return () => {
      if (autoDetectTimerRef.current) {
        clearInterval(autoDetectTimerRef.current);
      }
    };
  }, [autoDetect, cameraState.isStreaming, isProcessing, captureFrameBlob, executeDetection]);

  // Confirmación del operador
  const handleConfirmCategory = async (req: OperatorConfirmationRequest) => {
    setIsConfirming(true);
    try {
      const resp = await confirmOperatorCategory(req);
      if (currentDetection && currentDetection.event_id === resp.event_id) {
        setCurrentDetection((prev) =>
          prev
            ? {
                ...prev,
                status: 'CONFIRMED',
                primary_vehicle: prev.primary_vehicle
                  ? {
                      ...prev.primary_vehicle,
                      category: resp.confirmed_category,
                      provisional_tariff: resp.updated_tariff,
                    }
                  : null,
              }
            : null
        );
      }
      const hist = await fetchDetectionHistory(30);
      setHistory(hist);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al confirmar categoría');
    } finally {
      setIsConfirming(false);
    }
  };

  // Carga de archivo
  const handleFileUpload = async (file: File) => {
    await executeDetection(file);
  };

  // Carga de muestra sintética
  const handleLoadSyntheticSample = async (type: 'car' | 'mototaxi' | 'truck') => {
    const dataUrl = generateVehicleSampleDataUrl(type);
    if (dataUrl) {
      await executeDetection(dataUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        isBackendHealthy={isBackendHealthy}
        isWsConnected={isWsConnected}
        isCameraActive={cameraState.isStreaming}
        onOpenStats={() => setShowStatsModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Error Toast if present */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-600/60 rounded-xl px-4 py-3 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Camera & Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <CameraFeed
              videoRef={videoRef}
              cameraState={cameraState}
              isProcessing={isProcessing}
              autoDetect={autoDetect}
              onStartCamera={() => startCamera('environment')}
              onStopCamera={stopCamera}
              onToggleFacing={toggleCameraFacing}
              onToggleAutoDetect={() => setAutoDetect((prev) => !prev)}
              onManualCapture={handleManualCapture}
              onFileUpload={handleFileUpload}
              onLoadSyntheticSample={handleLoadSyntheticSample}
              latencyMs={latencyMs}
            />

            {/* History Table below camera on desktop */}
            <div className="hidden lg:block">
              <DetectionHistory
                history={history}
                onRefresh={async () => {
                  const hist = await fetchDetectionHistory(30);
                  setHistory(hist);
                }}
                isLoading={false}
              />
            </div>
          </div>

          {/* Right Column: Active Vehicle Detection & Operator Review Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <DetectionCard
              detection={currentDetection}
              onConfirmCategory={handleConfirmCategory}
              isConfirming={isConfirming}
            />

            {/* History Table on mobile (stacked below detection card) */}
            <div className="block lg:hidden">
              <DetectionHistory
                history={history}
                onRefresh={async () => {
                  const hist = await fetchDetectionHistory(30);
                  setHistory(hist);
                }}
                isLoading={false}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Telemetry Stats Modal */}
      {showStatsModal && (
        <StatsModal stats={stats} onClose={() => setShowStatsModal(false)} />
      )}
    </div>
  );
}

export default App;
