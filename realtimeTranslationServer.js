
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

// Create HTTP server for real-time translation
const server = http.createServer();

// Create WebSocket server for real-time translation
const wss = new WebSocketServer({ server });

// Store active translation sessions
const translationSessions = new Map();
const connectedUsers = new Map(); // user_id -> WebSocket
const userData = new Map(); // user_id -> user object

// Session cleanup interval (clean up sessions after 30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
setInterval(cleanupSessions, 5 * 60 * 1000); // Check every 5 minutes

// Generate a unique session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Clean up expired sessions
function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of translationSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`🧹 Cleaning up expired translation session: ${sessionId}`);
      translationSessions.delete(sessionId);
    }
  }
}

// Broadcast message to both users in a translation session
function broadcastToSession(sessionId, message, excludeUserId = null) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`⚠️ Cannot broadcast to session ${sessionId} - session not found`);
    return;
  }

  const users = [session.user1, session.user2].filter(user => user && user.id !== excludeUserId);
  
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

// Handle WebSocket connections for real-time translation
wss.on('connection', (ws, req) => {
  console.log('🔌 New real-time translation WebSocket connection');
  
  let currentUser = null;
  let currentSessionId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received real-time translation message:', message.type);

      switch (message.type) {
        case 'init_translation_session':
          const session = handleInitTranslationSession(ws, message);
          if (session) {
            currentSessionId = session.id;
            currentUser = message.user; // Set current user
          }
          break;

        case 'join_translation_session':
          const joinedSession = handleJoinTranslationSession(ws, message);
          if (joinedSession) currentSessionId = joinedSession.id;
          break;

        case 'speech_input':
          handleSpeechInput(message, currentUser);
          break;

        case 'text_translation':
          // Get user from userData if currentUser is null
          const userForTranslation = currentUser || userData.get(message.senderId);
          if (userForTranslation) {
            handleTextTranslation(message, userForTranslation);
          } else {
            console.log(`❌ User not found for translation: ${message.senderId}`);
            console.log(`📊 Available users:`, Array.from(userData.keys()));
          }
          break;

        case 'translation_result':
          handleTranslationResult(message, currentUser);
          break;

        case 'audio_playback':
          handleAudioPlayback(message, currentUser);
          break;

        case 'end_translation_session':
          handleEndTranslationSession(message.sessionId);
          currentSessionId = null;
          break;

        case 'heartbeat':
          handleHeartbeat(ws, message);
          break;

        default:
          console.log('❓ Unknown real-time translation message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing real-time translation message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 User disconnected from real-time translation: ${currentUser?.name || 'Unknown'}`);
    
    if (currentUser) {
      // Remove user from connected users and user data
      connectedUsers.delete(currentUser.id);
      userData.delete(currentUser.id);
      
      // Remove user from session if they were in one
      if (currentSessionId) {
        try {
          handleUserDisconnect(currentSessionId, currentUser.id);
        } catch (error) {
          console.error(`❌ Error handling user disconnect for ${currentUser.id}:`, error);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Real-time translation WebSocket error:', error);
  });
});

// Handle initialization of translation session
function handleInitTranslationSession(ws, message) {
  const sessionId = message.sessionId || generateSessionId();
  const user = message.user;
  
  let session = translationSessions.get(sessionId);
  
  if (!session) {
    // Create new session
    session = {
      id: sessionId,
      user1: user,
      user2: null,
      user1Language: message.user1Language,
      user2Language: message.user2Language,
      isActive: false,
      createdAt: new Date().toISOString(),
      lastActivity: Date.now(),
      messages: [],
      currentSpeaker: null
    };
    
    translationSessions.set(sessionId, session);
    console.log(`🏠 Real-time translation session created: ${sessionId} by ${user.name}`);
  } else {
    // Join existing session
    if (!session.user2) {
      session.user2 = user;
      session.isActive = true;
      session.lastActivity = Date.now();
      translationSessions.set(sessionId, session);
      
      console.log(`🤝 User ${user.name} joined existing translation session: ${sessionId}`);
      
      // Notify both users that session is active
      broadcastToSession(sessionId, {
        type: 'translation_session_active',
        sessionId: sessionId,
        user1: session.user1,
        user2: session.user2,
        user1Language: session.user1Language,
        user2Language: session.user2Language
      });
    } else {
      console.log(`❌ Session ${sessionId} is full, cannot join`);
      ws.send(JSON.stringify({
        type: 'session_full',
        message: 'Translation session is full'
      }));
      return null;
    }
  }
  
  connectedUsers.set(user.id, ws);
  userData.set(user.id, user);
  
  // Send session confirmation
  ws.send(JSON.stringify({
    type: 'translation_session_created',
    sessionId: sessionId,
    user: user,
    isActive: session.isActive
  }));

  console.log(`🌍 Languages: ${session.user1Language} ↔ ${session.user2Language}`);
  console.log(`📊 Session status: user1=${!!session.user1}, user2=${!!session.user2}, isActive=${session.isActive}`);
  console.log(`👥 Connected users: ${connectedUsers.size}, User data: ${userData.size}`);
  
  return session;
}

// Handle joining an existing translation session
function handleJoinTranslationSession(ws, message) {
  const { sessionId, user } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session) {
    ws.send(JSON.stringify({
      type: 'session_not_found',
      message: 'Translation session not found'
    }));
    return null;
  }

  if (session.user2) {
    ws.send(JSON.stringify({
      type: 'session_full',
      message: 'Translation session is full'
    }));
    return null;
  }

  // Add user to session
  session.user2 = user;
  session.isActive = true;
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);
  connectedUsers.set(user.id, ws);
  userData.set(user.id, user);

  // Send join confirmation to guest
  ws.send(JSON.stringify({
    type: 'joined_translation_session',
    sessionId: sessionId,
    session: session
  }));

  // Notify both users that session is active
  broadcastToSession(sessionId, {
    type: 'translation_session_active',
    sessionId: sessionId,
    user1: session.user1,
    user2: session.user2,
    user1Language: session.user1Language,
    user2Language: session.user2Language
  });

  console.log(`🤝 User ${user.name} joined translation session: ${sessionId}`);
  console.log(`👥 Session users - User1: ${session.user1.name} (${session.user1Language}), User2: ${session.user2.name} (${session.user2Language})`);
  
  return session;
}

// Handle speech input from users
function handleSpeechInput(message, user) {
  const { sessionId, audioData, language, isFinal } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for speech input: ${sessionId}`);
    return;
  }

  console.log(`🎤 Speech input from ${user.name} in ${language}`);
  console.log(`🎤 Audio data length: ${audioData ? audioData.length : 0}`);
  console.log(`🎤 Is final: ${isFinal}`);

  // Update session activity
  session.lastActivity = Date.now();
  session.currentSpeaker = user.id;
  translationSessions.set(sessionId, session);

  // For now, simulate speech-to-text processing
  // In a real implementation, you would send this to a speech-to-text service
  const mockTranscribedText = isFinal ? `Speech from ${user.name} in ${language}` : `Interim speech from ${user.name}`;
  
  // Send STT result back to the sender
  const userWs = connectedUsers.get(user.id);
  if (userWs && userWs.readyState === 1) {
    userWs.send(JSON.stringify({
      type: 'speech_to_text_result',
      sessionId: sessionId,
      originalText: mockTranscribedText,
      detectedLanguage: language,
      confidence: isFinal ? 0.95 : 0.7,
      isFinal: isFinal,
      timestamp: Date.now()
    }));
  }

  // If this is final speech, trigger translation
  if (isFinal) {
    // Determine target language for the other user
    const targetLanguage = user.id === session.user1.id ? session.user2Language : session.user1Language;
    
    // Broadcast translation request to both users
    broadcastToSession(sessionId, {
      type: 'translation_request',
      sessionId: sessionId,
      originalText: mockTranscribedText,
      originalLanguage: language,
      targetLanguage: targetLanguage,
      senderId: user.id,
      senderName: user.name,
      timestamp: Date.now()
    });
  }
}

// Handle text translation requests
function handleTextTranslation(message, user) {
  const { sessionId, text, sourceLanguage, targetLanguage } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session) {
    console.log(`❌ Session not found for text translation: ${sessionId}`);
    return;
  }
  
  if (!session.isActive) {
    console.log(`❌ Session not active for text translation: ${sessionId}`);
    console.log(`📊 Session status: user1=${!!session.user1}, user2=${!!session.user2}, isActive=${session.isActive}`);
    return;
  }

  console.log(`🌐 Text translation request from ${user.name} (${user.id})`);
  console.log(`🌐 Text: "${text}"`);
  console.log(`🌐 From ${sourceLanguage} to ${targetLanguage}`);
  console.log(`📊 Session: ${sessionId}, Active: ${session.isActive}`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // For now, simulate translation
  // In a real implementation, you would send this to a translation service
  let mockTranslation;
  if (sourceLanguage === 'en' && targetLanguage === 'es') {
    mockTranslation = `Traducción: ${text}`;
  } else if (sourceLanguage === 'es' && targetLanguage === 'en') {
    mockTranslation = `Translation: ${text}`;
  } else if (sourceLanguage === 'en' && targetLanguage === 'fr') {
    mockTranslation = `Traduction: ${text}`;
  } else if (sourceLanguage === 'fr' && targetLanguage === 'en') {
    mockTranslation = `Translation: ${text}`;
  } else {
    mockTranslation = `[${targetLanguage}]: ${text}`;
  }

  // Create translation message
  const translationMessage = {
    id: `msg_${Date.now()}`,
    sessionId: sessionId,
    senderId: user.id,
    senderName: user.name,
    originalText: text,
    translatedText: mockTranslation,
    originalLanguage: sourceLanguage,
    targetLanguage: targetLanguage,
    timestamp: Date.now()
  };

  // Add to session messages
  session.messages.push(translationMessage);
  translationSessions.set(sessionId, session);

  // Send translation result to both users
  broadcastToSession(sessionId, {
    type: 'translation_result',
    message: translationMessage
  });

  // Generate and send audio for the translated text
  // In a real implementation, you would generate audio using text-to-speech
  setTimeout(() => {
    broadcastToSession(sessionId, {
      type: 'audio_ready',
      sessionId: sessionId,
      messageId: translationMessage.id,
      translatedText: mockTranslation,
      targetLanguage: targetLanguage,
      audioData: null, // In real implementation, this would be the audio buffer
      timestamp: Date.now()
    });
  }, 1000); // Simulate processing delay
}

// Handle translation results
function handleTranslationResult(message, user) {
  const { sessionId, translationData } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for translation result: ${sessionId}`);
    return;
  }

  console.log(`✅ Translation result received from ${user.name}`);
  console.log(`✅ Original: "${translationData.originalText}"`);
  console.log(`✅ Translated: "${translationData.translatedText}"`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // Broadcast translation result to both users
  broadcastToSession(sessionId, {
    type: 'translation_complete',
    sessionId: sessionId,
    translationData: translationData,
    timestamp: Date.now()
  });
}

