export type VehicleCategory =
  | 'Motocicleta'
  | 'Mototaxi'
  | 'Automóvil'
  | 'SUV'
  | 'Camioneta'
  | 'Bus'
  | 'Camión'
  | 'Desconocido';

export interface VehicleBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  area: number;
  aspect_ratio: number;
}

export interface VehicleDetectionItem {
  detection_id: string;
  raw_class: string;
  category: VehicleCategory;
  confidence: number;
  bbox: VehicleBoundingBox;
  requires_review: boolean;
  review_reason?: string | null;
  provisional_tariff: number;
}

export interface DetectionResponse {
  event_id: string;
  status: 'DETECTED' | 'NO_VEHICLE' | 'DUPLICATE_IGNORED' | 'REQUIRES_REVIEW' | 'CONFIRMED';
  timestamp: string;
  processing_time_ms: number;
  primary_vehicle?: VehicleDetectionItem | null;
  all_detections: VehicleDetectionItem[];
  is_duplicate: boolean;
  duplicate_of_event_id?: string | null;
  annotated_image_base64?: string | null;
  total_vehicles_in_frame: number;
}

export interface OperatorConfirmationRequest {
  event_id: string;
  confirmed_category: VehicleCategory;
  operator_notes?: string;
  operator_id?: string;
}

export interface OperatorConfirmationResponse {
  event_id: string;
  status: string;
  original_category: VehicleCategory;
  confirmed_category: VehicleCategory;
  provisional_tariff: number;
  updated_tariff: number;
  operator_id: string;
  message: string;
}

export interface DetectionHistoryItem {
  event_id: string;
  timestamp: string;
  category: VehicleCategory;
  confidence: number;
  tariff: number;
  status: string;
  is_duplicate: boolean;
  operator_override: boolean;
  station_id: string;
  lane_id: string;
}

export interface SystemStats {
  total_frames_processed: number;
  total_vehicles_detected: number;
  duplicates_filtered: number;
  operator_overrides: number;
  category_distribution: Record<string, number>;
}
