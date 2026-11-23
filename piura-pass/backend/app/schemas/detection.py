from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class VehicleCategory(str, Enum):
    MOTOCICLETA = "Motocicleta"
    MOTOTAXI = "Mototaxi"
    AUTOMOVIL = "Automóvil"
    SUV = "SUV"
    CAMIONETA = "Camioneta"
    BUS = "Bus"
    CAMION = "Camión"
    DESCONOCIDO = "Desconocido"

class VehicleBoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float
    area: float
    aspect_ratio: float

class VehicleDetectionItem(BaseModel):
    detection_id: str
    raw_class: str
    category: VehicleCategory
    confidence: float
    bbox: VehicleBoundingBox
    requires_review: bool = False
    review_reason: Optional[str] = None
    provisional_tariff: float
    license_plate: Optional[str] = None

class DetectionResponse(BaseModel):
    event_id: str
    status: str  # "DETECTED", "NO_VEHICLE", "DUPLICATE_IGNORED", "REQUIRES_REVIEW"
    timestamp: str
    processing_time_ms: float
    primary_vehicle: Optional[VehicleDetectionItem] = None
    all_detections: List[VehicleDetectionItem] = []
    is_duplicate: bool = False
    duplicate_of_event_id: Optional[str] = None
    annotated_image_base64: Optional[str] = None
    total_vehicles_in_frame: int = 0
    license_plate: Optional[str] = None

class Base64DetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG or PNG image")
    station_id: Optional[str] = "PEAJE-PIURA-CENTRO"
    lane_id: Optional[str] = "CARRIL-01"

class OperatorConfirmationRequest(BaseModel):
    event_id: str
    confirmed_category: VehicleCategory
    operator_notes: Optional[str] = None
    operator_id: Optional[str] = "OP-PIURA-01"
    license_plate: Optional[str] = None

class OperatorConfirmationResponse(BaseModel):
    event_id: str
    status: str  # "CONFIRMED"
    original_category: VehicleCategory
    confirmed_category: VehicleCategory
    provisional_tariff: float
    updated_tariff: float
    operator_id: str
    message: str
    license_plate: Optional[str] = None

class DetectionHistoryItem(BaseModel):
    event_id: str
    timestamp: str
    category: VehicleCategory
    confidence: float
    tariff: float
    status: str
    is_duplicate: bool
    operator_override: bool = False
    station_id: str = "PEAJE-PIURA-CENTRO"
    lane_id: str = "CARRIL-01"
    license_plate: Optional[str] = None
    payment_status: Optional[str] = "PENDING"