// Handle audio playback
function handleAudioPlayback(message, user) {
  const { sessionId, messageId, playAudio } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for audio playback: ${sessionId}`);
    return;
  }

  console.log(`🔊 Audio playback request from ${user.name} for message: ${messageId}`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // Notify other user about audio playback
  broadcastToSession(sessionId, {
    type: 'audio_playback_status',
    sessionId: sessionId,
    messageId: messageId,
    playing: playAudio,
    userId: user.id,
    timestamp: Date.now()
  }, user.id);
}

// Handle ending translation session
function handleEndTranslationSession(sessionId) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`❌ Session not found for ending: ${sessionId}`);
    return;
  }

  console.log(`🔚 Ending translation session: ${sessionId}`);

  // Notify both users that session is ending
  broadcastToSession(sessionId, {
    type: 'translation_session_ended',
    sessionId: sessionId,
    timestamp: Date.now()
  });

  // Clean up session
  translationSessions.delete(sessionId);
  
  // Remove users from connected users and user data
  if (session.user1) {
    connectedUsers.delete(session.user1.id);
    userData.delete(session.user1.id);
  }
  if (session.user2) {
    connectedUsers.delete(session.user2.id);
    userData.delete(session.user2.id);
  }
}

// Handle user disconnection
function handleUserDisconnect(sessionId, userId) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`⚠️ Session ${sessionId} not found when user ${userId} disconnected`);
    return;
  }

  // Remove user from session
  if (session.user1 && session.user1.id === userId) {
    session.user1 = null;
    connectedUsers.delete(userId);
    userData.delete(userId);
    console.log(`👋 User1 ${userId} disconnected from session ${sessionId}`);
  } else if (session.user2 && session.user2.id === userId) {
    session.user2 = null;
    connectedUsers.delete(userId);
    userData.delete(userId);
    console.log(`👋 User2 ${userId} disconnected from session ${sessionId}`);
  }

  // If no users left, delete the session
  if (!session.user1 && !session.user2) {
    translationSessions.delete(sessionId);
    console.log(`🗑️ Translation session ${sessionId} deleted - no users left`);
  } else {
    // Update session and notify remaining user
    session.isActive = false;
    translationSessions.set(sessionId, session);
    
    broadcastToSession(sessionId, {
      type: 'user_disconnected',
      sessionId: sessionId,
      userId: userId,
      timestamp: Date.now()
    });
    
    console.log(`👋 User ${userId} disconnected from session ${sessionId}, session updated`);
  }
}

// Handle heartbeat
function handleHeartbeat(ws, message) {
  // Send heartbeat response
  ws.send(JSON.stringify({
    type: 'heartbeat_response',
    sessionId: message.sessionId,
    timestamp: Date.now()
  }));
}

// Start server
const PORT = process.env.REALTIME_TRANSLATION_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Real-time Translation WebSocket server running on port ${PORT}`);
  console.log(`📊 Active translation sessions: ${translationSessions.size}`);
  console.log(`👥 Connected users: ${connectedUsers.size}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down real-time translation server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Real-time translation server stopped');
      process.exit(0);
    });
  });
});

export { wss, translationSessions, connectedUsers };

import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

// Create HTTP server for real-time translation
const server = http.createServer();

// Create WebSocket server for real-time translation
const wss = new WebSocketServer({ server });

// Store active translation sessions
const translationSessions = new Map();
const connectedUsers = new Map(); // user_id -> WebSocket
const userData = new Map(); // user_id -> user object

// Session cleanup interval (clean up sessions after 30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
setInterval(cleanupSessions, 5 * 60 * 1000); // Check every 5 minutes

// Generate a unique session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Clean up expired sessions
function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of translationSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`🧹 Cleaning up expired translation session: ${sessionId}`);
      translationSessions.delete(sessionId);
    }
  }
}

// Broadcast message to both users in a translation session
function broadcastToSession(sessionId, message, excludeUserId = null) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`⚠️ Cannot broadcast to session ${sessionId} - session not found`);
    return;
  }

  const users = [session.user1, session.user2].filter(user => user && user.id !== excludeUserId);
  
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

// Handle WebSocket connections for real-time translation
wss.on('connection', (ws, req) => {
  console.log('🔌 New real-time translation WebSocket connection');
  
  let currentUser = null;
  let currentSessionId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received real-time translation message:', message.type);

      switch (message.type) {
        case 'init_translation_session':
          const session = handleInitTranslationSession(ws, message);
          if (session) {
            currentSessionId = session.id;
            currentUser = message.user; // Set current user
          }
          break;

        case 'join_translation_session':
          const joinedSession = handleJoinTranslationSession(ws, message);
          if (joinedSession) currentSessionId = joinedSession.id;
          break;

        case 'speech_input':
          handleSpeechInput(message, currentUser);
          break;

        case 'text_translation':
          // Get user from userData if currentUser is null
          const userForTranslation = currentUser || userData.get(message.senderId);
          if (userForTranslation) {
            handleTextTranslation(message, userForTranslation);
          } else {
            console.log(`❌ User not found for translation: ${message.senderId}`);
            console.log(`📊 Available users:`, Array.from(userData.keys()));
          }
          break;

        case 'translation_result':
          handleTranslationResult(message, currentUser);
          break;

        case 'audio_playback':
          handleAudioPlayback(message, currentUser);
          break;

        case 'end_translation_session':
          handleEndTranslationSession(message.sessionId);
          currentSessionId = null;
          break;

        case 'heartbeat':
          handleHeartbeat(ws, message);
          break;

        default:
          console.log('❓ Unknown real-time translation message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing real-time translation message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 User disconnected from real-time translation: ${currentUser?.name || 'Unknown'}`);
    
    if (currentUser) {
      // Remove user from connected users and user data
      connectedUsers.delete(currentUser.id);
      userData.delete(currentUser.id);
      
      // Remove user from session if they were in one
      if (currentSessionId) {
        try {
          handleUserDisconnect(currentSessionId, currentUser.id);
        } catch (error) {
          console.error(`❌ Error handling user disconnect for ${currentUser.id}:`, error);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Real-time translation WebSocket error:', error);
  });
});

