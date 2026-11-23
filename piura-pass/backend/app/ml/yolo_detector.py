import gc
import os
from pathlib import Path
from typing import List, Tuple, Optional
import cv2
import numpy as np
import torch

from app.ml.base import AbstractVehicleDetector, RawDetection
from app.core.logger import logger
from app.core.config import settings

# Restringir hilos de PyTorch para evitar explosión de memoria en Render (512MB RAM)
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

# Clases COCO que corresponden a vehículos
COCO_VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

class YOLOVehicleDetector(AbstractVehicleDetector):
    """
    Implementación del detector vehicular usando Ultralytics YOLOv8.
    Optimizado para inferencia en CPU con Lazy Loading, bajo consumo de memoria (<250MB)
    y filtrado exclusivo de vehículos.
    """

    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.MODEL_PATH
        if not os.path.exists(self.model_path):
            logger.warning(f"Modelo local no encontrado en {self.model_path}. Ultralytics descargará pesos base.")
            self.model_path = "yolov8n.pt"

        self._model = None

    @property
    def model(self):
        """Carga perezosa (Lazy Load) del modelo para liberar memoria durante el arranque del servidor."""
        if self._model is None:
            logger.info(f"Cargando modelo YOLO (lazy) desde: {self.model_path}")
            from ultralytics import YOLO
            self._model = YOLO(self.model_path)
            logger.info("Modelo YOLO inicializado correctamente en memoria.")
        return self._model

    def detect(self, image_np: np.ndarray, confidence_threshold: float = 0.35) -> List[RawDetection]:
        if image_np is None or image_np.size == 0:
            return []

        # Asegurar límite estricto de hilos CPU
        torch.set_num_threads(1)

        # Inferencia con YOLOv8 en modo inference_mode (sin gradientes ni buffers innecesarios)
        with torch.inference_mode():
            results = self.model.predict(
                source=image_np,
                conf=confidence_threshold,
                classes=list(COCO_VEHICLE_CLASSES.keys()),
                verbose=False,
                imgsz=320,  # 320x320 consume 70% menos RAM que 640x640 y es veloz en CPU
                device="cpu",
            )

        detections: List[RawDetection] = []
        if not results:
            return detections

        first_result = results[0]
        boxes = first_result.boxes

        if boxes is None or len(boxes) == 0:
            return detections

        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()

            if cls_id in COCO_VEHICLE_CLASSES:
                class_name = COCO_VEHICLE_CLASSES[cls_id]
                detections.append(
                    RawDetection(
                        class_id=cls_id,
                        class_name=class_name,
                        confidence=conf,
                        bbox_xyxy=(xyxy[0], xyxy[1], xyxy[2], xyxy[3]),
                    )
                )

        # Ordenar por área de bounding box descendente (el vehículo más cercano/protagonista primero)
        detections.sort(
            key=lambda d: (d.bbox_xyxy[2] - d.bbox_xyxy[0]) * (d.bbox_xyxy[3] - d.bbox_xyxy[1]),
            reverse=True,
        )

        # Liberar memoria transitoria
        gc.collect()

        return detections

    def annotate(self, image_np: np.ndarray, detections: List[RawDetection]) -> np.ndarray:
        annotated = image_np.copy()
        height, width = annotated.shape[:2]

        color_map = {
            "car": (0, 215, 255),       # Dorado / Ámbar
            "motorcycle": (255, 128, 0),# Azul cian
            "bus": (50, 205, 50),       # Verde esmeralda
            "truck": (205, 90, 106),    # Púrpura / Azul acero
        }

        for idx, det in enumerate(detections):
            x1, y1, x2, y2 = [int(v) for v in det.bbox_xyxy]
            # Clip bounds
            x1 = max(0, min(width - 1, x1))
            y1 = max(0, min(height - 1, y1))
            x2 = max(0, min(width - 1, x2))
            y2 = max(0, min(height - 1, y2))

            color = color_map.get(det.class_name, (0, 255, 255))
            is_primary = (idx == 0)
            thickness = 3 if is_primary else 2

            # Rectángulo con esquinas resaltadas (estilo visor ITS HUD)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
            
            # Dibujar marcas angulares de HUD
            corner_len = min(24, int((x2 - x1) * 0.2), int((y2 - y1) * 0.2))
            if corner_len > 6:
                # Top-Left
                cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), (255, 255, 255), thickness + 1)
                cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), (255, 255, 255), thickness + 1)
                # Bottom-Right
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (255, 255, 255), thickness + 1)
                cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), (255, 255, 255), thickness + 1)

            # Etiqueta badge
            label = f"{det.class_name.upper()} {int(det.confidence * 100)}%"
            if is_primary:
                label += " [PRIORITARIO]"

            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            bg_y1 = max(0, y1 - th - 10)
            cv2.rectangle(annotated, (x1, bg_y1), (x1 + tw + 12, y1), color, -1)
            cv2.putText(
                annotated,
                label,
                (x1 + 6, y1 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (10, 10, 15),
                2,
                cv2.LINE_AA,
            )

        return annotated
