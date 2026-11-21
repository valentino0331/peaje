import type {
  DetectionResponse,
  OperatorConfirmationRequest,
  OperatorConfirmationResponse,
  DetectionHistoryItem,
  SystemStats,
} from '../types/detection';

const API_HOST = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_HOST}/api/v1`;

export async function detectFrameBlob(
  blob: Blob,
  stationId: string = 'PEAJE-PIURA-CENTRO',
  laneId: string = 'CARRIL-01'
): Promise<DetectionResponse> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');
  formData.append('station_id', stationId);
  formData.append('lane_id', laneId);

  const response = await fetch(`${API_BASE}/detection/detect-frame`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en detección (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function detectFrameBase64(
  base64: string,
  stationId: string = 'PEAJE-PIURA-CENTRO',
  laneId: string = 'CARRIL-01'
): Promise<DetectionResponse> {
  const response = await fetch(`${API_BASE}/detection/detect-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: base64,
      station_id: stationId,
      lane_id: laneId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en detección base64 (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function confirmOperatorCategory(
  payload: OperatorConfirmationRequest
): Promise<OperatorConfirmationResponse> {
  const response = await fetch(`${API_BASE}/detection/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al confirmar categoría (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function fetchDetectionHistory(limit: number = 20): Promise<DetectionHistoryItem[]> {
  const response = await fetch(`${API_BASE}/detection/history?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Error al obtener historial');
  }
  return response.json();
}

export async function fetchDetectionStats(): Promise<SystemStats> {
  const response = await fetch(`${API_BASE}/detection/stats`);
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }
  return response.json();
}

export async function fetchHealth(): Promise<{ status: string; model_loaded: boolean }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Servidor fuera de línea');
  }
  return response.json();
}
