from typing import Tuple
from uuid import uuid4
from app.ml.base import RawDetection
from app.schemas.detection import VehicleCategory, VehicleBoundingBox, VehicleDetectionItem

# Tarifas provisionales de referencia (Fase 1 - Demostración Piura / Sullana)
PROVISIONAL_TARIFFS = {
    VehicleCategory.MOTOCICLETA: 2.00,
    VehicleCategory.MOTOTAXI: 2.50,
    VehicleCategory.AUTOMOVIL: 3.50,
    VehicleCategory.SUV: 4.00,
    VehicleCategory.CAMIONETA: 4.00,
    VehicleCategory.BUS: 6.00,
    VehicleCategory.CAMION: 8.00,
    VehicleCategory.DESCONOCIDO: 3.50,
}

class VehicleClassificationAdapter:
    """
    Adapta detecciones genéricas COCO de YOLOv8 a las categorías operativas de peaje de Piura.
    Implementa heurísticas de geometría espacial (aspect ratio, área) y gestión de incertidumbre,
    preparando la arquitectura para acoplar modelos especializados entrenados con datasets locales.
    """

    @staticmethod
    def calculate_bbox_metrics(x1: float, y1: float, x2: float, y2: float) -> VehicleBoundingBox:
        width = max(1.0, x2 - x1)
        height = max(1.0, y2 - y1)
        area = width * height
        aspect_ratio = round(width / height, 3)
        return VehicleBoundingBox(
            x1=round(x1, 1),
            y1=round(y1, 1),
            x2=round(x2, 1),
            y2=round(y2, 1),
            width=round(width, 1),
            height=round(height, 1),
            area=round(area, 1),
            aspect_ratio=aspect_ratio,
        )

    @classmethod
    def classify_detection(cls, raw: RawDetection, img_width: int, img_height: int) -> VehicleDetectionItem:
        x1, y1, x2, y2 = raw.bbox_xyxy
        bbox = cls.calculate_bbox_metrics(x1, y1, x2, y2)
        
        raw_class = raw.class_name.lower().strip()
        confidence = round(float(raw.confidence), 3)
        
        category = VehicleCategory.DESCONOCIDO
        requires_review = False
        review_reason = None

        if confidence < 0.50:
            requires_review = True
            review_reason = f"Bajo nivel de confianza ({int(confidence * 100)}%). Requiere confirmación de operador."

        if raw_class == "motorcycle":
            # Heurística para Mototaxi en contexto Piura/Sullana:
            # Una motocicleta típica tiene un aspect_ratio estrecho (< 0.65 vista frontal).
            # Un mototaxi (Bajaj/Torito) posee cabina carrozada trasera ancha (aspect_ratio >= 0.70)
            # y ocupa mayor proporción del ancho del carril.
            if bbox.aspect_ratio >= 0.72 or bbox.area > (img_width * img_height * 0.12):
                category = VehicleCategory.MOTOTAXI
                requires_review = True
                review_reason = "Geometría compatible con Mototaxi / trimóvil carrozado. Verifique con operador."
            else:
                category = VehicleCategory.MOTOCICLETA

        elif raw_class == "car":
            # Diferenciación entre Automóvil vs SUV / Camioneta:
            # COCO 80 no posee clase SUV ni Camioneta. Clasificamos provisionalmente como Automóvil,
            # pero si la altura del vehículo y el área sugieren porte elevado, levantamos flag de revisión.
            relative_height = bbox.height / max(1, img_height)
            if bbox.aspect_ratio < 1.15 and relative_height > 0.40:
                category = VehicleCategory.SUV
                requires_review = True
                review_reason = "Posible SUV o Camioneta por volumen y despeje vertical. Confirme categoría."
            else:
                category = VehicleCategory.AUTOMOVIL

        elif raw_class == "bus":
            category = VehicleCategory.BUS

        elif raw_class == "truck":
            # Si el camión es de porte mediano, podría ser Camioneta de carga (Pick-up)
            if bbox.area < (img_width * img_height * 0.18):
                category = VehicleCategory.CAMIONETA
                requires_review = True
                review_reason = "Vehículo de carga ligera / camioneta Pick-Up detectada."
            else:
                category = VehicleCategory.CAMION

        else:
            category = VehicleCategory.DESCONOCIDO
            requires_review = True
            review_reason = f"Clase no vehicular detectada ({raw_class})."

        provisional_tariff = PROVISIONAL_TARIFFS.get(category, 3.50)

        return VehicleDetectionItem(
            detection_id=f"det-{uuid4().hex[:8]}",
            raw_class=raw_class,
            category=category,
            confidence=confidence,
            bbox=bbox,
            requires_review=requires_review,
            review_reason=review_reason,
            provisional_tariff=provisional_tariff,
        )

    @classmethod
    def get_tariff_for_category(cls, category: VehicleCategory) -> float:
        return PROVISIONAL_TARIFFS.get(category, 3.50)
