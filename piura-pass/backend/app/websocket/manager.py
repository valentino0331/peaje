from typing import List, Dict, Any
from fastapi import WebSocket
from app.core.logger import logger

class WebSocketManager:
    """
    Gestor de conexiones WebSockets para eventos de peaje en tiempo real.
    Permite notificar al instante a operadores, monitores de carril y paneles administrativos.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Nuevo cliente WebSocket conectado. Total activos: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Cliente WebSocket desconectado. Total activos: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error enviando mensaje por WebSocket: {e}")
                self.disconnect(connection)

ws_manager = WebSocketManager()
