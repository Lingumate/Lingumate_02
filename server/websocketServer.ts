
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
        isActive: true,
        startTime: new Date(),
      };
      
      this.sessions.set(session_id, session);
      this.userSessions.set(user_id, session_id);
      
      console.log(`✅ New session created: ${session_id} by user: ${user_id}`);
      this.sendSuccess(ws, 'Session initialized successfully');
    } else {
      // Join existing session
      if (session.joinerId) {
        this.sendError(ws, 'Session is full');
        return;
      }
      
      session.joinerId = user_id;
      session.joinerSocket = ws;
      this.userSessions.set(user_id, session_id);
      
      console.log(`✅ User ${user_id} joined session: ${session_id}`);
      this.sendSuccess(ws, 'Joined session successfully');
      
      // Notify initiator
      if (session.initiatorSocket) {
        this.sendSuccess(session.initiatorSocket, `User ${user_id} joined the session`);
      }
    }
  }

  private handleTranslationMessage(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, user_id, encrypted_message } = message;
    const session = this.sessions.get(session_id);
    
    if (!session || !session.isActive) {
      this.sendError(ws, 'Invalid or inactive session');
      return;
    }
    
    if (!encrypted_message) {
      this.sendError(ws, 'No message content provided');
      return;
    }
    
    // Forward message to the other user in the session
    const targetSocket = user_id === session.initiatorId 
      ? session.joinerSocket 
      : session.initiatorSocket;
    
    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
      const forwardMessage = {
        type: 'translation_message',
        session_id: session_id,
        user_id: user_id,
        encrypted_message: encrypted_message,
        timestamp: Date.now(),
      };
      
      targetSocket.send(JSON.stringify(forwardMessage));
      console.log(`📤 Message forwarded from ${user_id} in session ${session_id}`);
    } else {
      this.sendError(ws, 'Other user is not connected');
    }
  }

  private handleHeartbeat(ws: WebSocket, message: WebSocketMessage) {
    // Send heartbeat response
    const response = {
      type: 'heartbeat',
      session_id: message.session_id,
      user_id: message.user_id,
      timestamp: Date.now(),
    };
    
    ws.send(JSON.stringify(response));
  }

  private handleEndSession(ws: WebSocket, message: WebSocketMessage) {
    const { session_id, user_id } = message;
    const session = this.sessions.get(session_id);
    
    if (!session) {
      this.sendError(ws, 'Session not found');
      return;
    }
    
    // End the session
    session.isActive = false;
    
    // Notify both users
    if (session.initiatorSocket && session.initiatorSocket.readyState === WebSocket.OPEN) {
      session.initiatorSocket.send(JSON.stringify({
        type: 'end_session',
        session_id: session_id,
        timestamp: Date.now(),
      }));
    }
    
    if (session.joinerSocket && session.joinerSocket.readyState === WebSocket.OPEN) {
      session.joinerSocket.send(JSON.stringify({
        type: 'end_session',
        session_id: session_id,
        timestamp: Date.now(),
      }));
    }
    
    // Clean up
    this.sessions.delete(session_id);
    this.userSessions.delete(session.initiatorId);
    if (session.joinerId) {
      this.userSessions.delete(session.joinerId);
    }
    
    console.log(`🔚 Session ended: ${session_id}`);
  }

  private handleDisconnection(ws: WebSocket) {
    // Find and clean up the session
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.initiatorSocket === ws || session.joinerSocket === ws) {
        this.endSession(sessionId);
        break;
      }
    }
  }

  private endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.isActive = false;
    
    // Notify other user
    const otherSocket = session.initiatorSocket 
      ? session.joinerSocket 
      : session.initiatorSocket;
    
    if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
      otherSocket.send(JSON.stringify({
        type: 'end_session',
        session_id: sessionId,
        timestamp: Date.now(),
      }));
    }
    
    // Clean up
    this.sessions.delete(sessionId);
    this.userSessions.delete(session.initiatorId);
    if (session.joinerId) {
      this.userSessions.delete(session.joinerId);
    }
    
    console.log(`🔚 Session ended due to disconnection: ${sessionId}`);
  }

  private cleanupInactiveSessions() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.startTime.getTime() > inactiveThreshold) {
        this.endSession(sessionId);
      }
    }
  }

  private sendSuccess(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({
      type: 'success',
      message,
      timestamp: Date.now(),
    }));
  }

  private sendError(ws: WebSocket, error: string) {
    ws.send(JSON.stringify({
      type: 'error',
      error,
      timestamp: Date.now(),
    }));
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  public getConnectedUsersCount(): number {
    return this.userSessions.size;
  }
}

// Create and export server instance
const server = new TranslationWebSocketServer(8080);

export default server;

