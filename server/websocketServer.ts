<<<<<<< HEAD
import WebSocket from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

interface TranslationSession {
  sessionId: string;
  initiatorId: string;
  joinerId?: string;
  initiatorSocket?: WebSocket;
  joinerSocket?: WebSocket;
  isActive: boolean;
  startTime: Date;
}

interface WebSocketMessage {
  type: 'init_connection' | 'translation_message' | 'heartbeat' | 'end_session';
  session_id: string;
  user_id: string;
  encrypted_message?: string;
  timestamp: number;
}

class TranslationWebSocketServer {
  private wss: WebSocket.Server;
  private sessions: Map<string, TranslationSession> = new Map();
  private userSessions: Map<string, string> = new Map(); // user_id -> session_id

  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    server.listen(port, () => {
      console.log(`🚀 Translation WebSocket Server running on port ${port}`);
    });

    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  private handleConnection(ws: WebSocket, req: any) {
    console.log('🔌 New WebSocket connection established');

    ws.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage) {
    console.log(`📨 Received message type: ${message.type} for session: ${message.session_id}`);

    switch (message.type) {
      case 'init_connection':
        this.handleInitConnection(ws, message);
        break;
      case 'translation_message':
        this.handleTranslationMessage(ws, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(ws, message);
        break;
      case 'end_session':
        this.handleEndSession(ws, message);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private handleInitConnection(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, user_id } = message;
    
    let session = this.sessions.get(session_id);
    
    if (!session) {
      // Create new session
      session = {
        sessionId: session_id,
        initiatorId: user_id,
        initiatorSocket: ws,
        isActive: false,
        startTime: new Date()
      };
      this.sessions.set(session_id, session);
      console.log(`🆕 Created new session: ${session_id} with initiator: ${user_id}`);
    } else {
      // Join existing session
      if (session.initiatorId === user_id) {
        session.initiatorSocket = ws;
        console.log(`🔗 Initiator reconnected to session: ${session_id}`);
      } else {
        session.joinerId = user_id;
        session.joinerSocket = ws;
        session.isActive = true;
        console.log(`🤝 Joiner connected to session: ${session_id}`);
        
        // Notify both users that session is active
        this.notifySessionActive(session);
      }
    }

    this.userSessions.set(user_id, session_id);
    
    // Send confirmation
    this.sendMessage(ws, {
      type: 'connection_confirmed',
      session_id: session_id,
      user_id: user_id,
      is_active: session.isActive,
      timestamp: Date.now()
    });
  }

  private handleTranslationMessage(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, encrypted_message } = message;
    const session = this.sessions.get(session_id);
    
    if (!session || !session.isActive) {
      this.sendError(ws, 'Session not active');
      return;
    }

    // Determine sender and recipient
    const isInitiator = ws === session.initiatorSocket;
    const recipientSocket = isInitiator ? session.joinerSocket : session.initiatorSocket;

    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
      // Relay the encrypted message to the other user
      this.sendMessage(recipientSocket, {
        type: 'translation_message',
        session_id: session_id,
        encrypted_message: encrypted_message,
        timestamp: Date.now()
      });
      
      console.log(`📤 Relayed translation message in session: ${session_id}`);
    } else {
      console.log(`⚠️ Recipient not available for session: ${session_id}`);
    }
  }

  private handleHeartbeat(ws: WebSocket, message: WebSocketMessage) {
    // Send heartbeat response
    this.sendMessage(ws, {
      type: 'heartbeat_response',
      session_id: message.session_id,
      timestamp: Date.now()
    });
  }

  private handleEndSession(ws: WebSocket, message: WebSocketMessage) {
    const { session_id } = message;
    const session = this.sessions.get(session_id);
    
    if (session) {
      // Notify both users that session is ending
      if (session.initiatorSocket && session.initiatorSocket.readyState === WebSocket.OPEN) {
        this.sendMessage(session.initiatorSocket, {
          type: 'session_ended',
          session_id: session_id,
          timestamp: Date.now()
        });
      }
      
      if (session.joinerSocket && session.joinerSocket.readyState === WebSocket.OPEN) {
        this.sendMessage(session.joinerSocket, {
          type: 'session_ended',
          session_id: session_id,
          timestamp: Date.now()
        });
      }
      
      // Clean up session
      this.cleanupSession(session_id);
      console.log(`🔚 Session ended: ${session_id}`);
    }
  }

