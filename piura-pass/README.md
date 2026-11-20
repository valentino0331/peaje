# PIURA PASS 🚗💨🇵🇪
### Sistema Inteligente de Peaje Vehicular mediante Visión Artificial y Pagos Digitales
*Contexto inicial: Estaciones de peaje y control interurbano en Piura y Sullana, Perú.*

---

## 🚀 Estado Actual: FASE 1 COMPLETADA (Prototipo Funcional de Cámara y Detección)

La **Fase 1** establece los cimientos de Computer Vision, comunicación en tiempo real y flujo de operador de carril con cámara móvil sin requerir hardware industrial ni aplicaciones nativas.

### Capacidades Operativas Implementadas
- **Cámara Móvil WebRTC**: Captura en tiempo real desde el navegador móvil utilizando el lente trasero (`facingMode: environment`) mediante la API `MediaDevices`.
- **Motor de Inferencia YOLOv8**: Modelo base nano optimizado para CPU/GPU local que detecta vehículos en milisegundos con bounding boxes HUD.
- **Clasificador Operativo y Heurísticas de Piura**:
  - Mapeo de COCO a categorías de peaje: **Motocicleta, Mototaxi (Trimóvil), Automóvil, SUV, Camioneta, Bus y Camión**.
  - Detección heurística de **Mototaxi** por volumetría y aspect ratio de cabina trasera carrozada (Bajaj/Torito).
  - Identificación de incertidumbre con banderín `requires_review = True` cuando la confianza es < 50% o el tipo de vehículo es ambiguo.
- **Filtro Anti-Duplicados Espaciotemporal**: Control por intersección sobre unión (IoU >= 0.40) y ventana de enfriamiento (cooldown 6s) que evita crear múltiples eventos o cobros mientras el vehículo permanece detenido frente al peaje.
- **Autoridad de Operador (1-Tap Override)**: El operador en carril puede confirmar o corregir la categoría con un solo toque, recalculando la tarifa al instante con trazabilidad de auditoría.
- **Telemetría WebSockets en Tiempo Real**: Notificaciones instantáneas al carril y monitores administrativos.

---

## 📂 Arquitectura del Monorepo

```text
piura-pass/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── detection.py      # Endpoints REST: detect-frame, detect-base64, confirm, history, stats
│   │   │       │   └── health.py         # Endpoint de salud y estado del modelo ML
│   │   │       └── router.py             # Agregador de rutas API v1
│   │   ├── core/
│   │   │   ├── config.py                 # Pydantic Settings y variables de entorno
│   │   │   └── logger.py                 # Logger estructurado
│   │   ├── ml/
│   │   │   ├── base.py                   # Interfaz abstracta AbstractVehicleDetector
│   │   │   ├── yolo_detector.py          # Implementación YOLOv8 con renderizado de bounding boxes
│   │   │   ├── classifier_adapter.py     # Heurísticas de mototaxi/SUV y mapeo de tarifas
│   │   │   └── duplicate_filter.py       # Filtro IoU y ventana temporal de carril
│   │   ├── schemas/
│   │   │   └── detection.py              # Contratos Pydantic de entrada/salida
│   │   ├── services/
│   │   │   └── detection_service.py      # Orquestador del servicio de visión y bitácora
│   │   ├── websocket/
│   │   │   └── manager.py                # Gestor de conexiones WebSockets broadcast
│   │   └── main.py                       # Aplicación FastAPI con CORS y precalentamiento ML
│   ├── models/
│   │   └── yolov8n.pt                    # Pesos locales precalentados de YOLOv8
│   ├── tests/
│   │   ├── test_detection_api.py         # 5 tests de integración API
│   │   └── test_ml_engine.py             # 5 tests unitarios de ML, heurísticas y duplicados
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraFeed.tsx            # Viewport de cámara con HUD visor ITS y controles
│   │   │   ├── DetectionCard.tsx         # Tarjeta de categoría, tarifa y override del operador
│   │   │   ├── DetectionHistory.tsx      # Tabla cronológica de tránsito en carril
│   │   │   ├── Header.tsx                # Cabecera con telemetría de red, IA y cámara
│   │   │   └── StatsModal.tsx            # Modal de estadísticas y distribución vehicular
│   │   ├── hooks/
│   │   │   ├── useCamera.ts              # Hook WebRTC para cámara trasera y captura de frames
│   │   │   └── useWebSocket.ts           # Hook de comunicación bidireccional reactiva
│   │   ├── services/
│   │   │   └── api.ts                    # Cliente REST tipado para la API de detección
│   │   ├── types/
│   │   │   └── detection.ts              # Tipos TypeScript para esquemas vehiculares
│   │   ├── utils/
│   │   │   └── sampleImages.ts           # Generador de vehículos sintéticos (auto, mototaxi, camión)
│   │   ├── App.tsx                       # Layout interactivo responsive para celular y cabina
│   │   └── index.css                     # Tailwind CSS v4 con paleta ITS Dark
│   ├── package.json
│   └── vite.config.ts                    # Configuración de Vite con proxy hacia backend
├── .env.example
└── README.md
```

---

## 🛠️ Cómo Ejecutar el Sistema

### 1. Iniciar el Backend (FastAPI + YOLOv8)

Desde una terminal en la raíz del proyecto:

```powershell
cd piura-pass\backend
$env:PYTHONPATH = "."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Iniciar el Frontend (React + Vite + Tailwind)

En otra terminal:

```powershell
cd piura-pass\frontend
npm run dev
```

- **Acceso Local**: [http://localhost:5173](http://localhost:5173)
- **Acceso desde Celular en la misma red Wi-Fi**: Conéctate a `http://[IP_DE_TU_PC]:5173` desde el navegador Chrome/Safari de tu celular.

---

## 🧪 Pruebas Automatizadas

El backend cuenta con 10 pruebas automatizadas que verifican la inferencia, heurísticas locales de Piura, filtro anti-duplicados y endpoints REST:

```powershell
cd piura-pass\backend
$env:PYTHONPATH = "."
python -m pytest tests -v
```

Resultado verificado: **10 passed in ~7.12s**.
