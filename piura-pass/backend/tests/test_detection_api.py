import base64
import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.detection import VehicleCategory

client = TestClient(app)

def create_synthetic_image_bytes() -> bytes:
    """Crea una imagen sintética en memoria con un dibujo representativo de vehículo."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Dibujar un bloque rectangular simulando un chasis vehicular
    cv2.rectangle(img, (150, 200), (450, 360), (180, 180, 180), -1)
    # Ruedas
    cv2.circle(img, (220, 360), 40, (50, 50, 50), -1)
    cv2.circle(img, (380, 360), 40, (50, 50, 50), -1)
    # Ventanas
    cv2.rectangle(img, (230, 150), (370, 200), (220, 220, 220), -1)

    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "PIURA PASS" in data["service"]
    assert data["model_loaded"] is True

def test_detect_frame_multipart():
    img_bytes = create_synthetic_image_bytes()
    response = client.post(
        "/api/v1/detection/detect-frame",
        files={"file": ("vehicle.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        data={"station_id": "PEAJE-SULLANA-NORTE", "lane_id": "CARRIL-02"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data
    assert "status" in data
    assert "processing_time_ms" in data
    assert isinstance(data["all_detections"], list)

def test_detect_base64_endpoint():
    img_bytes = create_synthetic_image_bytes()
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
    
    response = client.post(
        "/api/v1/detection/detect-base64",
        json={
            "image_base64": b64_str,
            "station_id": "PEAJE-PIURA-CENTRO",
            "lane_id": "CARRIL-01",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data
    assert data["status"] in ["DETECTED", "NO_VEHICLE", "DUPLICATE_IGNORED", "REQUIRES_REVIEW"]

def test_operator_confirmation_flow():
    # 1. Enviar frame para generar evento
    img_bytes = create_synthetic_image_bytes()
    det_resp = client.post(
        "/api/v1/detection/detect-frame",
        files={"file": ("car.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        data={"station_id": "PEAJE-PIURA-CENTRO", "lane_id": "CARRIL-01"},
    )
    det_data = det_resp.json()
    event_id = det_data["event_id"]

    # 2. El operador valida/corrige a MOTOTAXI
    confirm_resp = client.post(
        "/api/v1/detection/confirm",
        json={
            "event_id": event_id,
            "confirmed_category": "Mototaxi",
            "operator_notes": "Trimóvil Torito con cabina azul validado en carril",
            "operator_id": "OP-CARLOS-SULLANA",
        },
    )
    assert confirm_resp.status_code == 200
    conf_data = confirm_resp.json()
    assert conf_data["event_id"] == event_id
    assert conf_data["confirmed_category"] == "Mototaxi"
    assert conf_data["updated_tariff"] == 2.50
    assert conf_data["status"] == "CONFIRMED"

def test_history_and_stats_endpoints():
    hist_resp = client.get("/api/v1/detection/history")
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert isinstance(history, list)

    stats_resp = client.get("/api/v1/detection/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_frames_processed" in stats
    assert "category_distribution" in stats
