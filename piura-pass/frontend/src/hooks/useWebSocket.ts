import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(url: string = '/ws/detection') {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    // Protocolo ws o wss dinámico según la ventana
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const fullUrl = `${protocol}//${host}${url}`;

    try {
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          // Ignorar mensajes no-JSON (e.g. "pong")
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconexión automática tras 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.warn('Error al inicializar WebSocket:', err);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