// Handle initialization of translation session
function handleInitTranslationSession(ws, message) {
  const sessionId = message.sessionId || generateSessionId();
  const user = message.user;
  
  let session = translationSessions.get(sessionId);
  
  if (!session) {
    // Create new session
    session = {
      id: sessionId,
      user1: user,
      user2: null,
      user1Language: message.user1Language,
      user2Language: message.user2Language,
      isActive: false,
      createdAt: new Date().toISOString(),
      lastActivity: Date.now(),
      messages: [],
      currentSpeaker: null
    };
    
    translationSessions.set(sessionId, session);
    console.log(`🏠 Real-time translation session created: ${sessionId} by ${user.name}`);
  } else {
    // Join existing session
    if (!session.user2) {
      session.user2 = user;
      session.isActive = true;
      session.lastActivity = Date.now();
      translationSessions.set(sessionId, session);
      
      console.log(`🤝 User ${user.name} joined existing translation session: ${sessionId}`);
      
      // Notify both users that session is active
      broadcastToSession(sessionId, {
        type: 'translation_session_active',
        sessionId: sessionId,
        user1: session.user1,
        user2: session.user2,
        user1Language: session.user1Language,
        user2Language: session.user2Language
      });
    } else {
      console.log(`❌ Session ${sessionId} is full, cannot join`);
      ws.send(JSON.stringify({
        type: 'session_full',
        message: 'Translation session is full'
      }));
      return null;
    }
  }
  
  connectedUsers.set(user.id, ws);
  userData.set(user.id, user);
  
  // Send session confirmation
  ws.send(JSON.stringify({
    type: 'translation_session_created',
    sessionId: sessionId,
    user: user,
    isActive: session.isActive
  }));

  console.log(`🌍 Languages: ${session.user1Language} ↔ ${session.user2Language}`);
  console.log(`📊 Session status: user1=${!!session.user1}, user2=${!!session.user2}, isActive=${session.isActive}`);
  console.log(`👥 Connected users: ${connectedUsers.size}, User data: ${userData.size}`);
  
  return session;
}

