import base64
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import cv2
import numpy as np

from app.schemas.detection import (
    DetectionResponse,
    Base64DetectRequest,
    OperatorConfirmationRequest,
    OperatorConfirmationResponse,
    DetectionHistoryItem,
    VehicleCategory,
)
from app.services.detection_service import VehicleDetectionService

router = APIRouter()

# Instancia singleton del servicio para la aplicación
_detection_service_instance: Optional[VehicleDetectionService] = None

def get_detection_service() -> VehicleDetectionService:
    global _detection_service_instance
    if _detection_service_instance is None:
        _detection_service_instance = VehicleDetectionService()
    return _detection_service_instance

@router.post("/detect-frame", response_model=DetectionResponse, summary="Procesar frame de cámara (Multipart/Form-Data)")
async def detect_frame(
    file: UploadFile = File(..., description="Imagen capturada desde la cámara del celular"),
    station_id: str = Form("PEAJE-PIURA-CENTRO"),
    lane_id: str = Form("CARRIL-01"),
    service: VehicleDetectionService = Depends(get_detection_service),
):
    """
    Recibe un frame binario capturado por la cámara trasera del celular del operador.
    Ejecuta inferencia con YOLOv8, mapea categorías, filtra duplicados y retorna el resultado estructurado.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="El archivo recibido está vacío.")
        
        response = await service.process_frame(content, station_id=station_id, lane_id=lane_id)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en motor de detección: {str(e)}")

@router.post("/detect-base64", response_model=DetectionResponse, summary="Procesar frame en Base64 (JSON)")
async def detect_base64(
    request: Base64DetectRequest,
    service: VehicleDetectionService = Depends(get_detection_service),
):
    """
    Recibe un frame codificado en Base64 (ideal para WebRTC Canvas snapshots directos desde el navegador).
    """
    try:
        raw_b64 = request.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(raw_b64)
        response = await service.process_frame(
            image_bytes,
            station_id=request.station_id or "PEAJE-PIURA-CENTRO",
            lane_id=request.lane_id or "CARRIL-01",
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error procesando frame base64: {str(e)}")

@router.post("/confirm", response_model=OperatorConfirmationResponse, summary="Confirmación o corrección manual del operador")
async def confirm_detection(
    request: OperatorConfirmationRequest,
    service: VehicleDetectionService = Depends(get_detection_service),
):
    """
    Permite al operador de carril validar la categoría detectada o corregirla
    (e.g., cuando el modelo clasifica un Mototaxi como Motocicleta o un SUV como Automóvil).
    Actualiza la tarifa de cobro y deja traza de auditoría.
    """
    return await service.confirm_category(request)

@router.get("/history", response_model=List[DetectionHistoryItem], summary="Historial reciente de detecciones")
def get_detection_history(
    limit: int = 50,
    service: VehicleDetectionService = Depends(get_detection_service),
):
    return service.get_history(limit=limit)

@router.get("/stats", summary="Métricas de rendimiento del motor de visión")
def get_detection_stats(
    service: VehicleDetectionService = Depends(get_detection_service),
):
    return service.get_stats()
