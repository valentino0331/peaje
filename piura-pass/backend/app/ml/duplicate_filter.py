import time
from typing import Dict, Optional, Tuple
from app.schemas.detection import VehicleBoundingBox, VehicleCategory
from app.core.logger import logger

class ActiveTrack:
    def __init__(self, event_id: str, category: VehicleCategory, bbox: VehicleBoundingBox, timestamp: float):
        self.event_id = event_id
        self.category = category
        self.bbox = bbox
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.hits = 1

class VehicleDuplicateFilter:
    """
    Control de duplicados espacial y temporal para cabina de peaje.
    Evita generar múltiples cobros o transacciones cuando el vehículo
    permanece detenido en el carril frente a la cámara del operador.
    """

    def __init__(self, iou_threshold: float = 0.40, cooldown_seconds: float = 6.0):
        self.iou_threshold = iou_threshold
        self.cooldown_seconds = cooldown_seconds
        self.active_tracks: Dict[str, ActiveTrack] = {}

    @staticmethod
    def compute_iou(boxA: VehicleBoundingBox, boxB: VehicleBoundingBox) -> float:
        xA = max(boxA.x1, boxB.x1)
        yA = max(boxA.y1, boxB.y1)
        xB = min(boxA.x2, boxB.x2)
        yB = min(boxA.y2, boxB.y2)

        inter_width = max(0.0, xB - xA)
        inter_height = max(0.0, yB - yA)
        inter_area = inter_width * inter_height

        areaA = max(1.0, boxA.area)
        areaB = max(1.0, boxB.area)

        union_area = areaA + areaB - inter_area
        if union_area <= 0:
            return 0.0

        return inter_area / union_area

    def check_duplicate(
        self,
        candidate_bbox: VehicleBoundingBox,
        candidate_category: VehicleCategory,
        now: Optional[float] = None
    ) -> Tuple[bool, Optional[str]]:
        if now is None:
            now = time.time()

        # Limpiar tracks antiguos fuera de la ventana de cooldown
        self._prune_expired_tracks(now)

        best_match_id: Optional[str] = None
        highest_iou = 0.0

        for event_id, track in self.active_tracks.items():
            time_delta = now - track.last_seen
            if time_delta > self.cooldown_seconds:
                continue

            iou = self.compute_iou(candidate_bbox, track.bbox)
            if iou > highest_iou and iou >= self.iou_threshold:
                highest_iou = iou
                best_match_id = event_id

        if best_match_id:
            # Actualizar track existente
            track = self.active_tracks[best_match_id]
            track.last_seen = now
            track.hits += 1
            track.bbox = candidate_bbox
            logger.debug(f"Duplicado detectado para evento {best_match_id} (IoU={highest_iou:.2f}, hits={track.hits})")
            return True, best_match_id

        return False, None

    def register_new_event(self, event_id: str, category: VehicleCategory, bbox: VehicleBoundingBox, now: Optional[float] = None):
        if now is None:
            now = time.time()
        self.active_tracks[event_id] = ActiveTrack(
            event_id=event_id,
            category=category,
            bbox=bbox,
            timestamp=now
        )

    def _prune_expired_tracks(self, now: float):
        expired = [
            eid for eid, track in self.active_tracks.items()
            if (now - track.last_seen) > (self.cooldown_seconds * 2.5)
        ]
        for eid in expired:
            del self.active_tracks[eid]