// Handle joining an existing translation session
function handleJoinTranslationSession(ws, message) {
  const { sessionId, user } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session) {
    ws.send(JSON.stringify({
      type: 'session_not_found',
      message: 'Translation session not found'
    }));
    return null;
  }

  if (session.user2) {
    ws.send(JSON.stringify({
      type: 'session_full',
      message: 'Translation session is full'
    }));
    return null;
  }

  // Add user to session
  session.user2 = user;
  session.isActive = true;
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);
  connectedUsers.set(user.id, ws);
  userData.set(user.id, user);

  // Send join confirmation to guest
  ws.send(JSON.stringify({
    type: 'joined_translation_session',
    sessionId: sessionId,
    session: session
  }));

  // Notify both users that session is active
  broadcastToSession(sessionId, {
    type: 'translation_session_active',
    sessionId: sessionId,
    user1: session.user1,
    user2: session.user2,
    user1Language: session.user1Language,
    user2Language: session.user2Language
  });

  console.log(`🤝 User ${user.name} joined translation session: ${sessionId}`);
  console.log(`👥 Session users - User1: ${session.user1.name} (${session.user1Language}), User2: ${session.user2.name} (${session.user2Language})`);
  
  return session;
}

// Handle speech input from users
function handleSpeechInput(message, user) {
  const { sessionId, audioData, language, isFinal } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for speech input: ${sessionId}`);
    return;
  }

  console.log(`🎤 Speech input from ${user.name} in ${language}`);
  console.log(`🎤 Audio data length: ${audioData ? audioData.length : 0}`);
  console.log(`🎤 Is final: ${isFinal}`);

  // Update session activity
  session.lastActivity = Date.now();
  session.currentSpeaker = user.id;
  translationSessions.set(sessionId, session);

  // For now, simulate speech-to-text processing
  // In a real implementation, you would send this to a speech-to-text service
  const mockTranscribedText = isFinal ? `Speech from ${user.name} in ${language}` : `Interim speech from ${user.name}`;
  
  // Send STT result back to the sender
  const userWs = connectedUsers.get(user.id);
  if (userWs && userWs.readyState === 1) {
    userWs.send(JSON.stringify({
      type: 'speech_to_text_result',
      sessionId: sessionId,
      originalText: mockTranscribedText,
      detectedLanguage: language,
      confidence: isFinal ? 0.95 : 0.7,
      isFinal: isFinal,
      timestamp: Date.now()
    }));
  }

  // If this is final speech, trigger translation
  if (isFinal) {
    // Determine target language for the other user
    const targetLanguage = user.id === session.user1.id ? session.user2Language : session.user1Language;
    
    // Broadcast translation request to both users
    broadcastToSession(sessionId, {
      type: 'translation_request',
      sessionId: sessionId,
      originalText: mockTranscribedText,
      originalLanguage: language,
      targetLanguage: targetLanguage,
      senderId: user.id,
      senderName: user.name,
      timestamp: Date.now()
    });
  }
}

// Handle text translation requests
function handleTextTranslation(message, user) {
  const { sessionId, text, sourceLanguage, targetLanguage } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session) {
    console.log(`❌ Session not found for text translation: ${sessionId}`);
    return;
  }
  
  if (!session.isActive) {
    console.log(`❌ Session not active for text translation: ${sessionId}`);
    console.log(`📊 Session status: user1=${!!session.user1}, user2=${!!session.user2}, isActive=${session.isActive}`);
    return;
  }

  console.log(`🌐 Text translation request from ${user.name} (${user.id})`);
  console.log(`🌐 Text: "${text}"`);
  console.log(`🌐 From ${sourceLanguage} to ${targetLanguage}`);
  console.log(`📊 Session: ${sessionId}, Active: ${session.isActive}`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // For now, simulate translation
  // In a real implementation, you would send this to a translation service
  let mockTranslation;
  if (sourceLanguage === 'en' && targetLanguage === 'es') {
    mockTranslation = `Traducción: ${text}`;
  } else if (sourceLanguage === 'es' && targetLanguage === 'en') {
    mockTranslation = `Translation: ${text}`;
  } else if (sourceLanguage === 'en' && targetLanguage === 'fr') {
    mockTranslation = `Traduction: ${text}`;
  } else if (sourceLanguage === 'fr' && targetLanguage === 'en') {
    mockTranslation = `Translation: ${text}`;
  } else {
    mockTranslation = `[${targetLanguage}]: ${text}`;
  }

  // Create translation message
  const translationMessage = {
    id: `msg_${Date.now()}`,
    sessionId: sessionId,
    senderId: user.id,
    senderName: user.name,
    originalText: text,
    translatedText: mockTranslation,
    originalLanguage: sourceLanguage,
    targetLanguage: targetLanguage,
    timestamp: Date.now()
  };

  // Add to session messages
  session.messages.push(translationMessage);
  translationSessions.set(sessionId, session);

  // Send translation result to both users
  broadcastToSession(sessionId, {
    type: 'translation_result',
    message: translationMessage
  });

  // Generate and send audio for the translated text
  // In a real implementation, you would generate audio using text-to-speech
  setTimeout(() => {
    broadcastToSession(sessionId, {
      type: 'audio_ready',
      sessionId: sessionId,
      messageId: translationMessage.id,
      translatedText: mockTranslation,
      targetLanguage: targetLanguage,
      audioData: null, // In real implementation, this would be the audio buffer
      timestamp: Date.now()
    });
  }, 1000); // Simulate processing delay
}

// Handle translation results
function handleTranslationResult(message, user) {
  const { sessionId, translationData } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for translation result: ${sessionId}`);
    return;
  }

  console.log(`✅ Translation result received from ${user.name}`);
  console.log(`✅ Original: "${translationData.originalText}"`);
  console.log(`✅ Translated: "${translationData.translatedText}"`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // Broadcast translation result to both users
  broadcastToSession(sessionId, {
    type: 'translation_complete',
    sessionId: sessionId,
    translationData: translationData,
    timestamp: Date.now()
  });
}

