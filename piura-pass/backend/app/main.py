from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logger import logger
from app.api.v1.router import api_router
from app.api.v1.endpoints.detection import get_detection_service
from app.websocket.manager import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pre-calentar el modelo YOLO para eliminar cold start
    logger.info("Iniciando PIURA PASS Backend...")
    logger.info("Pre-calentando motor de inferencia YOLOv8...")
    try:
        service = get_detection_service()
        # Inferencia sintética rápida para inicializar tensores en memoria
        import numpy as np
        dummy_img = np.zeros((320, 320, 3), dtype=np.uint8)
        service.detector.detect(dummy_img)
        logger.info("Motor YOLOv8 pre-calentado exitosamente y listo para procesar tráfico en carril.")
    except Exception as e:
        logger.error(f"Error al pre-calentar modelo YOLO: {e}")
    yield
    # Shutdown
    logger.info("Deteniendo PIURA PASS Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sistema Inteligente de Peaje Vehicular mediante Visión Artificial (Piura & Sullana, Perú)",
    lifespan=lifespan,
)

# Configuración de CORS para permitir acceso desde navegador móvil en red local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers de la API REST
app.include_router(api_router, prefix=settings.API_V1_STR)

# Canal WebSocket para eventos en tiempo real
@app.websocket("/ws/detection")
async def websocket_detection_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Mantener conexión viva y procesar pings del frontend
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error en WebSocket: {e}")
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "region": "Piura - Sullana, Perú",
        "phase": "FASE 1: Prototipo funcional de cámara y detección vehicular",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
