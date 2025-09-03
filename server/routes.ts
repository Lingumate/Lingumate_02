import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { translationService } from "./services/translation";
import { authService } from "./services/auth";
import { languageConversionService } from "./services/languageConversion";
import { conversationalAIService } from "./services/conversationalAI";
import { priceComparisonService } from "./services/priceComparison";
import { webSearchService } from "./services/webSearch";
import { ModelManager } from "./services/modelManager";
import { authenticateFirebaseToken, type AuthenticatedRequest } from "./middleware/firebaseAuth";
import modelRoutes from "./routes/modelRoutes";
import emergencyRoutes from "./routes/emergencyRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import testRoutes from "./routes/test";
import { z } from "zod";
import { 
  insertConversationSchema, 
  insertMessageSchema, 
  signupSchema,
  loginSchema,
  googleAuthSchema,
  languageConversionSchema,
  chatAgentSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize model manager
  await ModelManager.initialize();
  
  // ==================== MODEL MANAGEMENT ROUTES ====================
  app.use('/api', modelRoutes);
  
  // ==================== EMERGENCY CONTACTS ROUTES ====================
  app.use('/api', emergencyRoutes);
  
  // ==================== SUBSCRIPTION ROUTES ====================
  app.use('/api/subscription', subscriptionRoutes);
  
  // ==================== TEST ROUTES ====================
  app.use('/api', testRoutes);
  
  // ==================== AUTHENTICATION ROUTES ====================
  
  // Sign up with email/password
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = signupSchema.parse(req.body);
      
      const result = await authService.signup(email, password, firstName, lastName);
      
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create user' });
    }
  });

  // Login with email/password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const result = await authService.login(email, password);
      
      res.json({
        message: 'Login successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(401).json({ message: error instanceof Error ? error.message : 'Login failed' });
    }
  });

  // Google OAuth authentication
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);
      
      const result = await authService.authenticateWithGoogle(idToken);
      
      res.json({
        message: 'Google authentication successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("Google auth error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(401).json({ message: error instanceof Error ? error.message : 'Google authentication failed' });
    }
  });

  // Get current user
  app.get('/api/auth/user', authenticateFirebaseToken, async (req, res) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const user = await authService.getUserById(authenticatedReq.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==================== WEB SEARCH ROUTES ====================
  
  // Perform web search for current information
  app.post('/api/web-search', authenticateFirebaseToken, async (req, res) => {
    try {
      const { query, maxResults = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const result = await webSearchService.searchWeb(query, maxResults);
      
      res.json(result);
    } catch (error) {
      console.error("Web search error:", error);
      res.status(500).json({ message: "Failed to perform web search" });
    }
  });

  // Search for news and current events
  app.post('/api/web-search/news', authenticateFirebaseToken, async (req, res) => {
    try {
      const { query, maxResults = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await webSearchService.searchNews(query, maxResults);
      
      res.json({ query, results, lastUpdated: new Date() });
    } catch (error) {
      console.error("News search error:", error);
      res.status(500).json({ message: "Failed to search for news" });
    }
  });

  // Search for factual information
  app.post('/api/web-search/facts', authenticateFirebaseToken, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await webSearchService.searchFacts(query);
      
      res.json({ query, results, lastUpdated: new Date() });
    } catch (error) {
      console.error("Fact search error:", error);
      res.status(500).json({ message: "Failed to search for facts" });
    }
  });

  // ==================== PRICE COMPARISON ROUTES ====================
  
  // Get price comparison for a product
  app.post('/api/price-comparison', authenticateFirebaseToken, async (req, res) => {
    try {
      const { product, location, currency = 'USD' } = req.body;
      
      if (!product) {
        return res.status(400).json({ message: "Product name is required" });
      }

      const result = await priceComparisonService.getPriceComparison(product, location, currency);
      
      res.json(result);
    } catch (error) {
      console.error("Price comparison error:", error);
      res.status(500).json({ message: "Failed to get price comparison" });
    }
  });

  // Get price history for a product
  app.get('/api/price-history/:product', authenticateFirebaseToken, async (req, res) => {
    try {
      const { product } = req.params;
      const { days = '30' } = req.query;
      
      const history = await priceComparisonService.getPriceHistory(product, parseInt(days as string));
      
      res.json(history);
    } catch (error) {
      console.error("Price history error:", error);
      res.status(500).json({ message: "Failed to get price history" });
    }
  });

  // ==================== LANGUAGE CONVERSION ROUTES ====================
  
  // Convert speech to speech (complete pipeline)
  app.post('/api/convert-language', authenticateFirebaseToken, upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const { targetLanguage, sourceLanguage } = req.body;
      if (!targetLanguage) {
        return res.status(400).json({ message: "Target language is required" });
      }

      const result = await languageConversionService.convertSpeechToSpeech(
        req.file.buffer,
        targetLanguage,
        sourceLanguage || undefined
      );

      res.json({
        originalText: result.originalText,
        translatedText: result.translatedText,
        originalLanguage: result.originalLanguage,
        targetLanguage: result.targetLanguage,
        audioData: result.audioBuffer?.toString('base64'),
      });
    } catch (error) {
      console.error("Language conversion error:", error);
      res.status(500).json({ message: "Failed to convert language" });
    }
  });

  // ==================== AI CHAT ROUTES ====================
  
  // Chat agent endpoint
  app.post('/api/chat-agent', authenticateFirebaseToken, async (req, res) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const { message, location, language } = chatAgentSchema.parse(req.body);
      
      const messages = [{ role: 'user' as const, content: message }];
      const response = await conversationalAIService.chatWithAssistant(
        messages,
        location,
        language
      );
      
      res.json({ response: response.response });
    } catch (error) {
      console.error("Chat agent error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // ==================== EXISTING ROUTES (UPDATED) ====================
  
  // Conversation routes
  app.post('/api/conversations', authenticateFirebaseToken, async (req, res) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const data = insertConversationSchema.parse({
        ...req.body,
        user1Id: authenticatedReq.user!.id,
      });
      
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id', authenticateFirebaseToken, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', authenticateFirebaseToken, async (req, res) => {
    try {
      const messages = await storage.getConversationMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', authenticateFirebaseToken, async (req, res) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const data = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
        senderId: authenticatedReq.user!.id,
      });
      
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // ==================== WEBSOCKET SETUP ====================
  
  const server = createServer(app);
  const wss = new WebSocketServer({ 
    server,
    // Add error handling to prevent WebSocket frame errors
    handleProtocols: () => 'websocket',
    perMessageDeflate: false, // Disable compression to avoid frame issues
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    
    // Add error handling for the WebSocket connection
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    ws.on('close', (code, reason) => {
      console.log('WebSocket connection closed:', code, reason?.toString());
    });
    
    // Send a welcome message
    ws.send(JSON.stringify({ 
      type: 'connection_established',
      message: 'WebSocket connection ready for translation',
      timestamp: new Date().toISOString()
    }));
    
    console.log('✅ WebSocket connection established and welcome message sent');
    
    let currentSession: {
      sessionId: string;
      user1Language: string;
      user2Language: string;
    } | null = null;

    ws.on('message', async (message: WebSocket.Data) => {
      try {
        console.log('📨 Raw WebSocket message received, type:', typeof message);
        
        // Convert message to string if it's a Buffer
        let messageString: string;
        if (Buffer.isBuffer(message)) {
          messageString = message.toString('utf8');
          console.log('📨 Converted Buffer to string:', messageString.substring(0, 100) + '...');
        } else if (typeof message === 'string') {
          messageString = message;
          console.log('📨 Message is already string:', messageString.substring(0, 100) + '...');
        } else {
          console.error('❌ Invalid message format received:', typeof message);
          console.error('❌ Message object:', message);
          return;
        }
        
        // Parse JSON message
        let data: any;
        try {
          data = JSON.parse(messageString);
          console.log('✅ WebSocket message parsed successfully:', data.type);
          console.log('📋 Message data:', JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error('❌ Failed to parse WebSocket message as JSON:', parseError);
          console.error('❌ Raw message:', messageString);
          return;
        }
        
        // Validate message has required fields
        if (!data || !data.type) {
          console.error('❌ Invalid message format: missing type field');
          console.error('❌ Message data:', data);
          return;
        }
        
        console.log('🔍 Processing message type:', data.type);
        console.log('🔍 Type comparison test:', {
          isStartConversation: data.type === 'start_conversation',
          isBidirectional: data.type === 'bidirectional_translation',
          isTextTranslation: data.type === 'text_translation'
        });
        
        switch (data.type) {
          case 'start_conversation':
            console.log('🔄 STARTING CONVERSATION...');
            console.log('📋 Session data:', data);
            
            currentSession = {
              sessionId: data.sessionId,
              user1Language: data.user1Language,
              user2Language: data.user2Language,
            };
            
            console.log('✅ Session created:', currentSession);
            
            ws.send(JSON.stringify({ 
              type: 'conversation_started',
              sessionId: data.sessionId,
              message: 'Conversation started successfully'
            }));
            break;
            
          case 'bidirectional_translation':
            // Validate required fields for bidirectional translation
            if (!data.text || !data.sourceLanguage || !data.targetLanguage || !data.senderId) {
              console.error('❌ Invalid bidirectional_translation message: missing required fields');
              console.error('❌ Required: text, sourceLanguage, targetLanguage, senderId');
              console.error('❌ Received:', { text: data.text, sourceLanguage: data.sourceLanguage, targetLanguage: data.targetLanguage, senderId: data.senderId });
              return;
            }
            
            console.log('🔄 BIDIRECTIONAL TRANSLATION PIPELINE STARTING...');
            console.log('📝 Text from speech recognition:', data.text);
            console.log('🌍 Translation: From', data.sourceLanguage, 'To', data.targetLanguage);
            console.log('👤 Sender ID:', data.senderId);
            console.log('🔗 Session ID:', data.sessionId);
            console.log('🔄 Translation Mode:', data.translationMode);
            
            try {
              console.log('🎯 Calling Google Gemini 1.5 Flash for bidirectional translation...');
              
              // Process bidirectional text translation using translation service
              const translationResult = await translationService.translateTextToVoice(
                data.text,
                data.targetLanguage,
                data.sourceLanguage
              );
              
              console.log('🎉 BIDIRECTIONAL TRANSLATION PIPELINE COMPLETED!');
              console.log('📄 Original text (L1):', translationResult.originalText);
              console.log('🌐 Translated text (L2):', translationResult.translatedText);
              console.log('🌍 From language:', translationResult.originalLanguage);
              console.log('🌍 To language:', translationResult.targetLanguage);
              
              // Send bidirectional translation result back
              const responseData = {
                type: 'bidirectional_translation_result',
                data: {
                  originalText: translationResult.originalText,
                  translatedText: translationResult.translatedText,
                  originalLanguage: translationResult.originalLanguage,
                  targetLanguage: translationResult.targetLanguage,
                  confidence: 0.95,
                  senderId: data.senderId,
                  audioData: translationResult.audioBuffer?.toString('base64'),
                  translationMode: 'bidirectional'
                }
              };
              
              console.log('📤 Sending bidirectional translated text to client...');
              ws.send(JSON.stringify(responseData));
              
            } catch (error) {
              console.error('❌ Bidirectional translation pipeline error:', error);
              console.error('❌ Error details:', error instanceof Error ? error.stack : 'Unknown error');
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: error instanceof Error ? error.message : 'Bidirectional translation pipeline failed' 
              }));
            }
            break;
            
          case 'text_translation':
            // Validate required fields for text translation
            if (!data.text || !data.sourceLanguage || !data.targetLanguage) {
              console.error('❌ Invalid text_translation message: missing required fields');
              console.error('❌ Required: text, sourceLanguage, targetLanguage');
              console.error('❌ Received:', { text: data.text, sourceLanguage: data.sourceLanguage, targetLanguage: data.targetLanguage });
              return;
            }
            
            console.log('🔄 TRANSLATION PIPELINE STARTING...');
            console.log('📝 Text from speech recognition:', data.text);
            console.log('🌍 Translation: From', data.sourceLanguage, 'To', data.targetLanguage);
            console.log('👤 Sender ID:', data.senderId);
            console.log('🔗 Session ID:', data.sessionId);
            
            try {
              console.log('🎯 Calling Google Gemini 1.5 Flash for translation...');
              
              // Process text translation using translation service
              const translationResult = await translationService.translateTextToVoice(
                data.text,
                data.targetLanguage,
                data.sourceLanguage
              );
              
              console.log('🎉 TRANSLATION PIPELINE COMPLETED!');
              console.log('📄 Original text (L1):', translationResult.originalText);
              console.log('🌐 Translated text (L2):', translationResult.translatedText);
              console.log('🌍 From language:', translationResult.originalLanguage);
              console.log('🌍 To language:', translationResult.targetLanguage);
              
              // Send text translation result back
              const responseData = {
                type: 'text_translation_result',
                data: {
                  originalText: translationResult.originalText,
                  translatedText: translationResult.translatedText,
                  originalLanguage: translationResult.originalLanguage,
                  targetLanguage: translationResult.targetLanguage,
                  confidence: 0.95,
                  senderId: data.senderId,
                }
              };
              
              console.log('📤 Sending translated text to client...');
              ws.send(JSON.stringify(responseData));
              
            } catch (error) {
              console.error('❌ Translation pipeline error:', error);
              console.error('❌ Error details:', error instanceof Error ? error.stack : 'Unknown error');
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: error instanceof Error ? error.message : 'Translation pipeline failed' 
              }));
            }
            break;
            
          case 'speech_to_text':
            console.log('🎤 SPEECH-TO-TEXT: Processing audio for text conversion...');
            console.log('🎤 Audio data length:', data.audioData?.length || 0);
            console.log('🎤 Source language:', data.sourceLanguage);
            
            try {
              // Convert base64 audio to buffer
              const audioBuffer = Buffer.from(data.audioData, 'base64');
              
              // Process speech-to-text using translation service
              const sttResult = await translationService.translateVoiceToVoice(
                audioBuffer,
                data.sourceLanguage, // Use source language as target for STT
                data.sourceLanguage,
                undefined // No transcribed text
              );
              
              console.log('✅ SPEECH-TO-TEXT completed');
              console.log('📄 Extracted text:', sttResult.originalText);
              
              // Send speech-to-text result back
              ws.send(JSON.stringify({
                type: 'speech_to_text_result',
                data: {
                  originalText: sttResult.originalText,
                  detectedLanguage: sttResult.originalLanguage,
                  confidence: 0.95,
                  senderId: data.senderId,
                }
              }));
            } catch (error) {
              console.error('❌ Speech-to-text error:', error);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: error instanceof Error ? error.message : 'Speech-to-text failed' 
              }));
            }
            break;
            
          case 'voice_translation':
            if (!currentSession) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'No active conversation session' 
              }));
              return;
            }
            
            try {
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Processing voice translation request');
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Session ID:', currentSession.sessionId);
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Sender ID:', data.senderId);
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Audio data length:', data.audioData?.length || 0);
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Translation mode:', data.translationMode || 'standard');
              
              // Convert base64 audio to buffer
              const audioBuffer = Buffer.from(data.audioData, 'base64');
              
              // Bi-directional translation logic
              let targetLanguage, sourceLanguage;
              
              if (data.translationMode === 'bidirectional') {
                // Use the explicit language parameters from the client
                targetLanguage = data.targetLanguage;
                sourceLanguage = data.sourceLanguage;
                
                console.log('🎤 BI-DIRECTIONAL TRANSLATION: Using explicit language mapping');
                console.log('🎤 BI-DIRECTIONAL TRANSLATION: User language:', data.userLanguage);
                console.log('🎤 BI-DIRECTIONAL TRANSLATION: Peer language:', data.peerLanguage);
                console.log('🎤 BI-DIRECTIONAL TRANSLATION: Source → Target:', `${sourceLanguage} → ${targetLanguage}`);
              } else {
                // Fallback to session-based language determination
                targetLanguage = data.senderId === 1 
                  ? currentSession.user2Language 
                  : currentSession.user1Language;
                
                sourceLanguage = data.senderId === 1 
                  ? currentSession.user1Language 
                  : currentSession.user2Language;
                
                console.log('🎤 BI-DIRECTIONAL TRANSLATION: Using session-based language mapping');
              }
              
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Final source language:', sourceLanguage);
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Final target language:', targetLanguage);
              
              // Process bi-directional voice translation
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Starting translation pipeline...');
              const result = await translationService.translateVoiceToVoice(
                audioBuffer,
                targetLanguage,
                sourceLanguage,
                data.transcribedText
              );
              
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Translation completed successfully');
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Original text:', result.originalText);
              console.log('🎤 BI-DIRECTIONAL TRANSLATION: Translated text:', result.translatedText);
              
              // Send bi-directional translation result back
              ws.send(JSON.stringify({
                type: 'translation_result',
                data: {
                  originalText: result.originalText,
                  translatedText: result.translatedText,
                  originalLanguage: result.originalLanguage,
                  targetLanguage: result.targetLanguage,
                  audioData: result.audioBuffer?.toString('base64'),
                  senderId: data.senderId,
                  latency: result.latency,
                  sttConfidence: 0.95, // High confidence for bi-directional translation
                  translationConfidence: 0.92, // High confidence for bi-directional translation
                }
              }));
            } catch (error) {
              console.error('❌ Bi-directional translation error:', error);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: error instanceof Error ? error.message : 'Bi-directional translation failed' 
              }));
            }
            break;
            
          default:
            console.log('Unknown message type received:', data.type);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: `Unknown message type: ${data.type}` 
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      currentSession = null;
    });
  });

  return server;
}