// Handle audio playback
function handleAudioPlayback(message, user) {
  const { sessionId, messageId, playAudio } = message;
  const session = translationSessions.get(sessionId);
  
  if (!session || !session.isActive) {
    console.log(`❌ Session not active for audio playback: ${sessionId}`);
    return;
  }

  console.log(`🔊 Audio playback request from ${user.name} for message: ${messageId}`);

  // Update session activity
  session.lastActivity = Date.now();
  translationSessions.set(sessionId, session);

  // Notify other user about audio playback
  broadcastToSession(sessionId, {
    type: 'audio_playback_status',
    sessionId: sessionId,
    messageId: messageId,
    playing: playAudio,
    userId: user.id,
    timestamp: Date.now()
  }, user.id);
}

// Handle ending translation session
function handleEndTranslationSession(sessionId) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`❌ Session not found for ending: ${sessionId}`);
    return;
  }

  console.log(`🔚 Ending translation session: ${sessionId}`);

  // Notify both users that session is ending
  broadcastToSession(sessionId, {
    type: 'translation_session_ended',
    sessionId: sessionId,
    timestamp: Date.now()
  });

  // Clean up session
  translationSessions.delete(sessionId);
  
  // Remove users from connected users and user data
  if (session.user1) {
    connectedUsers.delete(session.user1.id);
    userData.delete(session.user1.id);
  }
  if (session.user2) {
    connectedUsers.delete(session.user2.id);
    userData.delete(session.user2.id);
  }
}

