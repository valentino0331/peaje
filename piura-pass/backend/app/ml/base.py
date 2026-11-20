from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Tuple
import numpy as np

@dataclass
class RawDetection:
    class_id: int
    class_name: str
    confidence: float
    bbox_xyxy: Tuple[float, float, float, float]  # (x1, y1, x2, y2)
    track_id: int = -1

class AbstractVehicleDetector(ABC):
    """
    Contrato base para cualquier motor de detección vehicular.
    Permite desacoplar el modelo (YOLOv8, YOLOv9, ONNX, TensorRT) de la lógica de negocio.
    """
    
    @abstractmethod
    def detect(self, image_np: np.ndarray, confidence_threshold: float = 0.35) -> List[RawDetection]:
        """Ejecuta inferencia sobre una matriz numpy BGR/RGB y retorna detecciones brutas."""
        pass

    @abstractmethod
    def annotate(self, image_np: np.ndarray, detections: List[RawDetection]) -> np.ndarray:
        """Dibuja bounding boxes, etiquetas de categoría y confianza sobre la imagen."""
        pass