  private handleDisconnection(ws: WebSocket) {
    console.log('🔌 WebSocket connection closed');
    
    // Find and cleanup session
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.initiatorSocket === ws || session.joinerSocket === ws) {
        this.cleanupSession(sessionId);
        break;
      }
    }
  }

  private notifySessionActive(session: TranslationSession) {
    const message = {
      type: 'session_active',
      session_id: session.sessionId,
      timestamp: Date.now()
    };

    if (session.initiatorSocket && session.initiatorSocket.readyState === WebSocket.OPEN) {
      this.sendMessage(session.initiatorSocket, message);
    }
    
    if (session.joinerSocket && session.joinerSocket.readyState === WebSocket.OPEN) {
      this.sendMessage(session.joinerSocket, message);
    }
  }

  private cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove user session mappings
      if (session.initiatorId) {
        this.userSessions.delete(session.initiatorId);
      }
      if (session.joinerId) {
        this.userSessions.delete(session.joinerId);
      }
      
      // Close sockets
      if (session.initiatorSocket) {
        session.initiatorSocket.close();
      }
      if (session.joinerSocket) {
        session.joinerSocket.close();
      }
      
      // Remove session
      this.sessions.delete(sessionId);
    }
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.startTime.getTime();
      if (sessionAge > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
        this.cleanupSession(sessionId);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error: error,
      timestamp: Date.now()
    });
  }

  // Public methods for monitoring
  public getStats() {
    return {
      activeConnections: this.wss.clients.size,
      activeSessions: this.sessions.size,
      totalSessions: this.userSessions.size
    };
  }

  public getActiveSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      initiatorId: session.initiatorId,
      joinerId: session.joinerId,
      isActive: session.isActive,
      startTime: session.startTime
    }));
  }
}

// Start the server
const server = new TranslationWebSocketServer(8080);

// Export for potential use in other parts of the application
export default server;
=======
import WebSocket from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

interface TranslationSession {
  sessionId: string;
  initiatorId: string;
  joinerId?: string;
  initiatorSocket?: WebSocket;
  joinerSocket?: WebSocket;
  isActive: boolean;
  startTime: Date;
}

interface WebSocketMessage {
  type: 'init_connection' | 'translation_message' | 'heartbeat' | 'end_session';
  session_id: string;
  user_id: string;
  encrypted_message?: string;
  timestamp: number;
}

class TranslationWebSocketServer {
  private wss: WebSocket.Server;
  private sessions: Map<string, TranslationSession> = new Map();
  private userSessions: Map<string, string> = new Map(); // user_id -> session_id

  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    server.listen(port, () => {
      console.log(`🚀 Translation WebSocket Server running on port ${port}`);
    });

    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  private handleConnection(ws: WebSocket, req: any) {
    console.log('🔌 New WebSocket connection established');

    ws.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage) {
    console.log(`📨 Received message type: ${message.type} for session: ${message.session_id}`);

    switch (message.type) {
      case 'init_connection':
        this.handleInitConnection(ws, message);
        break;
      case 'translation_message':
        this.handleTranslationMessage(ws, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(ws, message);
        break;
      case 'end_session':
        this.handleEndSession(ws, message);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private handleInitConnection(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, user_id } = message;
    
    let session = this.sessions.get(session_id);
    
    if (!session) {
      // Create new session
      session = {
        sessionId: session_id,
        initiatorId: user_id,
        initiatorSocket: ws,
        isActive: false,
        startTime: new Date()
      };
      this.sessions.set(session_id, session);
      console.log(`🆕 Created new session: ${session_id} with initiator: ${user_id}`);
    } else {
      // Join existing session
      if (session.initiatorId === user_id) {
        session.initiatorSocket = ws;
        console.log(`🔗 Initiator reconnected to session: ${session_id}`);
      } else {
        session.joinerId = user_id;
        session.joinerSocket = ws;
        session.isActive = true;
        console.log(`🤝 Joiner connected to session: ${session_id}`);
        
        // Notify both users that session is active
        this.notifySessionActive(session);
      }
    }

    this.userSessions.set(user_id, session_id);
    
    // Send confirmation
    this.sendMessage(ws, {
      type: 'connection_confirmed',
      session_id: session_id,
      user_id: user_id,
      is_active: session.isActive,
      timestamp: Date.now()
    });
  }

  private handleTranslationMessage(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, encrypted_message } = message;
    const session = this.sessions.get(session_id);
    
    if (!session || !session.isActive) {
      this.sendError(ws, 'Session not active');
      return;
    }

    // Determine sender and recipient
    const isInitiator = ws === session.initiatorSocket;
    const recipientSocket = isInitiator ? session.joinerSocket : session.initiatorSocket;

    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
      // Relay the encrypted message to the other user
      this.sendMessage(recipientSocket, {
        type: 'translation_message',
        session_id: session_id,
        encrypted_message: encrypted_message,
        timestamp: Date.now()
      });
      
      console.log(`📤 Relayed translation message in session: ${session_id}`);
    } else {
      console.log(`⚠️ Recipient not available for session: ${session_id}`);
    }
  }