// Handle user disconnection
function handleUserDisconnect(sessionId, userId) {
  const session = translationSessions.get(sessionId);
  if (!session) {
    console.log(`⚠️ Session ${sessionId} not found when user ${userId} disconnected`);
    return;
  }

  // Remove user from session
  if (session.user1 && session.user1.id === userId) {
    session.user1 = null;
    connectedUsers.delete(userId);
    userData.delete(userId);
    console.log(`👋 User1 ${userId} disconnected from session ${sessionId}`);
  } else if (session.user2 && session.user2.id === userId) {
    session.user2 = null;
    connectedUsers.delete(userId);
    userData.delete(userId);
    console.log(`👋 User2 ${userId} disconnected from session ${sessionId}`);
  }

  // If no users left, delete the session
  if (!session.user1 && !session.user2) {
    translationSessions.delete(sessionId);
    console.log(`🗑️ Translation session ${sessionId} deleted - no users left`);
  } else {
    // Update session and notify remaining user
    session.isActive = false;
    translationSessions.set(sessionId, session);
    
    broadcastToSession(sessionId, {
      type: 'user_disconnected',
      sessionId: sessionId,
      userId: userId,
      timestamp: Date.now()
    });
    
    console.log(`👋 User ${userId} disconnected from session ${sessionId}, session updated`);
  }
}

// Handle heartbeat
function handleHeartbeat(ws, message) {
  // Send heartbeat response
  ws.send(JSON.stringify({
    type: 'heartbeat_response',
    sessionId: message.sessionId,
    timestamp: Date.now()
  }));
}

// Start server
const PORT = process.env.REALTIME_TRANSLATION_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Real-time Translation WebSocket server running on port ${PORT}`);
  console.log(`📊 Active translation sessions: ${translationSessions.size}`);
  console.log(`👥 Connected users: ${connectedUsers.size}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down real-time translation server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Real-time translation server stopped');
      process.exit(0);
    });
  });
});

export { wss, translationSessions, connectedUsers };

