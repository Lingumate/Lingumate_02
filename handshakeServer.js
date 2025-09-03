import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store rooms in memory (in production, use a database)
const rooms = new Map();
const connectedUsers = new Map();

// Room cleanup interval (clean up rooms after 30 minutes of inactivity)
const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
setInterval(cleanupRooms, 5 * 60 * 1000); // Check every 5 minutes

// Generate a random 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a unique room ID
function generateRoomId() {
  return crypto.randomBytes(16).toString('hex');
}

// Clean up expired rooms
function cleanupRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      console.log(`🧹 Cleaning up expired room: ${roomId}`);
      rooms.delete(roomId);
    }
  }
}

// Broadcast message to all users in a room
function broadcastToRoom(roomId, message, excludeUserId = null) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`⚠️ Cannot broadcast to room ${roomId} - room not found`);
    return;
  }

  const users = [room.host, room.guest].filter(user => user && user.id !== excludeUserId);
  
  users.forEach(user => {
    if (user && user.id) {
      const userWs = connectedUsers.get(user.id);
      if (userWs && userWs.readyState === 1) { // WebSocket.OPEN = 1
        try {
          userWs.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Error sending message to user ${user.id}:`, error);
        }
      }
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');
  
  let currentUser = null;
  let currentRoomId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message.type);

      switch (message.type) {
        case 'user_info':
          currentUser = message.user;
          connectedUsers.set(currentUser.id, ws);
          console.log(`👤 User connected: ${currentUser.name} (${currentUser.id})`);
          break;

        case 'create_room':
          const room = handleCreateRoom(ws, message.user);
          if (room) currentRoomId = room.id;
          break;

        case 'join_room':
          const joinedRoom = handleJoinRoom(ws, message.pin, message.user);
          if (joinedRoom) currentRoomId = joinedRoom.id;
          break;

        case 'complete_handshake':
          handleCompleteHandshake(message.roomId);
          break;

        case 'send_message':
          handleSendMessage(message.roomId, message.message, currentUser?.id);
          break;

        case 'leave_room':
          handleLeaveRoom(message.roomId, message.userId);
          currentRoomId = null;
          break;

        case 'start_translation_session':
          handleStartTranslationSession(message, currentUser);
          break;

        case 'speech_to_text':
          handleSpeechToText(message, currentUser);
          break;

        case 'translation_request':
          handleTranslationRequest(message, currentUser);
          break;

        case 'audio_transmission':
          handleAudioTransmission(message, currentUser);
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 User disconnected: ${currentUser?.name || 'Unknown'}`);
    
    if (currentUser) {
      // Remove user from connected users first
      connectedUsers.delete(currentUser.id);
      
      // Remove user from room if they were in one
      if (currentRoomId) {
        try {
          handleLeaveRoom(currentRoomId, currentUser.id);
        } catch (error) {
          console.error(`❌ Error handling user leave for ${currentUser.id}:`, error);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle room creation
function handleCreateRoom(ws, user) {
  const roomId = generateRoomId();
  const pin = generatePIN();
  
  const room = {
    id: roomId,
    pin: pin,
    host: user,
    guest: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActivity: Date.now()
  };

  rooms.set(roomId, room);
  
  // Send room creation confirmation
  ws.send(JSON.stringify({
    type: 'room_created',
    room: room
  }));

  console.log(`🏠 Room created: ${roomId} with PIN: ${pin} by ${user.name}`);
  
  return room;
}

// Handle room joining
function handleJoinRoom(ws, pin, user) {
  // Find room by PIN
  let targetRoom = null;
  for (const [roomId, room] of rooms.entries()) {
    if (room.pin === pin) {
      targetRoom = room;
      break;
    }
  }

  if (!targetRoom) {
    ws.send(JSON.stringify({
      type: 'room_not_found'
    }));
    return null;
  }

  // Check if room is full
  if (targetRoom.guest) {
    ws.send(JSON.stringify({
      type: 'room_full'
    }));
    return null;
  }

  // Check if user is already in the room
  if (targetRoom.host.id === user.id) {
    ws.send(JSON.stringify({
      type: 'already_in_room'
    }));
    return null;
  }

  // Add user as guest
  targetRoom.guest = user;
  targetRoom.lastActivity = Date.now();
  rooms.set(targetRoom.id, targetRoom);

  // Update connected users
  connectedUsers.set(user.id, ws);

  // Send join confirmation to guest
  ws.send(JSON.stringify({
    type: 'room_joined',
    room: targetRoom
  }));

  // Notify host that guest joined
  const hostWs = connectedUsers.get(targetRoom.host.id);
  if (hostWs && hostWs.readyState === 1) { // WebSocket.OPEN = 1
    hostWs.send(JSON.stringify({
      type: 'user_joined',
      user: user
    }));
    
    console.log(`🤝 Both users connected - starting handshake for room ${targetRoom.id}`);
    console.log(`👤 Host: ${targetRoom.host.name} (${targetRoom.host.id})`);
    console.log(`👤 Guest: ${targetRoom.guest.name} (${targetRoom.guest.id})`);
    
    // Auto-complete handshake after a short delay
    setTimeout(() => {
      handleCompleteHandshake(targetRoom.id);
    }, 2000);
  } else {
    console.log(`⚠️ Host WebSocket not found or not ready for room ${targetRoom.id}`);
  }

  console.log(`👥 User ${user.name} joined room ${targetRoom.id}`);
  
  return targetRoom;
}

// Handle handshake completion
function handleCompleteHandshake(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`❌ Room not found for handshake completion: ${roomId}`);
    return;
  }

  console.log(`🤝 Completing handshake for room: ${roomId}`);
  console.log(`👥 Room users - Host: ${room.host?.name}, Guest: ${room.guest?.name}`);

  // Notify both users that handshake is complete
  broadcastToRoom(roomId, {
    type: 'handshake_complete',
    roomId: roomId
  });

  console.log(`✅ Handshake completed for room: ${roomId}`);
}

// Handle sending messages
function handleSendMessage(roomId, message, senderId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Update room activity
  room.lastActivity = Date.now();
  rooms.set(roomId, room);

  // Broadcast message to room
  broadcastToRoom(roomId, {
    type: 'chat_message',
    message: message
  }, senderId);

  console.log(`💬 Message sent in room ${roomId} by ${senderId}`);
}

// Handle leaving room
function handleLeaveRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`⚠️ Room ${roomId} not found when user ${userId} tried to leave`);
    return;
  }

  // Remove user from room with proper null checks
  if (room.host && room.host.id === userId) {
    room.host = null;
    console.log(`👋 Host ${userId} left room ${roomId}`);
  } else if (room.guest && room.guest.id === userId) {
    room.guest = null;
    console.log(`👋 Guest ${userId} left room ${roomId}`);
  } else {
    console.log(`⚠️ User ${userId} not found in room ${roomId}`);
    return;
  }

  // If no users left, delete the room
  if (!room.host && !room.guest) {
    rooms.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted - no users left`);
  } else {
    // Update room and notify remaining user
    rooms.set(roomId, room);
    broadcastToRoom(roomId, {
      type: 'user_left',
      userId: userId
    });
    console.log(`👋 User ${userId} left room ${roomId}, room updated`);
  }
}

// Handle start translation session
function handleStartTranslationSession(message, user) {
  const room = rooms.get(message.roomId);
  if (!room) {
    console.log(`❌ Room not found for translation session: ${message.roomId}`);
    return;
  }

  console.log(`🚀 Starting translation session for room: ${message.roomId}`);
  console.log(`👤 User: ${user.name}, Language: ${message.userLanguage}`);

  // Notify both users that translation session is starting
  broadcastToRoom(message.roomId, {
    type: 'translation_session_started',
    roomId: message.roomId,
    userId: user.id,
    userLanguage: message.userLanguage
  });
}

// Handle speech-to-text processing
function handleSpeechToText(message, user) {
  const room = rooms.get(message.roomId);
  if (!room) {
    console.log(`❌ Room not found for STT: ${message.roomId}`);
    return;
  }

  console.log(`🎤 Processing speech-to-text for user: ${user.name}`);
  console.log(`🎤 Source language: ${message.sourceLanguage}`);

  // For now, simulate STT processing
  // In a real implementation, you would send this to a speech-to-text service
  const mockSttResult = message.audioData ? `Speech from ${user.name}` : `Text from ${user.name}`;
  
  // Send STT result back to the sender
  const userWs = connectedUsers.get(user.id);
  if (userWs && userWs.readyState === 1) {
    userWs.send(JSON.stringify({
      type: 'speech_to_text_result',
      text: mockSttResult,
      confidence: 0.95,
      language: message.sourceLanguage,
      timestamp: Date.now()
    }));
  }

  // Broadcast to other user in the room for translation
  broadcastToRoom(message.roomId, {
    type: 'translation_request',
    originalText: mockSttResult,
    originalLanguage: message.sourceLanguage,
    targetLanguage: message.sourceLanguage === 'en' ? 'es' : 'en', // Simple language switching
    senderId: user.id,
    senderName: user.name,
    timestamp: Date.now()
  }, user.id);
}

// Handle translation request
function handleTranslationRequest(message, user) {
  const room = rooms.get(message.roomId);
  if (!room) {
    console.log(`❌ Room not found for translation: ${message.roomId}`);
    return;
  }

  console.log(`🌐 Processing translation request from: ${user.name}`);
  console.log(`🌐 Original: "${message.originalText}" (${message.originalLanguage})`);
  console.log(`🌐 Target: ${message.targetLanguage}`);

  // For now, simulate translation
  // In a real implementation, you would send this to a translation service
  const mockTranslation = message.originalLanguage === 'en' ? 
    'Hola desde ' + user.name : 
    'Hello from ' + user.name;

  // Send translation result to both users
  broadcastToRoom(message.roomId, {
    type: 'translation_result',
    messageId: `msg_${Date.now()}`,
    senderId: user.id,
    senderName: user.name,
    originalText: message.originalText,
    translatedText: mockTranslation,
    originalLanguage: message.originalLanguage,
    targetLanguage: message.targetLanguage,
    sttConfidence: 0.95,
    translationConfidence: 0.9,
    timestamp: Date.now()
  });
}

// Handle audio transmission for real-time audio
function handleAudioTransmission(message, user) {
  const room = rooms.get(message.roomId);
  if (!room) {
    console.log(`❌ Room not found for audio transmission: ${message.roomId}`);
    return;
  }

  console.log(`🔊 Audio transmission from: ${user.name}`);

  // Broadcast audio to other user in the room
  broadcastToRoom(message.roomId, {
    type: 'audio_received',
    senderId: user.id,
    senderName: user.name,
    audioData: message.audioData,
    language: message.language,
    timestamp: Date.now()
  }, user.id);
}

// Start server
const PORT = process.env.HANDSHAKE_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Handshake WebSocket server running on port ${PORT}`);
  console.log(`📊 Active rooms: ${rooms.size}`);
  console.log(`👥 Connected users: ${connectedUsers.size}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down handshake server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Handshake server stopped');
      process.exit(0);
    });
  });
});

export { wss, rooms, connectedUsers };
