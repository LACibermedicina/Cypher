import { useEffect, useState, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    const connectWebSocket = async () => {
      try {
        let token = null;
        
        // First try to get authenticated user token
        const tokenResponse = await fetch('/api/auth/websocket-token', {
          credentials: 'include'
        });
        
        if (tokenResponse.ok) {
          // Authenticated user - use regular token
          const tokenData = await tokenResponse.json();
          token = tokenData.token;
        } else if (tokenResponse.status === 401) {
          // Unauthenticated user - try visitor token
          try {
            const visitorTokenResponse = await fetch('/api/auth/visitor-websocket-token', {
              credentials: 'include'
            });
            
            if (visitorTokenResponse.ok) {
              const visitorTokenData = await visitorTokenResponse.json();
              token = visitorTokenData.token;
            } else {
              console.error('Failed to get visitor WebSocket token:', visitorTokenResponse.status);
              setTimeout(connectWebSocket, 3000);
              return;
            }
          } catch (visitorError) {
            console.error('Error getting visitor WebSocket token:', visitorError);
            setTimeout(connectWebSocket, 3000);
            return;
          }
        } else {
          console.error('Failed to get WebSocket token:', tokenResponse.status);
          setTimeout(connectWebSocket, 3000);
          return;
        }
        
        if (!token) {
          console.error('No token available for WebSocket connection');
          setTimeout(connectWebSocket, 3000);
          return;
        }
        const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    messages,
    sendMessage,
  };
}