  private handleHeartbeat(ws: WebSocket, message: WebSocketMessage) {
    // Send heartbeat response
    this.sendMessage(ws, {
      type: 'heartbeat_response',
      session_id: message.session_id,
      timestamp: Date.now()
    });
  }

  private handleEndSession(ws: WebSocket, message: WebSocketMessage) {
    const { session_id } = message;
    const session = this.sessions.get(session_id);
    
    if (session) {
      // Notify both users that session is ending
      if (session.initiatorSocket && session.initiatorSocket.readyState === WebSocket.OPEN) {
        this.sendMessage(session.initiatorSocket, {
          type: 'session_ended',
          session_id: session_id,
          timestamp: Date.now()
        });
      }
      
      if (session.joinerSocket && session.joinerSocket.readyState === WebSocket.OPEN) {
        this.sendMessage(session.joinerSocket, {
          type: 'session_ended',
          session_id: session_id,
          timestamp: Date.now()
        });
      }
      
      // Clean up session
      this.cleanupSession(session_id);
      console.log(`🔚 Session ended: ${session_id}`);
    }
  }

  private handleDisconnection(ws: WebSocket) {
    console.log('🔌 WebSocket connection closed');
    
    // Find and cleanup session
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.initiatorSocket === ws || session.joinerSocket === ws) {
        this.cleanupSession(sessionId);
        break;
      }
    }
  }

  private notifySessionActive(session: TranslationSession) {
    const message = {
      type: 'session_active',
      session_id: session.sessionId,
      timestamp: Date.now()
    };

    if (session.initiatorSocket && session.initiatorSocket.readyState === WebSocket.OPEN) {
      this.sendMessage(session.initiatorSocket, message);
    }
    
    if (session.joinerSocket && session.joinerSocket.readyState === WebSocket.OPEN) {
      this.sendMessage(session.joinerSocket, message);
    }
  }

  private cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove user session mappings
      if (session.initiatorId) {
        this.userSessions.delete(session.initiatorId);
      }
      if (session.joinerId) {
        this.userSessions.delete(session.joinerId);
      }
      
      // Close sockets
      if (session.initiatorSocket) {
        session.initiatorSocket.close();
      }
      if (session.joinerSocket) {
        session.joinerSocket.close();
      }
      
      // Remove session
      this.sessions.delete(sessionId);
    }
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.startTime.getTime();
      if (sessionAge > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
        this.cleanupSession(sessionId);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error: error,
      timestamp: Date.now()
    });
  }

  // Public methods for monitoring
  public getStats() {
    return {
      activeConnections: this.wss.clients.size,
      activeSessions: this.sessions.size,
      totalSessions: this.userSessions.size
    };
  }

  public getActiveSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      initiatorId: session.initiatorId,
      joinerId: session.joinerId,
      isActive: session.isActive,
      startTime: session.startTime
    }));
  }
}

// Start the server
const server = new TranslationWebSocketServer(8080);

// Export for potential use in other parts of the application
export default server;
>>>>>>> 5886e40123c43fc2ba56868bfe94655deb4d9e53
