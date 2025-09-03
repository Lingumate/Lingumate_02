import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Force connection to port 3000 where the server is running
    const wsUrl = `${protocol}//localhost:3000`;
    
    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    console.log('🔌 Current window location:', window.location.href);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected successfully');
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('❌ WebSocket URL attempted:', wsUrl);
      console.error('❌ WebSocket ready state:', ws.current?.readyState);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. ReadyState:', ws.current?.readyState);
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
