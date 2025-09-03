
import React, { useState, useEffect, useRef } from 'react';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, QrCode, Users, Mic, User, UserCheck, UserX, MessageCircle, Phone, PhoneOff, Copy, Check, RefreshCw, Lock, Shield, Key, Eye, EyeOff, X, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import QRCodeScanner from '@/components/QRCodeScanner';
import QRCode from 'qrcode';

// Room Interface
interface Room {
  id: string;
  pin: string;
  host: User;
  guest?: User;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

// User Interface
interface User {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  preferredLanguage: string;
}

// Message Interface
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'system' | 'user' | 'handshake';
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

export default function QRHandshake() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState(`Traveler_${Math.random().toString(36).substr(2, 4)}`);
  const [userLanguage, setUserLanguage] = useState('en');
  
  // Room State
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomPin, setRoomPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // WebSocket State
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // UI State
  const [activeStep, setActiveStep] = useState<'setup' | 'create' | 'join' | 'waiting' | 'connected'>('setup');
  const [showScanner, setShowScanner] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [handshakeComplete, setHandshakeComplete] = useState(false);
  
  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
  }, []);

  // Initialize current user
  const initializeUser = () => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id: userId,
      name: userName,
      isHost: false,
      isConnected: false,
      preferredLanguage: userLanguage
    };
    setCurrentUser(user);
  };

  // Connect to WebSocket server
  const connectToWebSocket = () => {
    setConnectionStatus('connecting');
    
    // Try to detect the server IP automatically
    const getServerUrl = () => {
      // For mobile testing, use the computer's IP address
      // For local development, use localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        return 'ws://localhost:3001';
      } else {
        // Use the same hostname as the current page
        const hostname = window.location.hostname;
        return `ws://${hostname}:3001`;
      }
    };
    
    const wsUrl = getServerUrl();
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setWebsocket(ws);
        
        // Send user info to server
        if (currentUser) {
          ws.send(JSON.stringify({
            type: 'user_info',
            user: currentUser
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (parseError) {
          console.error('❌ Failed to parse WebSocket message:', parseError);
        }
      };
      
      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setWebsocket(null);
        setIsConnected(false);
        setCurrentRoom(null);
        
        // Show helpful message based on close code
        if (event.code === 1006) {
          toast({
            title: "Connection Lost",
            description: "Server connection was lost. Please check if the handshake server is running on port 3001.",
            variant: "destructive",
          });
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: `Failed to connect to server at ${wsUrl}. Please check if the handshake server is running on port 3001.`,
          variant: "destructive",
        });
      };
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: `Could not connect to server at ${wsUrl}. Please check if the handshake server is running on port 3001.`,
        variant: "destructive",
      });
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('📨 Received message:', data);
    
    switch (data.type) {
      case 'room_created':
        handleRoomCreated(data.room);
        break;
        
      case 'room_joined':
        handleRoomJoined(data.room);
        break;
        
      case 'user_joined':
        handleUserJoined(data.user);
        break;
        
      case 'user_left':
        handleUserLeft(data.userId);
        break;
        
      case 'handshake_complete':
        handleHandshakeComplete();
        break;
        
      case 'chat_message':
        handleChatMessage(data.message);
        break;
        
      case 'room_not_found':
        toast({
          title: "Room Not Found",
          description: "The room with this PIN does not exist or has expired.",
          variant: "destructive",
        });
        setActiveStep('join');
        break;
        
      case 'room_full':
        toast({
          title: "Room Full",
          description: "This room already has 2 users. Please try another room.",
          variant: "destructive",
        });
        setActiveStep('join');
        break;
        
      case 'invalid_pin':
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        setActiveStep('join');
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Handle room creation
  const handleRoomCreated = (room: Room) => {
    setCurrentRoom(room);
    setIsHost(true);
    setRoomPin(room.pin);
    setActiveStep('waiting');
    
    // Generate QR code for the room
    generateRoomQRCode(room);
    
    // Add system message
    addSystemMessage(`Room created with PIN: ${room.pin}`);
    addSystemMessage('Waiting for another user to join...');
    
    toast({
      title: "Room Created!",
      description: `Share PIN ${room.pin} with the person you want to connect with`,
    });
  };

  // Handle room joined
  const handleRoomJoined = (room: Room) => {
    setCurrentRoom(room);
    setIsHost(false);
    setActiveStep('connected');
    setIsConnected(true);
    
    // Add system message
    addSystemMessage(`Joined room with PIN: ${room.pin}`);
    addSystemMessage('Handshake in progress...');
    
    toast({
      title: "Room Joined!",
      description: "Connected to the room successfully",
    });
  };

  // Handle user joined
  const handleUserJoined = (user: User) => {
    console.log('👥 User joined:', user.name, 'Is host:', isHost);
    if (currentRoom) {
      setCurrentRoom(prev => prev ? { ...prev, guest: user } : null);
      addSystemMessage(`${user.name} joined the room`);
      
      // If we're the host and someone joined, complete handshake
      if (isHost) {
        console.log('🏠 Host detected - will complete handshake in 1 second');
        setTimeout(() => {
          console.log('🏠 Host completing handshake...');
          completeHandshake();
        }, 1000);
      }
    }
  };

  // Handle user left
  const handleUserLeft = (userId: string) => {
    if (currentRoom) {
      const leftUser = currentRoom.host.id === userId ? currentRoom.host : currentRoom.guest;
      setCurrentRoom(prev => prev ? { ...prev, guest: undefined } : null);
      addSystemMessage(`${leftUser?.name || 'A user'} left the room`);
      
      // If we're still connected, show reconnection option
      if (isConnected) {
        toast({
          title: "User Disconnected",
          description: "The other user has left the room",
          variant: "destructive",
        });
      }
    }
  };

  // Handle handshake complete
  const handleHandshakeComplete = () => {
    console.log('🎉 Handshake completed on client side!');
    setHandshakeComplete(true);
    addSystemMessage('✅ Handshake completed successfully!');
    addSystemMessage('You can now proceed to translation');
    
    toast({
      title: "Handshake Complete!",
      description: "Both users are connected and verified",
    });
  };

  // Handle chat message
  const handleChatMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Add system message
  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, message]);
  };

  // Generate room QR code
  const generateRoomQRCode = async (room: Room) => {
    try {
      const roomData = {
        roomId: room.id,
        pin: room.pin,
        timestamp: Date.now()
      };
      
      const qrUrl = await QRCode.toDataURL(JSON.stringify(roomData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('QR code generation error:', error);
    }
  };

  // Create room
  const createRoom = () => {
    if (!websocket || !currentUser) {
      toast({
        title: "Not Connected",
        description: "Please connect to server first",
        variant: "destructive",
      });
      return;
    }
    
    websocket.send(JSON.stringify({
      type: 'create_room',
      user: currentUser
    }));
  };

  // Join room
  const joinRoom = () => {
    if (!websocket || !currentUser) {
      toast({
        title: "Not Connected",
        description: "Please connect to server first",
        variant: "destructive",
      });
      return;
    }
    
    if (!roomPin || roomPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 6-digit PIN",
        variant: "destructive",
      });
      return;
    }
    
    websocket.send(JSON.stringify({
      type: 'join_room',
      pin: roomPin,
      user: currentUser
    }));
  };

  // Complete handshake
  const completeHandshake = () => {
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'complete_handshake',
        roomId: currentRoom?.id
      }));
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!websocket || !chatMessage.trim() || !currentUser) return;
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: chatMessage.trim(),
      timestamp: new Date(),
      type: 'user'
    };
    
    websocket.send(JSON.stringify({
      type: 'send_message',
      message,
      roomId: currentRoom?.id
    }));
    
    setChatMessage('');
  };

  // Navigate to translation page
  const goToTranslation = () => {
    if (currentRoom && currentUser) {
      // Pass room and user data to translation page
      const translationData = {
        roomId: currentRoom.id,
        roomPin: currentRoom.pin,
        userId: currentUser.id,
        userName: currentUser.name,
        userLanguage: currentUser.preferredLanguage,
        isHost: isHost,
        handshakeComplete: handshakeComplete
      };
      
      // Store in sessionStorage for translation page
      sessionStorage.setItem('translationData', JSON.stringify(translationData));
      
      // Navigate to translation page
      setLocation('/ble-translator');
    }
  };

  // Leave room
  const leaveRoom = () => {
    if (websocket && currentRoom) {
      websocket.send(JSON.stringify({
        type: 'leave_room',
        roomId: currentRoom.id,
        userId: currentUser?.id
      }));
    }
    
    setCurrentRoom(null);
    setIsConnected(false);
    setIsHost(false);
    setRoomPin('');
    setActiveStep('setup');
    setMessages([]);
    setHandshakeComplete(false);
    setQrCodeUrl('');
  };

  // Copy PIN to clipboard
  const copyPIN = async () => {
    try {
      await navigator.clipboard.writeText(roomPin);
      toast({
        title: "PIN Copied!",
        description: "Room PIN copied to clipboard",
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Navigation />
      
      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showScanner}
        onScanSuccess={(data) => {
          try {
            const roomData = JSON.parse(data);
            setRoomPin(roomData.pin);
            setShowScanner(false);
            joinRoom();
          } catch (error) {
            toast({
              title: "Invalid QR Code",
              description: "The scanned QR code is not valid",
              variant: "destructive",
            });
          }
        }}
        onScanError={(error) => {
          console.error('QR scan error:', error);
          setShowScanner(false);
        }}
        onClose={() => setShowScanner(false)}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">QR Code Handshake</h1>
              <p className="text-gray-300">Create or join private rooms for secure translation sessions</p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            <Badge className={`flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-300 border-green-400/30' : connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'}`}>
              <Wifi className="w-3 h-3" />
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
            </Badge>
            
            <Badge className={`flex items-center gap-2 ${isConnected ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-gray-500/20 text-gray-300 border-gray-400/30'}`}>
              <MessageCircle className="w-3 h-3" />
              {isConnected ? 'Room Active' : 'No Room'}
            </Badge>
            
            <Badge className={`flex items-center gap-2 ${handshakeComplete ? 'bg-green-500/20 text-green-300 border-green-400/30' : isConnected ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' : 'bg-orange-500/20 text-orange-300 border-orange-400/30'}`}>
              <Shield className="w-3 h-3" />
              {handshakeComplete ? 'Handshake Complete' : isConnected ? 'Handshake Pending' : 'No Handshake'}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Setup & Controls */}
          <div className="space-y-6">
            {/* Connection Setup */}
            {connectionStatus === 'disconnected' && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-blue-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Wifi className="w-5 h-5 text-blue-400" />
                    Connect to Server
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-400 text-xs font-bold">i</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-300 mb-1">Server Connection Required</h4>
                                                 <p className="text-xs text-blue-200">
                           Connect to the local server to create or join rooms. Make sure the server is running on 192.168.1.5:3001
                         </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={connectToWebSocket}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect to Server
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Room Creation/Joining */}
            {connectionStatus === 'connected' && activeStep === 'setup' && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <QrCode className="w-5 h-5 text-cyan-400" />
                    Room Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create Room */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Create a New Room</h4>
                    <Button
                      onClick={createRoom}
                      className="w-full bg-cyan-500 hover:bg-cyan-600"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Create Room
                    </Button>
                  </div>

                  {/* Join Room */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Join Existing Room</h4>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={roomPin}
                        onChange={(e) => setRoomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="bg-white/10 border-white/20 text-white text-center text-lg font-mono tracking-widest"
                        placeholder="000000"
                        maxLength={6}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={joinRoom}
                          disabled={roomPin.length !== 6}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Join Room
                        </Button>
                        <Button
                          onClick={() => setShowScanner(true)}
                          variant="outline"
                          className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Waiting for Guest */}
            {activeStep === 'waiting' && currentRoom && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-yellow-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Users className="w-5 h-5 text-yellow-400" />
                    Waiting for Guest
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Room PIN Display */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4 rounded-xl border border-yellow-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-300">Room PIN</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-black/20 p-3 rounded border border-yellow-400/30">
                        <span className="text-lg font-mono text-yellow-300 tracking-widest">
                          {showPin ? roomPin : '••••••'}
                        </span>
                      </div>
                      <Button
                        onClick={() => setShowPin(!showPin)}
                        variant="outline"
                        size="sm"
                        className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={copyPIN}
                        variant="outline"
                        size="sm"
                        className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-yellow-200">
                      Share this PIN with the person you want to connect with
                    </p>
                  </div>

                  {/* QR Code */}
                  {qrCodeUrl && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">QR Code</h4>
                      <div className="bg-white p-4 rounded-xl">
                        <img src={qrCodeUrl} alt="Room QR Code" className="w-full h-auto" />
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Waiting for Guest</h3>
                    <p className="text-gray-400">Share the PIN or QR code with another user</p>
                  </div>

                  <Button
                    onClick={leaveRoom}
                    variant="outline"
                    className="w-full border-red-400/30 text-red-300 hover:bg-red-400/20"
                  >
                    Cancel Room
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* User Settings */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-blue-400/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <User className="w-5 h-5 text-blue-400" />
                  Your Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Display Name</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">Preferred Language</label>
                  <Select value={userLanguage} onValueChange={setUserLanguage}>
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

          {/* Right Column - Chat & Status */}
          <div className="space-y-6">
            {/* Room Status */}
            {currentRoom && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-green-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                    Room Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Room Info */}
                  <div className="bg-gradient-to-r from-green-400/10 to-emerald-500/10 p-4 rounded-xl border border-green-400/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-lg font-bold text-white">Room Active</div>
                        <div className="text-sm text-gray-300">PIN: {roomPin}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-300">Created</div>
                                                 <div className="text-xs text-gray-400">
                           {new Date(currentRoom.createdAt).toLocaleTimeString()}
                         </div>
                      </div>
                    </div>
                    
                    {/* Users */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white">{currentRoom.host.name} (Host)</span>
                      </div>
                      {currentRoom.guest ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white">{currentRoom.guest.name} (Guest)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserX className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Waiting for guest...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Handshake Status */}
                  {handshakeComplete && (
                    <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-green-300 mb-1">Handshake Complete!</h4>
                          <p className="text-xs text-green-200">
                            Both users are connected and verified. Ready for translation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {handshakeComplete ? (
                      <Button
                        onClick={goToTranslation}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Start Translation
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="flex-1 bg-gray-600 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Waiting for Handshake
                      </Button>
                    )}
                    
                    <Button
                      onClick={leaveRoom}
                      variant="outline"
                      className="border-red-400/30 text-red-300 hover:bg-red-400/20"
                    >
                      Leave Room
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Messages */}
            {isConnected && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-purple-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                    Room Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages Display */}
                  <div className="h-64 overflow-y-auto space-y-3 p-4 bg-black/20 rounded-xl border border-white/10">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start chatting with your room partner</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs p-3 rounded-xl ${
                            message.type === 'system' 
                              ? 'bg-blue-500/20 border border-blue-400/30' 
                              : message.senderId === currentUser?.id
                              ? 'bg-purple-500/20 border border-purple-400/30'
                              : 'bg-gray-500/20 border border-gray-400/30'
                          }`}>
                            <div className="text-sm text-gray-300 mb-1">
                              {message.type === 'system' ? 'System' : message.senderName}
                            </div>
                            <div className="text-white">{message.content}</div>
                            <div className="text-xs text-gray-400 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      placeholder="Type a message..."
                      disabled={!isConnected}
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={!chatMessage.trim() || !isConnected}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600"
                    >
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Welcome Message */}
            {!currentRoom && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-gray-400/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <QrCode className="w-5 h-5 text-gray-400" />
                    Welcome to QR Handshake
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <h3 className="text-lg font-medium text-white mb-2">Create or Join a Room</h3>
                  <p className="text-gray-400 mb-4">
                    Start by creating a new room or joining an existing one with a PIN
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>• Create a room to get a unique PIN</p>
                    <p>• Share the PIN with another user</p>
                    <p>• Complete handshake to start translation</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}