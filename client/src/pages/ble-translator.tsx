import React, { useState, useEffect, useRef } from 'react';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, QrCode, QrCodeIcon, Users, Mic, MicOff, Volume2, VolumeX, Settings, Signal, Wifi, WifiOff, User, UserCheck, UserX, MessageCircle, Phone, PhoneOff, Headphones, HeadphonesIcon, Copy, Check, RefreshCw, Lock, Shield, Key, Eye, EyeOff, X, ArrowLeftRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useWebSocket } from '@/hooks/useWebSocket';
import QRCodeScanner from '@/components/QRCodeScanner';

// QR Code generation library
import QRCode from 'qrcode';

// Crypto-js for encryption
import CryptoJS from 'crypto-js';

// Translation Session Interface
interface TranslationSession {
  sessionId: string;
  sessionKey: string;
  initiatorId: string;
  joinerId?: string;
  initiatorLanguage: string;
  joinerLanguage: string;
  isActive: boolean;
  startTime: Date;
  messages: TranslationMessage[];
  connectionStrength: number;
  isEncrypted: boolean;
  pinCode: string; // Added PIN code for handshake
  pinVerified: boolean; // Track PIN verification status
}

// Translation Message Interface
interface TranslationMessage {
  id: string;
  senderId: string;
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  timestamp: Date;
  isEncrypted: boolean;
  sttConfidence: number;
  translationConfidence: number;
}

// User Interface
interface User {
  id: string;
  name: string;
  avatar?: string;
  preferredLanguage: string;
  isConnected: boolean;
  isInitiator: boolean;
}

// PIN Handshake Interface
interface PINHandshake {
  pinCode: string;
  isVerified: boolean;
  attempts: number;
  maxAttempts: number;
  lockoutTime: number;
  isLocked: boolean;
}

// Manual Session Entry Interface
interface ManualSessionEntry {
  sessionId: string;
  pinCode: string;
  isVisible: boolean;
}

