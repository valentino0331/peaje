import base64
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4
import cv2
import numpy as np

from app.core.config import settings
from app.core.logger import logger
from app.ml.yolo_detector import YOLOVehicleDetector
from app.ml.classifier_adapter import VehicleClassificationAdapter
from app.ml.duplicate_filter import VehicleDuplicateFilter
from app.schemas.detection import (
    VehicleCategory,
    VehicleDetectionItem,
    DetectionResponse,
    OperatorConfirmationRequest,
    OperatorConfirmationResponse,
    DetectionHistoryItem,
)
from app.websocket.manager import ws_manager

class VehicleDetectionService:
    """
    Servicio de orquestación de Computer Vision para el peaje PIURA PASS.
    Coordina la inferencia de YOLO, la adaptación a categorías locales,
    el filtro anti-duplicados por carril y la confirmación del operador.
    """

    def __init__(self, detector: Optional[YOLOVehicleDetector] = None):
        self.detector = detector or YOLOVehicleDetector()
        self.adapter = VehicleClassificationAdapter()
        self.duplicate_filter = VehicleDuplicateFilter(
            iou_threshold=settings.DUPLICATE_IOU_THRESHOLD,
            cooldown_seconds=settings.DUPLICATE_COOLDOWN_SECONDS,
        )
        self.history: List[DetectionHistoryItem] = []
        self.events_db: Dict[str, Dict[str, Any]] = {}
        self.stats = {
            "total_frames_processed": 0,
            "total_vehicles_detected": 0,
            "duplicates_filtered": 0,
            "operator_overrides": 0,
            "category_distribution": {cat.value: 0 for cat in VehicleCategory},
        }

    def decode_image_bytes(self, image_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar la imagen enviada. Formato corrupto o no soportado.")
        return img

    def encode_annotated_image(self, image_np: np.ndarray) -> str:
        success, encoded = cv2.imencode(".jpg", image_np, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            return ""
        return f"data:image/jpeg;base64,{base64.b64encode(encoded.tobytes()).decode('utf-8')}"

    async def process_frame(
        self,
        image_bytes: bytes,
        station_id: str = "PEAJE-PIURA-CENTRO",
        lane_id: str = "CARRIL-01",
    ) -> DetectionResponse:
        start_time = time.perf_counter()
        now_ts = datetime.now(timezone.utc).isoformat()
        self.stats["total_frames_processed"] += 1

        img = self.decode_image_bytes(image_bytes)
        img_height, img_width = img.shape[:2]

        # 1. Inferencia del detector
        raw_detections = self.detector.detect(img, confidence_threshold=settings.CONFIDENCE_THRESHOLD)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if not raw_detections:
            return DetectionResponse(
                event_id=f"EVT-{uuid4().hex[:10].upper()}",
                status="NO_VEHICLE",
                timestamp=now_ts,
                processing_time_ms=elapsed_ms,
                primary_vehicle=None,
                all_detections=[],
                is_duplicate=False,
                annotated_image_base64=None,
                total_vehicles_in_frame=0,
            )

        # 2. Clasificación operativa adaptada
        classified_items: List[VehicleDetectionItem] = [
            self.adapter.classify_detection(raw, img_width, img_height)
            for raw in raw_detections
        ]

        primary_vehicle = classified_items[0]

        # 3. Control de duplicados espaciotemporal
        is_dup, dup_event_id = self.duplicate_filter.check_duplicate(
            primary_vehicle.bbox,
            primary_vehicle.category,
        )

        if is_dup:
            self.stats["duplicates_filtered"] += 1
            return DetectionResponse(
                event_id=dup_event_id or f"DUP-{uuid4().hex[:8].upper()}",
                status="DUPLICATE_IGNORED",
                timestamp=now_ts,
                processing_time_ms=elapsed_ms,
                primary_vehicle=primary_vehicle,
                all_detections=classified_items,
                is_duplicate=True,
                duplicate_of_event_id=dup_event_id,
                annotated_image_base64=None,
                total_vehicles_in_frame=len(classified_items),
            )

        # 4. Generar evento de detección válido
        event_id = f"EVT-PIURA-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        self.duplicate_filter.register_new_event(event_id, primary_vehicle.category, primary_vehicle.bbox)

        # 5. Anotar imagen con bounding boxes y HUD
        annotated_img = self.detector.annotate(img, raw_detections)
        annotated_b64 = self.encode_annotated_image(annotated_img)

        # 6. Registrar en memoria e historial
        status_label = "REQUIRES_REVIEW" if primary_vehicle.requires_review else "DETECTED"
        history_record = DetectionHistoryItem(
            event_id=event_id,
            timestamp=now_ts,
            category=primary_vehicle.category,
            confidence=primary_vehicle.confidence,
            tariff=primary_vehicle.provisional_tariff,
            status=status_label,
            is_duplicate=False,
            operator_override=False,
            station_id=station_id,
            lane_id=lane_id,
        )
        self.history.insert(0, history_record)
        if len(self.history) > 200:
            self.history.pop()

        self.events_db[event_id] = {
            "record": history_record,
            "primary_vehicle": primary_vehicle,
            "all_detections": classified_items,
            "annotated_image_base64": annotated_b64,
        }

        # Actualizar métricas
        self.stats["total_vehicles_detected"] += 1
        cat_key = primary_vehicle.category.value
        self.stats["category_distribution"][cat_key] = self.stats["category_distribution"].get(cat_key, 0) + 1

        response = DetectionResponse(
            event_id=event_id,
            status=status_label,
            timestamp=now_ts,
            processing_time_ms=elapsed_ms,
            primary_vehicle=primary_vehicle,
            all_detections=classified_items,
            is_duplicate=False,
            annotated_image_base64=annotated_b64,
            total_vehicles_in_frame=len(classified_items),
        )

        # 7. Difundir vía WebSocket para clientes conectados
        await ws_manager.broadcast({
            "type": "NEW_DETECTION",
            "event_id": event_id,
            "category": primary_vehicle.category.value,
            "confidence": primary_vehicle.confidence,
            "tariff": primary_vehicle.provisional_tariff,
            "requires_review": primary_vehicle.requires_review,
            "review_reason": primary_vehicle.review_reason,
            "status": status_label,
            "timestamp": now_ts,
        })

        return response

    async def confirm_category(self, request: OperatorConfirmationRequest) -> OperatorConfirmationResponse:
        event = self.events_db.get(request.event_id)
        if not event:
            # Si el evento no está en memoria reciente, crear respuesta consistente
            updated_tariff = self.adapter.get_tariff_for_category(request.confirmed_category)
            return OperatorConfirmationResponse(
                event_id=request.event_id,
                status="CONFIRMED",
                original_category=VehicleCategory.DESCONOCIDO,
                confirmed_category=request.confirmed_category,
                provisional_tariff=3.50,
                updated_tariff=updated_tariff,
                operator_id=request.operator_id or "OP-DEFAULT",
                message="Categoría confirmada y tarifa actualizada por el operador.",
            )

        original_cat = event["record"].category
        original_tariff = event["record"].tariff
        updated_tariff = self.adapter.get_tariff_for_category(request.confirmed_category)

        # Actualizar registro
        event["record"].category = request.confirmed_category
        event["record"].tariff = updated_tariff
        event["record"].status = "CONFIRMED"
        event["record"].operator_override = (original_cat != request.confirmed_category)

        if event["record"].operator_override:
            self.stats["operator_overrides"] += 1
            logger.info(
                f"Operador {request.operator_id} corrigió categoría para evento {request.event_id}: "
                f"{original_cat.value} -> {request.confirmed_category.value}"
            )

        # Actualizar distribución en stats
        self.stats["category_distribution"][request.confirmed_category.value] += 1
        if self.stats["category_distribution"][original_cat.value] > 0:
            self.stats["category_distribution"][original_cat.value] -= 1

        # Notificar por WebSocket
        await ws_manager.broadcast({
            "type": "CATEGORY_CONFIRMED",
            "event_id": request.event_id,
            "original_category": original_cat.value,
            "confirmed_category": request.confirmed_category.value,
            "updated_tariff": updated_tariff,
            "operator_id": request.operator_id,
        })

        return OperatorConfirmationResponse(
            event_id=request.event_id,
            status="CONFIRMED",
            original_category=original_cat,
            confirmed_category=request.confirmed_category,
            provisional_tariff=original_tariff,
            updated_tariff=updated_tariff,
            operator_id=request.operator_id or "OP-DEFAULT",
            message="Categoría y tarifa validadas correctamente por el operador de carril.",
        )

    def get_history(self, limit: int = 50) -> List[DetectionHistoryItem]:
        return self.history[:limit]

    def get_stats(self) -> Dict[str, Any]:
        return self.stats
