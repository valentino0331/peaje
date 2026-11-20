import numpy as np
import pytest
from app.ml.base import RawDetection
from app.ml.classifier_adapter import VehicleClassificationAdapter
from app.ml.duplicate_filter import VehicleDuplicateFilter
from app.ml.yolo_detector import YOLOVehicleDetector
from app.schemas.detection import VehicleCategory, VehicleBoundingBox

def test_classifier_adapter_motorcycle_standard():
    # Aspect ratio estrecho (0.5) => Motocicleta convencional
    raw = RawDetection(
        class_id=3,
        class_name="motorcycle",
        confidence=0.88,
        bbox_xyxy=(100.0, 100.0, 150.0, 200.0), # width=50, height=100 -> ar=0.5
    )
    result = VehicleClassificationAdapter.classify_detection(raw, img_width=640, img_height=480)
    assert result.category == VehicleCategory.MOTOCICLETA
    assert result.provisional_tariff == 2.00
    assert result.requires_review is False

def test_classifier_adapter_mototaxi_heuristic():
    # Aspect ratio ancho (0.85) => Cabina trasera carrozada (Mototaxi Piurano)
    raw = RawDetection(
        class_id=3,
        class_name="motorcycle",
        confidence=0.82,
        bbox_xyxy=(100.0, 100.0, 185.0, 200.0), # width=85, height=100 -> ar=0.85
    )
    result = VehicleClassificationAdapter.classify_detection(raw, img_width=640, img_height=480)
    assert result.category == VehicleCategory.MOTOTAXI
    assert result.provisional_tariff == 2.50
    assert result.requires_review is True
    assert "Mototaxi" in result.review_reason

def test_classifier_adapter_car_and_bus():
    raw_car = RawDetection(
        class_id=2,
        class_name="car",
        confidence=0.91,
        bbox_xyxy=(100.0, 100.0, 250.0, 200.0),
    )
    res_car = VehicleClassificationAdapter.classify_detection(raw_car, 640, 480)
    assert res_car.category in [VehicleCategory.AUTOMOVIL, VehicleCategory.SUV]
    assert res_car.provisional_tariff in [3.50, 4.00]

    raw_bus = RawDetection(
        class_id=5,
        class_name="bus",
        confidence=0.94,
        bbox_xyxy=(50.0, 50.0, 300.0, 400.0),
    )
    res_bus = VehicleClassificationAdapter.classify_detection(raw_bus, 640, 480)
    assert res_bus.category == VehicleCategory.BUS
    assert res_bus.provisional_tariff == 6.00

def test_duplicate_filter_spatial_and_temporal():
    dup_filter = VehicleDuplicateFilter(iou_threshold=0.40, cooldown_seconds=5.0)

    bbox_first = VehicleBoundingBox(
        x1=100.0, y1=100.0, x2=250.0, y2=220.0,
        width=150.0, height=120.0, area=18000.0, aspect_ratio=1.25
    )
    event_id = "EVT-TEST-001"
    dup_filter.register_new_event(event_id, VehicleCategory.AUTOMOVIL, bbox_first, now=100.0)

    # 1. Mismo vehículo 2 segundos después en casi la misma posición (IoU alto) -> DUPLICADO
    bbox_second = VehicleBoundingBox(
        x1=102.0, y1=101.0, x2=251.0, y2=221.0,
        width=149.0, height=120.0, area=17880.0, aspect_ratio=1.24
    )
    is_dup, match_id = dup_filter.check_duplicate(bbox_second, VehicleCategory.AUTOMOVIL, now=102.0)
    assert is_dup is True
    assert match_id == event_id

    # 2. Vehículo diferente en otra posición -> NO DUPLICADO
    bbox_other = VehicleBoundingBox(
        x1=400.0, y1=300.0, x2=550.0, y2=420.0,
        width=150.0, height=120.0, area=18000.0, aspect_ratio=1.25
    )
    is_dup_other, match_other = dup_filter.check_duplicate(bbox_other, VehicleCategory.AUTOMOVIL, now=102.5)
    assert is_dup_other is False
    assert match_other is None

    # 3. Mismo vehículo pero 10 segundos después (cooldown expirado) -> NO DUPLICADO
    is_dup_expired, _ = dup_filter.check_duplicate(bbox_second, VehicleCategory.AUTOMOVIL, now=115.0)
    assert is_dup_expired is False

def test_yolo_detector_inference_on_synthetic():
    detector = YOLOVehicleDetector()
    # Generar imagen sintética vacía
    synthetic_img = np.zeros((320, 320, 3), dtype=np.uint8)
    detections = detector.detect(synthetic_img, confidence_threshold=0.25)
    assert isinstance(detections, list)

    annotated = detector.annotate(synthetic_img, detections)
    assert annotated.shape == synthetic_img.shape