// Handshake Data Interface (from QR handshake page)
interface HandshakeData {
  roomId: string;
  roomPin: string;
  userId: string;
  userName: string;
  userLanguage: string;
  isHost: boolean;
  handshakeComplete: boolean;
}

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export default function BLETranslator() {
  const { toast } = useToast();
  const { speak, stop: stopSpeech, isSpeaking } = useTextToSpeech();
  const [, setLocation] = useLocation();
  
  // Handshake Data (from QR handshake page)
  const [handshakeData, setHandshakeData] = useState<HandshakeData | null>(null);
  
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('Traveler');
  const [userAvatar, setUserAvatar] = useState('');
  const [userLanguage, setUserLanguage] = useState('en');
  const [speakingLanguage, setSpeakingLanguage] = useState('en');
  const [listeningLanguage, setListeningLanguage] = useState('es');
  
  // Session State
  const [currentSession, setCurrentSession] = useState<TranslationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStrength, setConnectionStrength] = useState(0);
  const [connectedPeer, setConnectedPeer] = useState<User | null>(null);
  
  // QR Code State
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  
  // PIN Handshake State
  const [pinHandshake, setPinHandshake] = useState<PINHandshake>({
    pinCode: '',
    isVerified: false,
    attempts: 0,
    maxAttempts: 3,
    lockoutTime: 0,
    isLocked: false
  });
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [handshakeStep, setHandshakeStep] = useState<'qr' | 'pin' | 'verified'>('qr');
  
  // Manual Session Entry State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSessionEntry, setManualSessionEntry] = useState<ManualSessionEntry>({
    sessionId: '',
    pinCode: '',
    isVisible: false
  });
  
  // WebSocket State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Real-time translation WebSocket
  const [realtimeWebSocket, setRealtimeWebSocket] = useState<WebSocket | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [realtimeLastMessage, setRealtimeLastMessage] = useState<any>(null);
  
  // Real-time Translation State
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [realTimeMessages, setRealTimeMessages] = useState<any[]>([]);
  const [currentSpeakingUser, setCurrentSpeakingUser] = useState<string | null>(null);
  const [audioQueue, setAudioQueue] = useState<any[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<TranslationMessage[]>([]);
  const [isTranslationSessionActive, setIsTranslationSessionActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'recording' | 'stt' | 'translation' | 'tts' | 'complete'>('idle');
  
  // Audio State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [currentAudioData, setCurrentAudioData] = useState<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Web Speech API State (Google-style STT)
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'handshake' | 'session' | 'settings'>('handshake');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages]);

  // Load handshake data on component mount
  useEffect(() => {
    loadHandshakeData();
  }, []);

  // Connect to real-time translation WebSocket when handshake data is loaded
  useEffect(() => {
    if (handshakeData && !realtimeWebSocket) {
      connectToRealtimeTranslation();
    }
  }, [handshakeData, realtimeWebSocket]);

  // Handle WebSocket messages for translation
  useEffect(() => {
    if (realtimeLastMessage) {
      console.log('📨 Processing real-time message:', realtimeLastMessage.type);
      handleTranslationMessage(realtimeLastMessage);
    }
  }, [realtimeLastMessage]);

  // Auto-start translation session when WebSocket connects and session is active
  useEffect(() => {
    if (isRealtimeConnected && isConnected && currentSession && !isTranslationSessionActive) {
      console.log('🔄 Auto-starting translation session...');
      startTranslationSession();
    }
  }, [isRealtimeConnected, isConnected, currentSession, isTranslationSessionActive]);

  // Connect to real-time translation WebSocket
  const connectToRealtimeTranslation = () => {
    if (!handshakeData) return;

    // Try to detect the server IP automatically
    const getServerUrl = () => {
      // For mobile testing, use the computer's IP address
      // For local development, use localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        return 'ws://localhost:3002';
      } else {
        // Use the same hostname as the current page
        const hostname = window.location.hostname;
        return `ws://${hostname}:3002`;
      }
    };
    
    const wsUrl = getServerUrl();
    console.log('🔌 Connecting to real-time translation WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ Real-time translation WebSocket connected');
        setIsRealtimeConnected(true);
        setRealtimeWebSocket(ws);
        
        // Initialize translation session using handshake room ID
        if (handshakeData && currentUser) {
          const sessionData = {
            type: 'init_translation_session',
            user: {
              id: currentUser.id,
              name: currentUser.name,
              preferredLanguage: currentUser.preferredLanguage
            },
            sessionId: handshakeData.roomId, // Use the handshake room ID
            user1Language: speakingLanguage,
            user2Language: listeningLanguage
          };
          
          ws.send(JSON.stringify(sessionData));
          console.log('📤 Sent translation session initialization with room ID:', handshakeData.roomId);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received real-time translation message:', data.type);
          setRealtimeLastMessage(data);
        } catch (parseError) {
          console.error('❌ Failed to parse real-time translation message:', parseError);
        }
      };
      
      ws.onclose = (event) => {
        console.log('❌ Real-time translation WebSocket disconnected:', event.code, event.reason);
        setIsRealtimeConnected(false);
        setRealtimeWebSocket(null);
        
        if (event.code === 1006) {
          toast({
            title: "Real-time Translation Disconnected",
            description: "Connection to translation server was lost. Please check if the real-time translation server is running on port 3002.",
            variant: "destructive",
          });
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ Real-time translation WebSocket error:', error);
        setIsRealtimeConnected(false);
        toast({
          title: "Real-time Translation Connection Error",
          description: `Failed to connect to real-time translation server at ${wsUrl}. Please check if the server is running on port 3002.`,
          variant: "destructive",
        });
      };
      
    } catch (error) {
      console.error('❌ Real-time translation WebSocket connection failed:', error);
      setIsRealtimeConnected(false);
      toast({
        title: "Real-time Translation Connection Failed",
        description: `Could not connect to real-time translation server at ${wsUrl}. Please check if the server is running on port 3002.`,
        variant: "destructive",
      });
    }
  };

  // Load handshake data from sessionStorage
  const loadHandshakeData = () => {
    const storedData = sessionStorage.getItem('translationData');
    if (storedData) {
      try {
        const data: HandshakeData = JSON.parse(storedData);
        setHandshakeData(data);
        
        // Initialize user from handshake data
    const user: User = {
          id: data.userId,
          name: data.userName,
          preferredLanguage: data.userLanguage,
          isConnected: true,
          isInitiator: data.isHost
    };
    setCurrentUser(user);
        setUserName(data.userName);
        setUserLanguage(data.userLanguage);
        
        // Create translation session
        const session: TranslationSession = {
          sessionId: data.roomId,
          sessionKey: `session_${data.roomId}`,
          initiatorId: data.isHost ? data.userId : 'host',
          joinerId: data.isHost ? 'guest' : data.userId,
          initiatorLanguage: data.userLanguage,
          joinerLanguage: data.userLanguage,
          isActive: true,
          startTime: new Date(),
          messages: [],
          connectionStrength: 95,
          isEncrypted: true,
          pinCode: '',
          pinVerified: true
        };
        setCurrentSession(session);
        setIsConnected(true);
        setConnectionStrength(95);
        
        // Create peer user
        const peer: User = {
          id: data.isHost ? 'guest' : 'host',
          name: data.isHost ? 'Guest User' : 'Host User',
          preferredLanguage: data.userLanguage,
          isConnected: true,
          isInitiator: !data.isHost
        };
        setConnectedPeer(peer);
        
        toast({
          title: "Translation Session Ready",
          description: "Handshake completed. Ready to start translation.",
        });
        

      } catch (error) {
        console.error('Error loading handshake data:', error);
        toast({
          title: "Session Error",
          description: "Failed to load session data. Please return to handshake page.",
          variant: "destructive",
        });
      }
    } else {
      // No handshake data - redirect to handshake page
      toast({
        title: "No Session Found",
        description: "Please complete handshake first.",
        variant: "destructive",
      });
      setLocation('/qr-handshake');
    }
  };

  // Initialize Web Speech API (Google-style STT)
  const initializeSpeechRecognition = () => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Web Speech API not supported in this browser');
      toast({
        title: "Browser Not Supported",
        description: "Speech recognition requires Chrome or Edge browser",
        variant: "destructive",
      });
      return false;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Configure recognition settings
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = speakingLanguage;
    
    // Handle results
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        console.log('🎤 SPEECH RECOGNITION COMPLETED!');
        console.log('📄 Final transcript:', finalTranscript);
        console.log('🌍 Language:', speakingLanguage);
        
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
        
        // Send final transcript to server for translation
        console.log('🔄 Sending to translation pipeline...');
        sendTranscriptToServer(finalTranscript);
      } else {
        setInterimTranscript(interimTranscript);
      }
    };
    
    // Handle errors
    recognitionRef.current.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Speech Recognition Error",
        description: event.error,
        variant: "destructive",
      });
    };
    
    // Handle end
    recognitionRef.current.onend = () => {
      console.log('🛑 Speech recognition ended');
      setIsListening(false);
    };
    
    console.log('✅ Web Speech API initialized successfully');
    return true;
  };

  // Send transcript to server
  const sendTranscriptToServer = (text: string) => {
    if (!currentSession || !currentUser) {
      console.error('❌ No session or user available');
      return;
    }
    
    if (!isRealtimeConnected) {
      console.error('❌ WebSocket not connected. Cannot send translation request.');
      toast({
        title: "Connection Error",
        description: "WebSocket not connected. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('📤 Sending transcript for real-time translation:');
    console.log('📝 Text:', text);
    console.log('🌍 From:', speakingLanguage, 'To:', listeningLanguage);
    
    // Send as a text translation request
    if (!handshakeData?.roomId) {
      console.error('❌ No handshake data or room ID available');
      toast({
        title: "Connection Error",
        description: "No active handshake session. Please complete handshake first.",
        variant: "destructive",
      });
      return;
    }

    const messageData = {
      type: 'text_translation',
      text: text,
      sourceLanguage: speakingLanguage,
      targetLanguage: listeningLanguage,
      senderId: currentUser.id,
      sessionId: handshakeData.roomId, // Use handshake room ID
    };
    
    console.log('📤 Sending WebSocket message:', messageData);
    if (realtimeWebSocket && realtimeWebSocket.readyState === WebSocket.OPEN) {
      realtimeWebSocket.send(JSON.stringify(messageData));
    }
    
    // Show toast that translation is starting
    toast({
      title: "🔄 Translating...",
      description: `Converting "${text}" from ${speakingLanguage} to ${listeningLanguage}`,
    });
  };

  // Send speech for real-time translation
  const sendSpeechForTranslation = (text: string, language: string) => {
    if (!currentSession || !currentUser) {
      console.error('❌ No session or user available');
      return;
    }
    
    console.log('📤 Sending speech for real-time translation:', text, language);
    
    // Add to real-time messages
    setRealTimeMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: text,
      language: language,
      sender: currentUser.name,
      timestamp: new Date()
    }]);
    
    // Show toast
    toast({
      title: "Real-time Translation",
      description: `Sent: "${text}"`,
    });
  };

  // Generate a secure 6-digit PIN code
  const generateSecurePIN = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Generate session data for QR code with PIN
  const generateSessionData = () => {
    if (!currentUser) return;

    const sessionId = generateUUID();
    const sessionKey = generateSessionKey();
    const pinCode = generateSecurePIN();
    
    const sessionData = {
      session_id: sessionId,
      session_key: sessionKey,
      user_id: currentUser.id,
      preferred_language: currentUser.preferredLanguage,
      speaking_language: speakingLanguage,
      listening_language: listeningLanguage,
      timestamp: Date.now(),
      pin_code: pinCode, // Include PIN in session data
      pin_hash: CryptoJS.SHA256(pinCode).toString() // Hash the PIN for security
    };

    const session: TranslationSession = {
      sessionId: sessionId,
      sessionKey: sessionKey,
      initiatorId: currentUser.id,
      initiatorLanguage: currentUser.preferredLanguage,
      joinerLanguage: '', // Will be set when joiner connects
      isActive: false,
      startTime: new Date(),
      messages: [],
      connectionStrength: 0,
      isEncrypted: true,
      pinCode: pinCode,
      pinVerified: false
    };

    setCurrentSession(session);
    setIsInitiator(true);
    setPinHandshake(prev => ({ ...prev, pinCode: pinCode }));
    setHandshakeStep('qr');
    
    // Generate QR code
    generateQRCode(JSON.stringify(sessionData));
    
    toast({
      title: "Session Created Successfully!",
      description: "Share the Session ID and PIN with the person you want to connect with",
    });
  };

  // Generate QR code from session data
  const generateQRCode = async (data: string) => {
    try {
      const qrUrl = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeData(data);
      setQrCodeUrl(qrUrl);
      setShowQRCode(true);
    } catch (error) {
      console.error('QR code generation error:', error);
      toast({
        title: "QR Code Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  // Scan QR code and join session
  const scanQRCode = () => {
    setShowScanner(true);
  };

  // Show manual session entry option
  const showManualSessionEntry = () => {
    setShowManualEntry(true);
    setHandshakeStep('pin');
    setShowQRCode(false); // Hide QR code if it's showing
  };

  // Handle successful QR code scan
  const handleQRScanSuccess = (scannedData: string) => {
    try {
      const parsedData = JSON.parse(scannedData);
      setScannedData(scannedData);
      
      // Check if PIN is required
      if (parsedData.pin_code) {
        setShowPinInput(true);
        setHandshakeStep('pin');
        toast({
          title: "PIN Required",
          description: "Enter the PIN code to join the session",
        });
      } else {
        joinSession(parsedData);
      }
      
      setShowScanner(false);
    } catch (error) {
      console.error('Invalid QR code data:', error);
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code does not contain valid session data",
        variant: "destructive",
      });
    }
  };

  // Handle QR scan error
  const handleQRScanError = (error: string) => {
    console.error('QR scan error:', error);
    setShowScanner(false);
  };

  // Verify PIN code
  const verifyPIN = () => {
    if (pinHandshake.isLocked) {
      toast({
        title: "Account Locked",
        description: `Please wait ${pinHandshake.lockoutTime} seconds before trying again`,
        variant: "destructive",
      });
      return;
    }

    try {
      let parsedData;
      
      // Check if we have scanned data (QR code) or manual PIN entry
      if (scannedData) {
        parsedData = JSON.parse(scannedData);
      } else {
        // Manual PIN entry - create a mock session for PIN verification
        // In a real implementation, you might want to validate against a server
        toast({
          title: "Manual PIN Entry",
          description: "Please scan the QR code to get session data, or ask the session creator to share the complete session information.",
          variant: "destructive",
        });
        return;
      }
      
      const inputHash = CryptoJS.SHA256(pinInput).toString();
      
      if (inputHash === parsedData.pin_hash) {
        // PIN verified successfully
        setPinHandshake(prev => ({
          ...prev,
          isVerified: true,
          attempts: 0
        }));
        setHandshakeStep('verified');
        
        toast({
          title: "PIN Verified",
          description: "PIN code is correct. Joining session...",
        });
        
        // Join session after successful PIN verification
        setTimeout(() => {
          joinSession(parsedData);
          setShowPinInput(false);
          setPinInput('');
        }, 1000);
      } else {
        // PIN verification failed
        const newAttempts = pinHandshake.attempts + 1;
        const isLocked = newAttempts >= pinHandshake.maxAttempts;
        const lockoutTime = isLocked ? 30 : 0; // 30 seconds lockout
        
        setPinHandshake(prev => ({
          ...prev,
          attempts: newAttempts,
          isLocked: isLocked,
          lockoutTime: lockoutTime
        }));
        
        setPinInput('');
        
        if (isLocked) {
          toast({
            title: "Account Locked",
            description: "Too many failed attempts. Please wait 30 seconds.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Invalid PIN",
            description: `Incorrect PIN. ${pinHandshake.maxAttempts - newAttempts} attempts remaining.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      toast({
        title: "Verification Error",
        description: "Failed to verify PIN code",
        variant: "destructive",
      });
    }
  };

  // Verify manual session entry
  const verifyManualSession = () => {
    if (pinHandshake.isLocked) {
      toast({
        title: "Account Locked",
        description: `Please wait ${pinHandshake.lockoutTime} seconds before trying again`,
        variant: "destructive",
      });
      return;
    }

    if (!manualSessionEntry.sessionId || !manualSessionEntry.pinCode) {
      toast({
        title: "Missing Information",
        description: "Please enter both Session ID and PIN code",
        variant: "destructive",
      });
      return;
    }

    try {
      // For demo purposes, we'll simulate validation
      // In a real implementation, this would validate against a server or stored session data
      
      // Simulate validation delay
      toast({
        title: "Verifying Session",
        description: "Checking Session ID and PIN...",
      });

      // Simulate validation (in real app, this would check against actual session data)
      setTimeout(() => {
        // For demo: accept any 6-digit PIN with a valid-looking session ID
        const isValidSessionId = manualSessionEntry.sessionId.length >= 8;
        const isValidPIN = manualSessionEntry.pinCode.length === 6 && /^\d{6}$/.test(manualSessionEntry.pinCode);
        
        if (isValidSessionId && isValidPIN) {
          // Success - create session data
          const mockSessionData = {
            session_id: manualSessionEntry.sessionId,
            session_key: generateSessionKey(),
            user_id: 'manual_entry',
            preferred_language: 'en',
            speaking_language: 'en',
            listening_language: 'es',
            timestamp: Date.now(),
            pin_code: manualSessionEntry.pinCode,
            pin_hash: CryptoJS.SHA256(manualSessionEntry.pinCode).toString()
          };

          setPinHandshake(prev => ({
            ...prev,
            isVerified: true,
            attempts: 0
          }));
          setHandshakeStep('verified');
          
          toast({
            title: "Session Verified Successfully!",
            description: "Joining translation session...",
          });
          
          // Join session after successful verification
          setTimeout(() => {
            joinSession(mockSessionData);
            setShowManualEntry(false);
            setManualSessionEntry({
              sessionId: '',
              pinCode: '',
              isVisible: false
            });
          }, 1000);
        } else {
          // Failed validation
          const newAttempts = pinHandshake.attempts + 1;
          const isLocked = newAttempts >= pinHandshake.maxAttempts;
          const lockoutTime = isLocked ? 30 : 0;
          
          setPinHandshake(prev => ({
            ...prev,
            attempts: newAttempts,
            isLocked: isLocked,
            lockoutTime: lockoutTime
          }));
          
          setManualSessionEntry(prev => ({
            ...prev,
            pinCode: ''
          }));
          
          if (isLocked) {
            toast({
              title: "Account Locked",
              description: "Too many failed attempts. Please wait 30 seconds.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Invalid Session Information",
              description: `Incorrect Session ID or PIN. ${pinHandshake.maxAttempts - newAttempts} attempts remaining.`,
              variant: "destructive",
            });
          }
        }
      }, 1500); // Simulate network delay
      
    } catch (error) {
      console.error('Manual session verification error:', error);
      toast({
        title: "Verification Error",
        description: "Failed to verify session information",
        variant: "destructive",
      });
    }
  };

  // Join session from scanned QR code
  const joinSession = (scannedData: any) => {
    if (!currentUser) return;

    const session: TranslationSession = {
      sessionId: scannedData.session_id,
      sessionKey: scannedData.session_key,
      initiatorId: scannedData.user_id,
      joinerId: currentUser.id,
      initiatorLanguage: scannedData.speaking_language || scannedData.preferred_language,
      joinerLanguage: currentUser.preferredLanguage,
      isActive: false,
      startTime: new Date(),
      messages: [],
      connectionStrength: 0,
      isEncrypted: true,
      pinCode: scannedData.pin_code || '',
      pinVerified: pinHandshake.isVerified
    };

    setCurrentSession(session);
    setIsInitiator(false);
    
    // Connect to WebSocket
    connectToWebSocket(session);
    
    toast({
      title: "Session Joined",
      description: "Connecting to translation session...",
    });
  };

  // Connect to WebSocket server
  const connectToWebSocket = (session: TranslationSession) => {
    setIsConnecting(true);
    setConnectionStatus('connecting');

    // In production, use your actual WebSocket server URL
    const wsUrl = 'wss://your-websocket-server.com/realtime';
    
    // For demo purposes, we'll simulate WebSocket connection
    simulateWebSocketConnection(session);
  };





  // Simulate WebSocket connection (for demo)
  const simulateWebSocketConnection = (session: TranslationSession) => {
    setTimeout(() => {
      // Simulate successful connection
      setConnectionStatus('connected');
      setIsConnecting(false);
      setIsConnected(true);
      
      // Simulate peer connection
      const peer: User = {
        id: session.initiatorId,
        name: "Peer User",
        preferredLanguage: session.initiatorLanguage,
        isConnected: true,
        isInitiator: true
      };
      setConnectedPeer(peer);
      
      // Activate session
      setCurrentSession(prev => prev ? { ...prev, isActive: true, connectionStrength: 95 } : null);
      setConnectionStrength(95);
      setActiveTab('session');
      
              // Auto-start translation session after connection
        setTimeout(() => {
          if (isRealtimeConnected && !isTranslationSessionActive) {
            console.log('🔄 Auto-starting translation session after connection...');
            startTranslationSession();
          }
        }, 1000);
      
      toast({
        title: "Connected",
        description: "Translation session is now active",
      });
    }, 1500);
  };

  // Start recording with Web Speech API (Google-style)
  const startRecording = async () => {
    console.log('🎤 Starting Web Speech API recording...');
    
    if (!isConnected || !currentSession) {
      console.error('❌ Not connected or no session');
      toast({
        title: "Not Connected",
        description: "Please establish a session first",
        variant: "destructive",
      });
      return;
    }

    if (!isRealtimeConnected) {
      console.error('❌ WebSocket not connected');
      toast({
        title: "WebSocket Not Connected",
        description: "Please wait for WebSocket to connect",
        variant: "destructive",
      });
      return;
    }



    try {
      // Initialize Web Speech API if not already done
      if (!recognitionRef.current) {
        const success = initializeSpeechRecognition();
        if (!success) return;
      }
      
      // Start listening
      recognitionRef.current.start();
      setIsListening(true);
      setCurrentStep('recording');
      console.log('✅ Web Speech API started successfully');
      
      toast({
        title: "🎤 Listening Started",
        description: "Speak now - your words will appear in real-time (like Google search)",
      });
    } catch (error) {
      console.error('❌ Web Speech API error:', error);
      setIsListening(false);
      toast({
        title: "Speech Recognition Failed",
        description: "Failed to start speech recognition",
        variant: "destructive",
      });
    }
  };

  // Stop recording with Web Speech API
  const stopRecording = () => {
    if (recognitionRef.current && isListening) {
      console.log('🛑 Stopping Web Speech API...');
      recognitionRef.current.stop();
      setIsListening(false);
      
      toast({
        title: "🛑 Listening Stopped",
        description: "Speech recognition stopped",
      });
    } else {
      console.log('⚠️ No active speech recognition to stop');
    }
  };

  // Process audio translation - Bi-directional Translation Pipeline
  const processAudioTranslation = async (audioData: string) => {
    if (!currentSession || !currentUser) return;

    // Auto-start translation session if not active
    if (!isTranslationSessionActive) {
      console.log('🔄 Auto-starting translation session...');
      startTranslationSession();
      // Wait a bit for session to start
      setTimeout(() => {
        processAudioTranslation(audioData);
      }, 1000);
      return;
    }

    setIsTranslating(true);
    setCurrentStep('stt');
    
    try {
      // Extract base64 data from data URI
      const base64Audio = audioData.split(',')[1];
      
      console.log('🎤 STEP 1: Starting Speech-to-Text processing...');
      console.log('🎤 Audio data length:', base64Audio.length);
      console.log('🎤 User speaking in:', speakingLanguage);
      console.log('🎤 Target language:', listeningLanguage);

      // First, send for speech-to-text only (like Google search bar)
      // Note: Real-time translation is handled by sendSpeechForTranslation
      if (isRealTimeActive && handshakeData) {
        sendSpeechForTranslation('Speech detected', speakingLanguage);
      }
      
      toast({
        title: "🎤 Processing Speech",
        description: `Converting your ${speakingLanguage} speech to text (like Google search)...`,
      });
    } catch (error) {
      console.error('❌ Step 1 failed:', error);
      setIsTranslating(false);
      toast({
        title: "Step 1 Failed",
        description: "Speech-to-Text processing failed",
        variant: "destructive",
      });
    }
  };

  // Encrypt message with session key
  const encryptMessage = (message: TranslationMessage, sessionKey: string): string => {
    const messageString = JSON.stringify(message);
    const encrypted = CryptoJS.AES.encrypt(messageString, sessionKey).toString();
    return encrypted;
  };

  // Decrypt message with session key
  const decryptMessage = (encryptedMessage: string, sessionKey: string): TranslationMessage => {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, sessionKey);
    const messageString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(messageString);
  };



  // End session
  const endSession = () => {
    setCurrentSession(null);
    setIsConnected(false);
    setConnectedPeer(null);
    setConnectionStrength(0);
    setSessionMessages([]);
    setActiveTab('handshake');
    setShowQRCode(false);
    setQrCodeData('');
    setQrCodeUrl('');
    setShowPinInput(false);
    setPinInput('');
    setHandshakeStep('qr');
    setPinHandshake({
      pinCode: '',
      isVerified: false,
      attempts: 0,
      maxAttempts: 3,
      lockoutTime: 0,
      isLocked: false
    });
    
    toast({
      title: "Session Ended",
      description: "Translation session has ended",
    });
  };

  // Toggle audio
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioEnabled) {
      stopSpeech();
    }
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    setMicrophoneEnabled(!microphoneEnabled);
  };

  // Copy session data to clipboard
  const copySessionData = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData);
      toast({
        title: "Copied",
        description: "Session data copied to clipboard",
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  // Generate UUID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Generate session key
  const generateSessionKey = (): string => {
    return CryptoJS.lib.WordArray.random(32).toString();
  };

  // Handle translation messages from WebSocket
  const handleTranslationMessage = (message: any) => {
    console.log('Handling translation message:', message.type, message);
    
    switch (message.type) {
      case 'connection_established':
        console.log('Translation WebSocket connection established');
        // Start conversation session when connected
        if (isConnected && currentSession) {
          console.log('🔄 Auto-starting translation session after WebSocket connection...');
          startTranslationSession();
        } else {
          console.log('⚠️ Cannot start translation session: isConnected =', isConnected, 'currentSession =', !!currentSession);
        }
        break;
        
      case 'translation_session_created':
        console.log('✅ Translation session created/joined');
        if (message.isActive) {
          console.log('🎉 Translation session is now active!');
          setIsRealTimeActive(true);
          setIsTranslationSessionActive(true);
          toast({
            title: "Translation Session Active",
            description: "Real-time translation is now ready",
          });
        }
        break;
        
      case 'translation_session_active':
        console.log('🎉 Translation session activated for both users');
        setIsRealTimeActive(true);
        setIsTranslationSessionActive(true);
        toast({
          title: "Translation Session Active",
          description: "Both users are connected and ready for translation",
        });
        break;
        
      case 'conversation_started':
        console.log('🎉 Translation conversation started');
        setIsTranslationSessionActive(true);
        console.log('✅ Translation session is now active');
        console.log('✅ isTranslationSessionActive set to true');
        toast({
          title: "Translation Session Active",
          description: "You can now start recording and translating",
        });
        break;
        
      case 'text_translation_result':
        const textResult = message.data;
        
        console.log('🎉 COMPLETE PIPELINE SUCCESS!');
        console.log('📄 Original text (L1):', textResult.originalText);
        console.log('🌐 Translated text (L2):', textResult.translatedText);
        console.log('🌍 Translation: From', textResult.originalLanguage, 'To', textResult.targetLanguage);
        console.log('🎯 Confidence:', textResult.confidence);
        
        setCurrentStep('complete');
        
        // Create a message showing the translation result
        const newTextMessage: TranslationMessage = {
          id: Date.now().toString(),
          senderId: textResult.senderId?.toString() || currentUser?.id || 'unknown',
          originalText: textResult.originalText,
          translatedText: textResult.translatedText,
          originalLanguage: textResult.originalLanguage,
          targetLanguage: textResult.targetLanguage,
          timestamp: new Date(),
          isEncrypted: true,
          sttConfidence: 1.0, // Direct text input
          translationConfidence: textResult.confidence || 0.95
        };
        
        setSessionMessages(prev => [...prev, newTextMessage]);
        setIsTranslating(false);
        
        // Play translated audio if enabled
        if (audioEnabled) {
          console.log('🔊 Playing translated audio...');
          speak(textResult.translatedText, textResult.targetLanguage);
        }
        
        toast({
          title: "🎉 Translation Complete!",
          description: `"${textResult.originalText}" → "${textResult.translatedText}"`,
        });
        break;
        
      case 'speech_to_text_result':
        const sttResult = message.data;
        
        console.log('✅ SPEECH-TO-TEXT COMPLETED!');
        console.log('📄 Extracted text:', sttResult.originalText);
        console.log('🌍 Detected language:', sttResult.detectedLanguage);
        console.log('🎯 Confidence:', sttResult.confidence);
        
        setCurrentStep('complete');
        
        // Create a message showing just the speech-to-text result
        const newSttMessage: TranslationMessage = {
          id: Date.now().toString(),
          senderId: sttResult.senderId?.toString() || currentUser?.id || 'unknown',
          originalText: sttResult.originalText,
          translatedText: sttResult.originalText, // Same as original for now
          originalLanguage: sttResult.detectedLanguage,
          targetLanguage: sttResult.detectedLanguage,
          timestamp: new Date(),
          isEncrypted: true,
          sttConfidence: sttResult.confidence || 0.95,
          translationConfidence: 1.0
        };
        
        setSessionMessages(prev => [...prev, newSttMessage]);
        setIsTranslating(false);
        
        toast({
          title: "Speech-to-Text Complete!",
          description: `📄 You said: "${sttResult.originalText}"`,
        });
        break;
        
      case 'translation_result':
        const result = message.message; // Server sends data in 'message' field, not 'data'
        
        if (!result) {
          console.error('❌ Translation result is missing data:', message);
          setIsTranslating(false);
          return;
        }
        
        console.log('🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
        console.log('✅ Step 1: Speech-to-Text ✓');
        console.log('✅ Step 2: Text Translation ✓');
        console.log('✅ Step 3: Text-to-Speech ✓');
        
        setCurrentStep('complete');
        
        const newMessage: TranslationMessage = {
          id: Date.now().toString(),
          senderId: result.senderId?.toString() || currentUser?.id || 'unknown',
          originalText: result.originalText || 'Unknown text',
          translatedText: result.translatedText || 'Translation failed',
          originalLanguage: result.originalLanguage || 'en',
          targetLanguage: result.targetLanguage || 'en',
          timestamp: new Date(),
          isEncrypted: true,
          sttConfidence: result.sttConfidence || 0.95,
          translationConfidence: result.translationConfidence || 0.92
        };
        
        setSessionMessages(prev => [...prev, newMessage]);
        
        // Use text-to-speech for the translated text
        if (audioEnabled) {
          console.log('🔊 Step 3: Playing translated audio...');
          speak(result.translatedText, result.targetLanguage);
        }
        
        setIsTranslating(false);
        
        // Step-by-step logging
        console.log(`📄 Step 1 Result - Original (${result.originalLanguage}): "${result.originalText}"`);
        console.log(`🌐 Step 2 Result - Translated (${result.targetLanguage}): "${result.translatedText}"`);
        console.log(`🎯 STT Confidence: ${result.sttConfidence || 0.95}`);
        console.log(`🌍 Translation Confidence: ${result.translationConfidence || 0.92}`);
        
        // Performance metrics
        if (result.latency) {
          console.log(`📊 Step Performance:`);
          console.log(`   Step 1 (STT): ${result.latency.speechToText?.toFixed(2)}ms ✓`);
          console.log(`   Step 2 (Translation): ${result.latency.translation?.toFixed(2)}ms ✓`);
          console.log(`   Step 3 (TTS): ${result.latency.textToSpeech?.toFixed(2)}ms ✓`);
          console.log(`   Total Pipeline: ${result.latency.total?.toFixed(2)}ms ✓`);
        }
        
        toast({
          title: "All Steps Complete!",
          description: `✅ STT → Translation → TTS: "${result.translatedText}"`,
        });
        break;
      
      case 'error':
        console.error('Translation error:', message.message);
        setIsTranslating(false);
        toast({
          title: "Translation Error",
          description: message.message || "Failed to process translation",
          variant: "destructive",
        });
        break;
        
      default:
        console.log('Unhandled translation message type:', message.type);
        break;
    }
  };

  // Start translation session
  const startTranslationSession = () => {
    console.log('🎯 Starting translation session...');
    console.log('🎯 WebSocket connected:', isRealtimeConnected);
    console.log('🎯 Current session:', currentSession?.sessionId);
    console.log('🎯 Speaking language:', speakingLanguage);
    console.log('🎯 Speaking language:', speakingLanguage);
    console.log('🎯 Listening language:', listeningLanguage);
    
    if (!isRealtimeConnected) {
      console.error('❌ Translation WebSocket not connected');
      toast({
        title: "Connection Error",
        description: "Translation service not connected. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create a session if none exists
    if (!currentSession) {
      console.log('🔄 Creating new session for translation...');
      const sessionId = `translation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSession: TranslationSession = {
        sessionId: sessionId,
        sessionKey: `session_${sessionId}`,
        initiatorId: currentUser?.id || 'unknown',
        initiatorLanguage: speakingLanguage,
        joinerLanguage: listeningLanguage,
        isActive: true,
        startTime: new Date(),
        messages: [],
        connectionStrength: 100,
        isEncrypted: true,
        pinCode: '',
        pinVerified: true
      };
      setCurrentSession(newSession);
      console.log('✅ Created new session:', newSession.sessionId);
    }

    // Activate real-time translation
    setIsRealTimeActive(true);
    setIsTranslationSessionActive(true);
    
    console.log('✅ Real-time translation session started');
    console.log('✅ Real-time translation is now active');
    
    toast({
      title: "Real-time Translation Active",
      description: "You can now start speaking for real-time translation",
    });
  };

  // If no handshake data, show loading
  if (!handshakeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">Loading translation session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Navigation />
      
      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showScanner}
        onScanSuccess={handleQRScanSuccess}
        onScanError={handleQRScanError}
        onClose={() => setShowScanner(false)}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/qr-handshake">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Handshake
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Real-Time Translation</h1>
              <p className="text-gray-300">Bi-directional translation via secure handshake</p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            <Badge className={`flex items-center gap-2 ${isRealtimeConnected ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'}`}>
              <Wifi className="w-3 h-3" />
              {isRealtimeConnected ? 'Real-time Translation Connected' : 'Real-time Translation Disconnected'}
            </Badge>
            
            <Badge className={`flex items-center gap-2 ${isConnected ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-gray-500/20 text-gray-300 border-gray-400/30'}`}>
              <MessageCircle className="w-3 h-3" />
              {isConnected ? 'Session Active' : 'No Session'}
            </Badge>
            
            <Badge className={`flex items-center gap-2 ${isTranslationSessionActive ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'}`}>
              <Mic className="w-3 h-3" />
              {isTranslationSessionActive ? 'Translation Active' : 'Translation Ready'}
            </Badge>
            
            <Badge className={`flex items-center gap-2 ${handshakeData.handshakeComplete ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-orange-500/20 text-orange-300 border-orange-400/30'}`}>
              <Shield className="w-3 h-3" />
              {handshakeData.handshakeComplete ? 'Handshake Complete' : 'Handshake Pending'}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Session Info */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-green-400/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <Users className="w-5 h-5 text-green-400" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-green-400/10 to-emerald-500/10 p-4 rounded-xl border border-green-400/30">
                  <div className="flex items-center justify-between mb-3">
                              <div>
                      <div className="text-lg font-bold text-white">Room Active</div>
                      <div className="text-sm text-gray-300">PIN: {handshakeData.roomPin}</div>
                              </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">Connected</div>
                      <div className="text-xs text-gray-400">
                        {currentSession?.startTime.toLocaleTimeString()}
                            </div>
                          </div>
                          </div>

                  {/* Users */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white">{currentUser?.name} ({handshakeData.isHost ? 'Host' : 'Guest'})</span>
                            </div>
                    {connectedPeer && (
                              <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white">{connectedPeer.name} ({connectedPeer.isInitiator ? 'Host' : 'Guest'})</span>
                              </div>
                            )}
                            </div>
                          </div>

                {/* Connection Strength */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Connection Strength</span>
                          <div className="flex items-center gap-2">
                    <Signal className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">{connectionStrength}%</span>
                          </div>
                        </div>
              </CardContent>
            </Card>

            {/* User Settings */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-blue-400/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <User className="w-5 h-5 text-blue-400" />
                  Translation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">I Will Speak In</label>
                  <Select value={speakingLanguage} onValueChange={setSpeakingLanguage}>
                    <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-white">
                          {lang.flag} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">I Want To Hear In</label>
                  <Select value={listeningLanguage} onValueChange={setListeningLanguage}>
                    <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-white">
                          {lang.flag} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Translation Session */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Translation Session */}
            {isConnected && currentSession ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-green-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                    Real-Time Translation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-400/10 to-emerald-500/10 rounded-xl border border-green-400/30">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-lg font-bold">Bi-Directional Translation Active</div>
                        <div className="text-sm text-gray-300">
                          <span>{LANGUAGE_OPTIONS.find(lang => lang.code === speakingLanguage)?.flag} {LANGUAGE_OPTIONS.find(lang => lang.code === speakingLanguage)?.name}</span>
                          <span className="mx-2">↔</span>
                          <span>{LANGUAGE_OPTIONS.find(lang => lang.code === listeningLanguage)?.flag} {LANGUAGE_OPTIONS.find(lang => lang.code === listeningLanguage)?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Shield className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-300">Handshake Verified • Real-time Translation</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Signal className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300">{connectionStrength}%</span>
                    </div>
                  </div>

                  {/* Bi-Directional Translation Flow */}
                  <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-blue-300 flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4" />
                        Bi-Directional Translation Flow
                      </h4>
                      <Badge className={`text-xs ${
                        isTranslationSessionActive 
                          ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                      }`}>
                        {isTranslationSessionActive ? 'Active' : 'Ready'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                      <div className={`text-center p-2 rounded border ${
                        currentStep === 'stt' ? 'bg-blue-500/20 border-blue-400/50' :
                        currentStep === 'complete' ? 'bg-green-500/20 border-green-400/50' :
                        'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-blue-300 font-medium mb-1">Step 1</div>
                        <div className="text-gray-300">Speech → Text</div>
                        <div className="text-gray-400">Google-style STT</div>
                        {currentStep === 'stt' && <div className="text-blue-400 text-xs mt-1">Processing...</div>}
                        {currentStep === 'complete' && <div className="text-green-400 text-xs mt-1">✓ Complete</div>}
                      </div>
                      <div className={`text-center p-2 rounded border ${
                        currentStep === 'translation' ? 'bg-blue-500/20 border-blue-400/50' :
                        currentStep === 'complete' ? 'bg-green-500/20 border-green-400/50' :
                        'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-blue-300 font-medium mb-1">Step 2</div>
                        <div className="text-gray-300">Text Translation</div>
                        <div className="text-gray-400">L1 → L2</div>
                        {currentStep === 'translation' && <div className="text-blue-400 text-xs mt-1">Processing...</div>}
                        {currentStep === 'complete' && <div className="text-green-400 text-xs mt-1">✓ Complete</div>}
                      </div>
                      <div className={`text-center p-2 rounded border ${
                        currentStep === 'tts' ? 'bg-blue-500/20 border-blue-400/50' :
                        currentStep === 'complete' ? 'bg-green-500/20 border-green-400/50' :
                        'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-blue-300 font-medium mb-1">Step 3</div>
                        <div className="text-gray-300">Text → Speech</div>
                        <div className="text-gray-400">Natural TTS</div>
                        {currentStep === 'tts' && <div className="text-blue-400 text-xs mt-1">Processing...</div>}
                        {currentStep === 'complete' && <div className="text-green-400 text-xs mt-1">✓ Complete</div>}
                      </div>
                      </div>
                    </div>
                    
                  {/* Real-time Translation Messages */}
                  {isRealTimeActive && (
                    <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <h4 className="text-sm font-medium text-purple-300">Real-Time Translation</h4>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                          Live
                        </Badge>
                      </div>
                      
                      {/* Messages Display */}
                      <div className="h-64 overflow-y-auto space-y-3 p-3 bg-black/20 rounded-xl border border-white/10">
                        {realTimeMessages.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No messages yet</p>
                            <p className="text-sm">Start speaking to see real-time translations</p>
                  </div>
                        ) : (
                          realTimeMessages.map((message) => (
                            <div key={message.id} className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs p-3 rounded-xl ${
                                message.senderId === currentUser?.id
                                  ? 'bg-purple-500/20 border border-purple-400/30'
                                  : 'bg-blue-500/20 border border-blue-400/30'
                              }`}>
                                <div className="text-sm text-gray-300 mb-1">
                                  {message.senderId === currentUser?.id ? 'You' : 'Other User'}
                                </div>
                                <div className="text-white mb-2">{message.originalText}</div>
                                {message.translatedText && (
                                  <div className="text-sm text-gray-300 italic">
                                    → {message.translatedText}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-2">
                                  {message.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>
                  )}

                  {/* Real-time Transcript Display */}
                  {isListening && (
                    <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-300">Listening...</span>
                      </div>
                      <div className="text-white">
                        <div className="text-sm text-gray-300 mb-1">Final:</div>
                        <div className="text-lg">{transcript}</div>
                        {interimTranscript && (
                          <>
                            <div className="text-sm text-gray-300 mb-1 mt-3">Interim:</div>
                            <div className="text-lg text-gray-400 italic">{interimTranscript}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="h-96 overflow-y-auto space-y-3 p-4 bg-black/20 rounded-xl border border-white/10">
                    {sessionMessages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Ready to translate</p>
                        <p className="text-sm">Click "Start Listening" and speak to begin</p>
                      </div>
                    ) : (
                      sessionMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs p-3 rounded-xl ${
                            message.senderId === currentUser?.id
                              ? 'bg-blue-500/20 border border-blue-400/30'
                              : 'bg-gray-500/20 border border-gray-400/30'
                          }`}>
                            <div className="text-sm text-gray-300 mb-1">
                              {message.senderId === currentUser?.id ? 'You' : 'Peer'}
                            </div>
                            <div className="text-white mb-2">{message.originalText}</div>
                            <div className="text-sm text-cyan-300">{message.translatedText}</div>
                            <div className="text-xs text-gray-400 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Real-time Translation Controls */}
                  {isRealTimeActive && (
                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        onClick={() => sendSpeechForTranslation('Hello, how are you?', userLanguage)}
                        className="flex-1 bg-purple-500 hover:bg-purple-600"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send Test Message
                      </Button>
                      
                      <Button
                        onClick={() => {
                          const text = prompt('Enter text to translate:');
                          if (text) {
                            sendSpeechForTranslation(text, userLanguage);
                          }
                        }}
                        variant="outline"
                        className="border-purple-400/30 text-purple-300 hover:bg-purple-400/20"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send Text
                      </Button>
                    </div>
                  )}

                  {/* Voice Controls */}
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={isListening ? stopRecording : startRecording}
                      disabled={isTranslating}
                      className={`flex-1 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Listening
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={toggleAudio}
                      variant="outline"
                      className="border-green-400/30 text-green-300 hover:bg-green-400/20"
                    >
                      {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      onClick={endSession}
                      variant="outline"
                      className="border-red-400/30 text-red-300 hover:bg-red-400/20"
                    >
                      End Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-gray-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                    No Active Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <h3 className="text-lg font-medium text-white mb-2">Translation Session Not Ready</h3>
                  <p className="text-gray-400 mb-4">Please complete handshake first to start translation</p>
                    <Button
                    onClick={() => setLocation('/qr-handshake')}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                    Go to Handshake
                    </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
