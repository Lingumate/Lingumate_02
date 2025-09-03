import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { androidIntegrationService } from '@/lib/androidIntegration';
import { useUserCountry } from '@/hooks/useUserCountry';
import { useTextToSpeech } from '@/hooks/useTextToSpeech'; 
import CountrySelector from './CountrySelector';
import { 
  MapPin, 
  Utensils, 
  Hotel, 
  Car, 
  Phone, 
  Heart, 
  ShoppingBag, 
  Camera,
  MessageCircle,
  Mic,
  Send,
  Loader2,
  Star,
  Clock,
  AlertTriangle,
  Navigation,
  ExternalLink,
  Globe,
  Search,
  TrendingUp,
  Shield,
  Calendar,
  Info,
  Zap,
  Users,
  Building2,
  Bus,
  Train,
  Plane,
  Wifi,
  CreditCard,
  Smartphone,
  Map,
  Volume2,
  VolumeX,
  PhoneCall,
  AlertCircle,
  Sparkles,
  Waves,
  Palette,
  Sun,
  Moon
} from 'lucide-react';

interface LocationSuggestion {
  id: string;
  name: string;
  type: 'restaurant' | 'hotel' | 'attraction' | 'emergency' | 'transport' | 'shopping' | 'event' | 'police' | 'hospital' | 'bank' | 'pharmacy';
  address: string;
  rating?: number;
  price?: string;
  distance?: string;
  description: string;
  phone?: string;
  hours?: string;
  image?: string;
  emergency?: boolean;
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: Date;
  relevance: number;
}

interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  summary: string;
  sources: string[];
  lastUpdated: Date;
}



interface TravelTip {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'culture' | 'transport' | 'food' | 'money' | 'communication';
  priority: 'high' | 'medium' | 'low';
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'ambulance' | 'fire' | 'hospital' | 'embassy' | 'tourist_info';
  description: string;
  country?: string;
  region?: string;
}

interface EventInfo {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price?: string;
  category: string;
  image?: string;
}

interface AITravelAssistantProps {
  userLocation?: string;
  userLanguage?: string;
}

// Emergency voice activation interface
interface EmergencyVoiceState {
  isListening: boolean;
  helpCount: number;
  isEmergencyMode: boolean;
  lastHelpTime: Date | null;
  recognition: any;
}

// Extend Window interface for Android integration
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const EMERGENCY_CATEGORIES = [
  { id: 'medical', name: 'Medical Emergency', icon: Heart, color: 'bg-red-500' },
  { id: 'police', name: 'Police', icon: Phone, color: 'bg-blue-500' },
  { id: 'fire', name: 'Fire Department', icon: Phone, color: 'bg-orange-500' },
  { id: 'ambulance', name: 'Ambulance', icon: Heart, color: 'bg-red-600' },
  { id: 'embassy', name: 'Embassy', icon: Building2, color: 'bg-purple-500' },
  { id: 'tourist_info', name: 'Tourist Info', icon: Info, color: 'bg-green-500' },
];

const TRAVEL_CATEGORIES = [
  { id: 'restaurants', name: 'Restaurants', icon: Utensils, color: 'bg-green-500' },
  { id: 'hotels', name: 'Hotels', icon: Hotel, color: 'bg-blue-500' },
  { id: 'attractions', name: 'Attractions', icon: Camera, color: 'bg-purple-500' },
  { id: 'transport', name: 'Transport', icon: Car, color: 'bg-yellow-500' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500' },
  { id: 'events', name: 'Events', icon: Calendar, color: 'bg-indigo-500' },
  { id: 'emergency', name: 'Emergency', icon: AlertTriangle, color: 'bg-red-500' },
];

const TRAVEL_TIPS: TravelTip[] = [
  {
    id: '1',
    title: 'Local Emergency Numbers',
    description: 'Save local emergency numbers in your phone: Police (112), Ambulance (15), Fire (18)',
    category: 'safety',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Transport Cards',
    description: 'Get a local transport card for cheaper and easier travel around the city',
    category: 'transport',
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Local Customs',
    description: 'Learn basic local customs and greetings to show respect to locals',
    category: 'culture',
    priority: 'medium'
  },
  {
    id: '4',
    title: 'WiFi & Connectivity',
    description: 'Download offline maps and translation apps before your trip',
    category: 'communication',
    priority: 'high'
  }
];

// Helper function to get icon for emergency contact type
const getEmergencyContactIcon = (type: EmergencyContact['type']) => {
  switch (type) {
    case 'police':
      return <AlertTriangle className="w-4 h-4" />;
    case 'ambulance':
      return <Heart className="w-4 h-4" />;
    case 'fire':
      return <Zap className="w-4 h-4" />;
    case 'hospital':
      return <Heart className="w-4 h-4" />;
    case 'embassy':
      return <Building2 className="w-4 h-4" />;
    case 'tourist_info':
      return <Info className="w-4 h-4" />;
    default:
      return <Phone className="w-4 h-4" />;
  }
};

export default function AITravelAssistant({ userLocation = 'Paris, France', userLanguage = 'en' }: AITravelAssistantProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { speak, stop: stopSpeech, isSpeaking, supported: speechSupported } = useTextToSpeech();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    suggestions?: LocationSuggestion[];
    webSearchResults?: WebSearchResponse;
    travelTips?: TravelTip[];
    emergencyContacts?: EmergencyContact[];
    events?: EventInfo[];
  }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [autoListenMode, setAutoListenMode] = useState(true);
  const [voiceFeedback, setVoiceFeedback] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Location detection and country selection
  const { country, loading: locationLoading, permissionDenied, setCountry } = useUserCountry();
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emergency voice activation state
  const [emergencyVoiceState, setEmergencyVoiceState] = useState<EmergencyVoiceState>({
    isListening: false,
    helpCount: 0,
    isEmergencyMode: false,
    lastHelpTime: null,
    recognition: null
  });

  // Wake word state
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [wakeWordTimeout, setWakeWordTimeout] = useState<NodeJS.Timeout | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup wake word timeout on unmount
  useEffect(() => {
    return () => {
      if (wakeWordTimeout) {
        clearTimeout(wakeWordTimeout);
      }
    };
  }, [wakeWordTimeout]);

  // Fetch emergency contacts when country is detected or selected
  useEffect(() => {
    if (country?.iso2) {
      fetchEmergencyContacts(country.iso2);
    }
  }, [country]);

  const fetchEmergencyContacts = async (countryCode: string) => {
    try {
      console.log(`📞 Fetching emergency contacts for ${countryCode}`);
      const response = await fetch(`/api/emergency/${countryCode}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emergency contacts');
      }
      
      const data = await response.json();
      setEmergencyContacts(data.contacts);
      
      console.log(`✅ Loaded ${data.contacts.length} emergency contacts for ${data.country}`);
      
      toast({
        title: "Emergency Contacts Updated",
        description: `Loaded emergency contacts for ${country?.name || countryCode}`,
      });
    } catch (error) {
      console.error('❌ Failed to fetch emergency contacts:', error);
      toast({
        title: "Emergency Contacts Error",
        description: "Failed to load emergency contacts. Using default numbers.",
        variant: "destructive",
      });
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setEmergencyVoiceState(prev => ({ ...prev, isListening: true }));
        console.log('Voice recognition started');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map(result => result.transcript)
          .join('');

        handleVoiceInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setEmergencyVoiceState(prev => ({ ...prev, isListening: false }));
      };

      recognition.onend = () => {
        setEmergencyVoiceState(prev => ({ ...prev, isListening: false }));
      };

      setEmergencyVoiceState(prev => ({ ...prev, recognition }));
    }

    // Initialize Android integration
    const initializeAndroidIntegration = async () => {
      try {
        await androidIntegrationService.initialize();
        console.log('Android integration initialized');
      } catch (error) {
        console.error('Android integration initialization failed:', error);
      }
    };

    const initializeSpeechRecognition = () => {
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setEmergencyVoiceState(prev => ({ ...prev, isListening: true }));
          console.log('Voice recognition started');
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map(result => result.transcript)
            .join('');

          handleVoiceInput(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setEmergencyVoiceState(prev => ({ ...prev, isListening: false }));
        };

        recognition.onend = () => {
          setEmergencyVoiceState(prev => ({ ...prev, isListening: false }));
        };

        setEmergencyVoiceState(prev => ({ ...prev, recognition }));
      }
    };

    initializeAndroidIntegration();
    initializeSpeechRecognition();
    
    // Auto-start voice recognition when component loads
    if (autoListenMode) {
      setTimeout(() => {
        startVoiceRecognition();
      }, 1000);
    }
  }, []);

  // Initialize with comprehensive welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome',
        type: 'ai' as const,
        content: `Welcome to your comprehensive AI Travel Assistant! 🌍✨

I'm here to help you with everything you need for your trip:

🎯 **Travel Assistance**
• Find restaurants, hotels, attractions, and events
• Get real-time directions and transport options
• Access emergency contacts and safety information

💰 **Price Protection**
• Compare prices for products and services
• Avoid fraud and overcharging
• Get market price information

🚨 **Emergency Support**
• Emergency contact numbers (police, ambulance, fire)
• Hospital and medical facility locations
• Embassy and tourist information
• **Voice-activated emergency: Say "help help" twice for emergency mode**

🗺️ **Local Knowledge**
• Cultural tips and local customs
• Current events and activities
• Weather and travel conditions

💡 **Smart Recommendations**
• Personalized travel suggestions
• Local insider tips
• Real-time updates and alerts

What would you like to know about? I can help with anything from "Where's the nearest restaurant?" to "What's the price of a coffee?" or "I need emergency help!"`,
        timestamp: new Date(),
        suggestions: [],
        travelTips: TRAVEL_TIPS.slice(0, 3),
        emergencyContacts: [] // This will be fetched from the backend
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  // Handle voice input with emergency detection and wake word
  const handleVoiceInput = (transcript: string) => {
    console.log('Voice input received:', transcript);
    
    // Clear previous voice feedback
    setVoiceFeedback('');
    
    const lowerTranscript = transcript.toLowerCase();
    
    // Handle wake word detection
    if (lowerTranscript.includes('hey now')) {
      handleWakeWordActivation();
      return;
    }
    
    // Handle emergency voice activation
    if (lowerTranscript.includes('help help')) {
      handleEmergencyVoiceActivation();
      return;
    }
    
    // Handle emergency commands (only when in emergency mode)
    if (emergencyVoiceState.isEmergencyMode) {
      if (lowerTranscript.includes('call police')) {
      setVoiceFeedback("Calling police...");
      handleEmergencyCommands('police');
      return;
    }
    
      if (lowerTranscript.includes('call hospital')) {
        setVoiceFeedback("Calling hospital...");
      handleEmergencyCommands('ambulance');
      return;
    }
    
      if (lowerTranscript.includes('call fire') || lowerTranscript.includes('call fire department')) {
      setVoiceFeedback("Calling fire department...");
      handleEmergencyCommands('fire');
      return;
      }
      
      if (lowerTranscript.includes('cancel') || lowerTranscript.includes('exit')) {
        setEmergencyVoiceState(prev => ({ ...prev, isEmergencyMode: false }));
        setVoiceFeedback("Emergency mode deactivated");
        toast({
          title: "Emergency Mode Deactivated",
          description: "You're back to normal mode",
        });
        return;
      }
    }
    
    // Only process other commands if wake word is active
    if (!isWakeWordActive) {
      return; // Ignore other commands if wake word not activated
    }
    
    // Voice control commands
    if (lowerTranscript.includes('stop listening') || lowerTranscript.includes('pause')) {
      setVoiceFeedback("Stopping voice recognition...");
      stopVoiceRecognition();
      return;
    }
    
    if (lowerTranscript.includes('start listening') || lowerTranscript.includes('resume')) {
      setVoiceFeedback("Resuming voice recognition...");
      startVoiceRecognition();
      return;
    }
    
    // Natural language queries - set as current message and auto-send
    setCurrentMessage(transcript);
    setVoiceFeedback(`Processing: "${transcript}"`);
    
    // Auto-send after a short delay to allow user to see what was transcribed
    setTimeout(() => {
      handleSendMessage();
    }, 1000);
  };

  // Handle wake word activation
  const handleWakeWordActivation = () => {
    // Clear any existing timeout
    if (wakeWordTimeout) {
      clearTimeout(wakeWordTimeout);
    }

    // Activate wake word mode
    setIsWakeWordActive(true);
    setVoiceFeedback("🎤 How can I help you?");

    // Speak the activation message if speech is enabled
    if (speechEnabled && speechSupported) {
      console.log('🔊 Speaking wake word activation message...');
      speak("How can I help you?", userLanguage || 'en');
    } else {
      console.log('🔇 Speech not enabled or not supported:', { speechEnabled, speechSupported });
    }

    toast({
      title: "🎤 Assistant Activated",
      description: "Say 'Hey Now' to activate me anytime!",
    });

    // Set timeout to deactivate wake word mode after 10 seconds
    const timeout = setTimeout(() => {
      setIsWakeWordActive(false);
      setVoiceFeedback("");
    }, 10000);

    setWakeWordTimeout(timeout);
  };

  // Handle emergency voice activation
  const handleEmergencyVoiceActivation = () => {
    const now = new Date();
    const lastHelpTime = emergencyVoiceState.lastHelpTime;
    const timeDiff = lastHelpTime ? now.getTime() - lastHelpTime.getTime() : 0;

    if (timeDiff < 5000) { // Within 5 seconds
      // Emergency mode activated
      setEmergencyVoiceState(prev => ({
        ...prev,
        isEmergencyMode: true,
        helpCount: 0,
        lastHelpTime: null
      }));

      toast({
        title: "🚨 Emergency Mode Activated",
        description: "Say 'call police', 'call hospital', or 'call fire' to call emergency services",
        variant: "destructive",
      });

      // Add emergency message
      const emergencyMessage = {
        id: Date.now().toString(),
        type: 'ai' as const,
        content: `🚨 **EMERGENCY MODE ACTIVATED** 🚨

I'm here to help! Please say one of the following:
- "Call police" - Call emergency police
- "Call hospital" - Call emergency ambulance
- "Call fire" - Call fire department
- "Cancel" - Exit emergency mode

What type of emergency do you need assistance with?`,
        timestamp: new Date(),
        suggestions: [],
        emergencyContacts: [] // This will be fetched from the backend
      };

      setMessages(prev => [...prev, emergencyMessage]);
      
      // Speak emergency mode activation
      if (speechEnabled && speechSupported) {
        console.log('🔊 Speaking emergency mode activation...');
        speak("Emergency mode activated. Say call police, call hospital, or call fire to call emergency services.", userLanguage || 'en');
      }
    } else {
      // First help call
      setEmergencyVoiceState(prev => ({
        ...prev,
        helpCount: prev.helpCount + 1,
        lastHelpTime: now
      }));

      toast({
        title: "Help Detected",
        description: "Say 'help help' again within 5 seconds to activate emergency mode",
        variant: "destructive",
      });
      
      // Speak first help call feedback
      if (speechEnabled && speechSupported) {
        console.log('🔊 Speaking first help call feedback...');
        speak("Say help help again within 5 seconds to activate emergency mode.", userLanguage || 'en');
      }
    }
  };

  // Handle emergency commands
  const handleEmergencyCommands = (command: string) => {
    let emergencyType = '';
    let phoneNumber = '';

    if (command.includes('police')) {
      emergencyType = 'police';
      phoneNumber = '112';
    } else if (command.includes('ambulance') || command.includes('medical')) {
      emergencyType = 'ambulance';
      phoneNumber = '15';
    } else if (command.includes('fire')) {
      emergencyType = 'fire';
      phoneNumber = '18';
    } else if (command.includes('cancel') || command.includes('exit')) {
      // Exit emergency mode
      setEmergencyVoiceState(prev => ({
        ...prev,
        isEmergencyMode: false
      }));
      toast({
        title: "Emergency Mode Deactivated",
        description: "You're back to normal mode",
      });
      return;
    } else {
      return; // Unknown command
    }

    // Call emergency services
    makeEmergencyCall(emergencyType, phoneNumber);
  };

  // Make emergency call
  const makeEmergencyCall = async (emergencyType: string, phoneNumber: string) => {
    try {
      // Use Android integration service for emergency calling
      const success = await androidIntegrationService.makeEmergencyCall(phoneNumber);
      
      if (success) {
        // Add emergency call message
        const callMessage = {
          id: Date.now().toString(),
          type: 'ai' as const,
          content: `🚨 **EMERGENCY CALL INITIATED** 🚨

Calling ${emergencyType} services at ${phoneNumber}...

If the call doesn't connect automatically:
1. Your phone should be dialing the number now
2. If not, please manually call: ${phoneNumber}
3. Speak clearly and provide your location: ${userLocation}

Stay calm and provide your current location and emergency details.`,
          timestamp: new Date(),
          suggestions: [],
          emergencyContacts: [] // This will be fetched from the backend
        };

        setMessages(prev => [...prev, callMessage]);

        toast({
          title: `Emergency Call: ${emergencyType}`,
          description: `Calling ${phoneNumber}...`,
          variant: "destructive",
        });

        // Exit emergency mode after call
        setTimeout(() => {
          setEmergencyVoiceState(prev => ({
            ...prev,
            isEmergencyMode: false
          }));
        }, 10000);
      } else {
        throw new Error('Emergency call failed');
      }

    } catch (error) {
      console.error('Emergency call error:', error);
      toast({
        title: "Emergency Call Failed",
        description: `Please manually call ${phoneNumber}`,
        variant: "destructive",
      });
    }
  };

  // Start voice recognition
  const startVoiceRecognition = () => {
    if (!emergencyVoiceState.recognition) {
      toast({
        title: "Voice recognition not available",
        description: "Please check your browser permissions and microphone access.",
        variant: "destructive",
      });
      return;
    }

    try {
      emergencyVoiceState.recognition.start();
      setIsRecording(true);
      setEmergencyVoiceState(prev => ({ ...prev, isListening: true }));
      
      // Add voice feedback
      setVoiceFeedback("Voice recognition started. I'm listening...");
      
      // Auto-restart if in auto-listen mode
      if (autoListenMode) {
        setTimeout(() => {
          if (!emergencyVoiceState.isListening) {
            startVoiceRecognition();
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      toast({
        title: "Error starting voice recognition",
        description: "Please try again or check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop voice recognition
  const stopVoiceRecognition = () => {
    if (emergencyVoiceState.recognition) {
      emergencyVoiceState.recognition.stop();
    }
    setIsRecording(false);
    setEmergencyVoiceState(prev => ({ ...prev, isListening: false }));
    setVoiceFeedback("Voice recognition stopped");
  };

  const toggleAutoListenMode = () => {
    setAutoListenMode(!autoListenMode);
    if (!autoListenMode) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
  };

  const toggleTextInput = () => {
    setShowTextInput(!showTextInput);
  };

  const toggleSpeech = () => {
    if (speechEnabled) {
      stopSpeech(); // Stop any ongoing speech
    }
    setSpeechEnabled(!speechEnabled);
    toast({
      title: speechEnabled ? "🔇 Speech Disabled" : "🔊 Speech Enabled",
      description: speechEnabled ? "AI responses will be silent" : "AI responses will be spoken",
    });
  };

  // Test speech synthesis function
  const testSpeech = () => {
    console.log('🧪 Testing speech synthesis...');
    console.log('Speech enabled:', speechEnabled);
    console.log('Speech supported:', speechSupported);
    console.log('Is speaking:', isSpeaking);
    
    if (speechEnabled && speechSupported) {
      speak("This is a test of the speech synthesis system.", userLanguage || 'en');
    } else {
      console.log('🔇 Cannot test speech - not enabled or not supported');
      
      // Try to force speech synthesis even if not detected as supported
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        console.log('🧪 Attempting to force speech synthesis...');
        try {
          const utterance = new SpeechSynthesisUtterance("This is a forced test of speech synthesis.");
          utterance.onstart = () => console.log('🎤 Forced speech started');
          utterance.onend = () => console.log('🎤 Forced speech ended');
          utterance.onerror = (error) => console.error('🎤 Forced speech error:', error);
          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('🎤 Forced speech failed:', error);
        }
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Enhanced API call with comprehensive travel assistance
      const response = await fetch('/api/chat-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: currentMessage,
          location: userLocation,
          language: userLanguage,
          includeEmergencyContacts: true,
          includeTravelTips: true,
          includeEvents: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Generate comprehensive suggestions based on AI response
      const locationSuggestions = generateLocationSuggestions(currentMessage, data.response);
      const travelTips = generateTravelTips(currentMessage, data);
      const emergencyContacts = generateEmergencyContacts(currentMessage, data);
      const events = generateEvents(currentMessage, data);
      
      const aiResponse = {
        id: Date.now().toString(),
        type: 'ai' as const,
        content: data.response,
        timestamp: new Date(),
        suggestions: locationSuggestions,
        webSearchResults: data.webSearchResults,
        travelTips,
        emergencyContacts,
        events
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Speak the AI response if speech is enabled
      if (speechEnabled && speechSupported) {
        // Extract just the text content for speech (remove any HTML/markdown)
        const cleanText = data.response.replace(/<[^>]*>/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
        console.log('🔊 Speaking AI response:', cleanText.substring(0, 100) + '...');
        speak(cleanText, userLanguage || 'en');
      } else {
        console.log('🔇 Speech not enabled or not supported for AI response:', { speechEnabled, speechSupported });
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateLocationSuggestions = (userMessage: string, aiResponse: string): LocationSuggestion[] => {
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // Enhanced location suggestions with more categories
    if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerResponse.includes('restaurant')) {
      return [
        {
          id: '1',
          name: 'Le Petit Bistrot',
          type: 'restaurant',
          address: '123 Rue de la Paix, Paris',
          rating: 4.5,
          price: '$$',
          distance: '0.2 km',
          description: 'Authentic French cuisine with a cozy atmosphere',
          phone: '+33 1 23 45 67 89',
          hours: '11:00 AM - 11:00 PM',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
        },
        {
          id: '2',
          name: 'Pizza Roma',
          type: 'restaurant',
          address: '456 Avenue des Champs, Paris',
          rating: 4.2,
          price: '$',
          distance: '0.5 km',
          description: 'Delicious Italian pizza and pasta',
          phone: '+33 1 98 76 54 32',
          hours: '12:00 PM - 10:00 PM',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'
        }
      ];
    } else if (lowerMessage.includes('emergency') || lowerMessage.includes('help') || lowerMessage.includes('medical') || lowerResponse.includes('emergency')) {
      return [
        {
          id: '6',
          name: 'Hôpital Saint-Louis',
          type: 'hospital',
          address: '1 Avenue Claude Vellefaux, Paris',
          rating: 4.6,
          distance: '1.2 km',
          description: '24/7 emergency medical services',
          phone: '+33 1 42 49 49 49',
          hours: '24/7',
          emergency: true
        },
        {
          id: '7',
          name: 'Police Station - 1st Arrondissement',
          type: 'police',
          address: '4 Place du Louvre, Paris',
          rating: 4.2,
          distance: '0.9 km',
          description: 'Local police station for emergencies',
          phone: '+33 1 42 97 48 48',
          hours: '24/7',
          emergency: true
        }
      ];
    } else if (lowerMessage.includes('bank') || lowerMessage.includes('atm') || lowerMessage.includes('money')) {
      return [
        {
          id: '13',
          name: 'BNP Paribas Bank',
          type: 'bank',
          address: '789 Boulevard Haussmann, Paris',
          rating: 4.3,
          distance: '0.8 km',
          description: 'Major bank with ATM and currency exchange',
          phone: '+33 1 42 98 76 54',
          hours: '8:00 AM - 6:00 PM'
        }
      ];
    } else if (lowerMessage.includes('pharmacy') || lowerMessage.includes('medicine') || lowerMessage.includes('drug')) {
      return [
        {
          id: '14',
          name: 'Pharmacie de la Madeleine',
          type: 'pharmacy',
          address: '15 Place de la Madeleine, Paris',
          rating: 4.4,
          distance: '1.1 km',
          description: '24/7 pharmacy with emergency medications',
          phone: '+33 1 42 65 43 21',
          hours: '24/7'
        }
      ];
    }

    return [];
  };

  const generateTravelTips = (userMessage: string, data: any): TravelTip[] => {
    // Use the travel tips from the backend response if available
    if (data.travelTips && Array.isArray(data.travelTips)) {
      return data.travelTips;
    }
    
    // Fallback: use local tips based on message content
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('safety') || lowerMessage.includes('emergency') || lowerMessage.includes('help')) {
      return TRAVEL_TIPS.filter(tip => tip.category === 'safety');
    } else if (lowerMessage.includes('transport') || lowerMessage.includes('travel') || lowerMessage.includes('metro')) {
      return TRAVEL_TIPS.filter(tip => tip.category === 'transport');
    } else if (lowerMessage.includes('culture') || lowerMessage.includes('local') || lowerMessage.includes('custom')) {
      return TRAVEL_TIPS.filter(tip => tip.category === 'culture');
    }
    
    return TRAVEL_TIPS.slice(0, 2);
  };

  const generateEmergencyContacts = (userMessage: string, data: any): EmergencyContact[] => {
    // Return the current country-specific emergency contacts
    return emergencyContacts.length > 0 ? emergencyContacts : [
      {
        id: 'default-police',
        name: 'Police Emergency',
        phone: '112',
        type: 'police',
        description: 'Emergency police service (International)',
        country: 'International'
      },
      {
        id: 'default-ambulance',
        name: 'Ambulance',
        phone: '112',
        type: 'ambulance',
        description: 'Emergency medical service (International)',
        country: 'International'
      },
      {
        id: 'default-fire',
        name: 'Fire Department',
        phone: '112',
        type: 'fire',
        description: 'Emergency fire service (International)',
        country: 'International'
      }
    ];
  };

  const generateEvents = (userMessage: string, data: any): EventInfo[] => {
    // Use the events from the backend response if available
    if (data.events && Array.isArray(data.events)) {
      return data.events;
    }
    
    // Fallback: check message content for event keywords
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('event') || lowerMessage.includes('show') || lowerMessage.includes('concert')) {
      return []; // Will be populated by backend
    }
    
    return [];
  };

  const handleQuickAction = (category: string) => {
    const actionMessages = {
      restaurants: "I'm looking for good restaurants near me",
      hotels: "I need hotel recommendations",
      emergency: "I need emergency assistance",
      attractions: "What attractions should I visit?",
      transport: "I need transportation options",
      shopping: "Where can I go shopping?",
      events: "What events are happening nearby?",
      prices: "I want to check prices for products"
    };

    setCurrentMessage(actionMessages[category as keyof typeof actionMessages] || '');
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const toggleEmergencyContacts = () => {
    setShowEmergencyContacts(!showEmergencyContacts);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Floating Orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/15 to-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Scanning Lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-6 z-10">


      <div className="w-full mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chat Interface */}
            <div className="lg:col-span-2">
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10">
                  <CardHeader className="border-b border-white/20">
                    <CardTitle className="flex items-center gap-4 text-white">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-400/25">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    🎤 Voice-First AI Travel Assistant
                        </div>
                        <div className="flex gap-3 mt-2">
                          <Badge className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-0 shadow-lg shadow-cyan-400/25">
                      <Globe className="w-3 h-3 mr-1" />
                      All-in-One
                    </Badge>
                          <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-0 shadow-lg shadow-emerald-400/25">
                      <Shield className="w-3 h-3 mr-1" />
                      Travel Protection
                    </Badge>
                          <Badge className="bg-gradient-to-r from-pink-400 to-purple-500 text-white border-0 shadow-lg shadow-pink-400/25">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Emergency Ready
                    </Badge>
                        </div>
                      </div>
                  </CardTitle>
                  
                  {/* Location Status */}
                    <div className="flex items-center gap-4 mt-6 p-4 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-2xl border border-cyan-400/30">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-400/25">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                    {locationLoading ? (
                        <span className="text-cyan-300 font-medium">Detecting location...</span>
                    ) : country ? (
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-300 font-semibold">
                          📍 {country.name} ({country.iso2})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCountrySelector(true)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/20 border border-cyan-400/30"
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-red-400 font-medium">Location not detected</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCountrySelector(true)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/20 border border-cyan-400/30"
                        >
                          Select Country
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                  
                  <CardContent className="p-6">
                  {/* Welcome Message */}
                    <div className="mb-8 p-6 bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-purple-500/10 border border-cyan-400/30 rounded-3xl shadow-2xl shadow-cyan-400/10">
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-400/25">
                          <Mic className="w-10 h-10 text-white" />
                      </div>
                      <div>
                          <h3 className="text-2xl font-bold text-white mb-2">Welcome to Your Futuristic Travel Assistant! 🚀</h3>
                          <p className="text-cyan-200">Experience the future of travel with AI-powered assistance.</p>
                      </div>
                    </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-cyan-400/30">
                          <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-cyan-200 font-medium">🎯 Voice interaction</span>
                      </div>
                        <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-purple-400/30">
                          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse"></div>
                          <span className="text-purple-200 font-medium">📝 Text input</span>
                      </div>
                        <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-pink-400/30">
                          <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-pulse"></div>
                          <span className="text-pink-200 font-medium">🚨 Emergency mode</span>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Voice Activation Status */}
                  {emergencyVoiceState.isEmergencyMode && (
                      <div className="mb-6 p-6 bg-gradient-to-br from-red-400/20 to-pink-500/20 border border-red-400/40 rounded-3xl shadow-2xl shadow-red-400/20 animate-pulse">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-400/25">
                            <AlertTriangle className="w-8 h-8 text-white" />
                      </div>
                          <div>
                            <span className="text-2xl font-bold text-red-300">🚨 EMERGENCY MODE ACTIVATED</span>
                            <p className="text-red-200">Say one of the following commands:</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <Button size="sm" className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg shadow-red-400/25 hover:from-red-500 hover:to-pink-600">
                          <PhoneCall className="w-3 h-3 mr-1" />
                          "Police"
                        </Button>
                          <Button size="sm" className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg shadow-red-400/25 hover:from-red-500 hover:to-pink-600">
                          <Heart className="w-3 h-3 mr-1" />
                          "Ambulance"
                        </Button>
                          <Button size="sm" className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg shadow-red-400/25 hover:from-red-500 hover:to-pink-600">
                          <Zap className="w-3 h-3 mr-1" />
                          "Fire"
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                          className="mt-4 text-red-300 border-red-400/50 hover:bg-red-400/20"
                        onClick={() => setEmergencyVoiceState(prev => ({ ...prev, isEmergencyMode: false }))}
                      >
                        Exit Emergency Mode
                      </Button>
                    </div>
                  )}

                  {/* Voice Commands Help */}
                    <div className="mb-6 p-6 bg-gradient-to-br from-blue-400/10 via-purple-500/10 to-pink-500/10 border border-blue-400/30 rounded-3xl shadow-2xl shadow-blue-400/10">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-400/25">
                          <Mic className="w-8 h-8 text-white" />
                    </div>
                        <h3 className="text-2xl font-bold text-white">🎤 Voice Commands Guide</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-cyan-300 mb-4">🚨 Emergency Commands:</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-cyan-400/30">
                              <span className="text-cyan-300 font-bold">"Hey Now"</span>
                              <span className="text-gray-300">- Activate AI assistant</span>
                      </div>
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-red-400/30">
                              <span className="text-red-300 font-bold">"Help help"</span>
                              <span className="text-gray-300">- Activate emergency mode</span>
                    </div>
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-red-400/30">
                              <span className="text-red-300 font-bold">"Call police"</span>
                              <span className="text-gray-300">- Contact police</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-semibold text-purple-300 mb-4">🗺️ Travel Commands:</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-purple-400/30">
                              <span className="text-purple-300 font-bold">"Find restaurants"</span>
                              <span className="text-gray-300">- Search for dining</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-purple-400/30">
                              <span className="text-purple-300 font-bold">"Hotel recommendations"</span>
                              <span className="text-gray-300">- Find accommodation</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-purple-400/30">
                              <span className="text-purple-300 font-bold">"Check prices"</span>
                              <span className="text-gray-300">- Compare product prices</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-blue-400/30">
                        <p className="text-sm text-cyan-200">
                        💡 <strong>Pro Tip:</strong> Just speak naturally! I understand conversational language and will help you with whatever you need.
                      </p>
                    </div>
                  </div>

                  {/* Voice Recognition Status */}
                  {emergencyVoiceState.isListening && (
                      <div className="mb-6 p-6 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 border border-emerald-400/30 rounded-3xl shadow-2xl shadow-emerald-400/10">
                        <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-400/25">
                              <Mic className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full animate-ping"></div>
                        </div>
                        <div className="flex-1">
                            <span className="text-2xl font-bold text-emerald-300 mb-3 block">
                            🎤 Voice Recognition Active
                          </span>
                            <div className="flex space-x-2">
                              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
                              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                          </div>
                        </div>
                          <div className="text-right space-y-3">
                            <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-0 shadow-lg shadow-emerald-400/25">
                            <Volume2 className="w-3 h-3 mr-1" />
                            Auto-Listen: {autoListenMode ? 'ON' : 'OFF'}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={toggleAutoListenMode}
                              className="text-xs border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/20"
                          >
                            {autoListenMode ? 'Disable' : 'Enable'} Auto-Listen
                          </Button>
                        </div>
                      </div>
                        <p className="text-sm text-emerald-200 mt-4">
                        💡 <strong>Voice Commands:</strong> "Hey Now" to activate, "Help help" for emergency, "Stop listening" to pause, or just speak naturally
                      </p>
                    </div>
                  )}

                  {/* Voice Feedback */}
                  {voiceFeedback && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/30 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-400/25">
                            <Volume2 className="w-5 h-5 text-white" />
                      </div>
                          <span className="text-sm font-semibold text-cyan-300">{voiceFeedback}</span>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                    <div className="h-96 overflow-y-auto space-y-4 mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/20">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md p-4 rounded-3xl shadow-2xl ${
                          message.type === 'user' 
                              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-cyan-400/25' 
                              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white'
                        }`}>
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          
                          {/* Emergency Contacts */}
                          {message.emergencyContacts && message.emergencyContacts.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-xs font-bold text-red-300">
                                  Emergency Contacts
                                </span>
                              </div>
                              {message.emergencyContacts.map((contact) => (
                                  <Card key={contact.id} className="bg-gradient-to-r from-red-400/10 to-pink-500/10 border-red-400/30 shadow-lg shadow-red-400/10">
                                    <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                                        {getEmergencyContactIcon(contact.type)}
                                          </div>
                                        <div>
                                            <h4 className="font-bold text-xs text-red-200">{contact.name}</h4>
                                            <p className="text-xs text-red-300">{contact.description}</p>
                                        </div>
                                      </div>
                                      <Button 
                                        size="sm" 
                                          className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg shadow-red-400/25"
                                        onClick={() => makeEmergencyCall(contact.type, contact.phone)}
                                      >
                                        {contact.phone}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* Travel Tips */}
                          {message.travelTips && message.travelTips.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                                    <Info className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-xs font-bold text-cyan-300">
                                  Travel Tips
                                </span>
                              </div>
                              {message.travelTips.map((tip) => (
                                  <Card key={tip.id} className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border-cyan-400/30 shadow-lg shadow-cyan-400/10">
                                <CardContent className="p-3">
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                                          <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                        <div>
                                          <h4 className="font-bold text-xs text-cyan-200">{tip.title}</h4>
                                          <p className="text-xs text-cyan-300">{tip.description}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* Location Suggestions */}
                          {message.suggestions && message.suggestions.length > 0 && (
                              <div className="mt-4 space-y-3">
                              {message.suggestions.map((suggestion) => (
                                  <Card key={suggestion.id} className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                                    <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-bold text-sm text-white">{suggestion.name}</h4>
                                          {suggestion.emergency && (
                                              <Badge className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg shadow-red-400/25">
                                              <AlertTriangle className="w-3 h-3 mr-1" />
                                              Emergency
                                            </Badge>
                                          )}
                                        </div>
                                          <p className="text-xs text-gray-300 mb-2">{suggestion.address}</p>
                                          <div className="flex items-center gap-2 mb-2">
                                          {suggestion.rating && (
                                            <div className="flex items-center gap-1">
                                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-xs font-medium text-yellow-300">{suggestion.rating}</span>
                                            </div>
                                          )}
                                          {suggestion.price && (
                                              <Badge variant="secondary" className="text-xs bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
                                              {suggestion.price}
                                            </Badge>
                                          )}
                                          {suggestion.distance && (
                                              <Badge variant="outline" className="text-xs border-cyan-400/30 text-cyan-300">
                                              {suggestion.distance}
                                            </Badge>
                                          )}
                                        </div>
                                        {suggestion.description && (
                                            <p className="text-xs text-gray-300">
                                            {suggestion.description}
                                          </p>
                                        )}
                                      </div>
                                        <div className="flex flex-col gap-2">
                                          <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20">
                                          <MapPin className="w-3 h-3" />
                                        </Button>
                                        {suggestion.phone && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                              className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/20"
                                            onClick={() => makeEmergencyCall(suggestion.type, suggestion.phone!)}
                                          >
                                            <Phone className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-3xl border border-white/20 shadow-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Voice Controls - Primary Interface */}
                    <div className="mb-8">
                      <div className="flex flex-col items-center gap-6">
                      {/* Main Voice Control */}
                      <div className="relative">
                        <Button
                          size="lg"
                          variant={isRecording ? "destructive" : "default"}
                          onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                          disabled={!emergencyVoiceState.recognition}
                            className={`h-28 w-28 rounded-full transition-all duration-500 shadow-2xl ${
                            isRecording 
                                ? 'bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 animate-pulse shadow-red-400/25' 
                                : 'bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 shadow-cyan-400/25'
                          }`}
                        >
                          {isRecording ? (
                              <VolumeX className="w-14 h-14" />
                          ) : (
                              <Mic className="w-14 h-14" />
                          )}
                        </Button>
                        
                        {/* Voice Activity Rings */}
                        {isRecording && (
                          <>
                              <div className="absolute inset-0 rounded-full border-4 border-red-400/50 animate-ping"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-red-300/50 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                              <div className="absolute inset-0 rounded-full border-4 border-red-200/50 animate-ping" style={{ animationDelay: '1s' }}></div>
                          </>
                        )}
                      </div>
                      
                      {/* Voice Status and Controls */}
                        <div className="text-center space-y-3">
                          <div className="text-3xl font-bold text-white">
                          {isRecording ? '🎤 Listening...' : '🎤 Tap to speak'}
                        </div>
                          <div className="text-sm text-cyan-200">
                          {autoListenMode ? '🔄 Auto-listen enabled' : '⏸️ Manual mode'}
                        </div>
                        
                        {/* Voice Control Buttons */}
                          <div className="flex gap-3 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleAutoListenMode}
                              className="bg-white/10 backdrop-blur-sm border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20 shadow-lg shadow-cyan-400/10"
                          >
                            {autoListenMode ? '🔄 Disable Auto-Listen' : '🔄 Enable Auto-Listen'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleSpeech}
                              className={`bg-white/10 backdrop-blur-sm shadow-lg ${
                                speechEnabled 
                                  ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/20 shadow-emerald-400/10' 
                                  : 'border-gray-400/30 text-gray-300 hover:bg-gray-400/20'
                              }`}
                          >
                            {speechEnabled ? '🔊 Speech ON' : '🔇 Speech OFF'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={testSpeech}
                              className="bg-white/10 backdrop-blur-sm border-purple-400/30 text-purple-300 hover:bg-purple-400/20 shadow-lg shadow-purple-400/10"
                          >
                            🧪 Test Speech
                          </Button>
                          
                          {isRecording && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={stopVoiceRecognition}
                                className="bg-white/10 backdrop-blur-sm border-red-400/30 text-red-300 hover:bg-red-400/20 shadow-lg shadow-red-400/10"
                            >
                              ⏹️ Stop
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Voice Tips */}
                        <div className="text-center max-w-md p-4 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-3xl border border-cyan-400/30 shadow-2xl shadow-cyan-400/10">
                          <p className="text-sm text-cyan-200">
                          💡 <strong>Voice Tips:</strong> Speak clearly and naturally. 
                          Say "help help" for emergencies, or ask about restaurants, hotels, prices, and more.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Text Input - Collapsible and Secondary */}
                    <div className="mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTextInput}
                        className="w-full mb-3 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 shadow-lg"
                    >
                      {showTextInput ? 'Hide Text Input' : 'Show Text Input (Fallback)'}
                    </Button>
                    
                    {showTextInput && (
                        <div className="flex gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 shadow-lg">
                        <Input
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          placeholder="Type your message here (voice is preferred)..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 border-white/20 bg-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={isLoading} 
                            size="sm"
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-0 shadow-lg shadow-cyan-400/25 hover:from-cyan-500 hover:to-blue-600"
                          >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Sidebar */}
              <div className="space-y-6">
              {/* Emergency Services */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-red-400/10">
                  <CardHeader className="border-b border-white/20">
                    <CardTitle className="flex items-center gap-3 text-white">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-400/25">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      Emergency Services
                    </CardTitle>
                </CardHeader>
                  <CardContent className="space-y-3">
                  {EMERGENCY_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant="outline"
                        className="w-full justify-start bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white shadow-sm"
                      onClick={() => handleQuickAction(category.id)}
                    >
                      <category.icon className="w-4 h-4 mr-2" />
                      {category.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Travel Categories */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10">
                  <CardHeader className="border-b border-white/20">
                    <CardTitle className="flex items-center gap-3 text-white">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-400/25">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      Travel Help
                    </CardTitle>
                </CardHeader>
                  <CardContent className="space-y-3">
                  {TRAVEL_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant="outline"
                        className="w-full justify-start bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white shadow-sm"
                      onClick={() => handleQuickAction(category.id)}
                    >
                      <category.icon className="w-4 h-4 mr-2" />
                      {category.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Current Location */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-emerald-400/10">
                  <CardHeader className="border-b border-white/20">
                    <CardTitle className="flex items-center gap-3 text-white">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-400/25">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      Current Location
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-400/10 to-teal-500/10 rounded-2xl border border-emerald-400/30">
                      <MapPin className="w-4 h-4 text-emerald-300" />
                      <span className="text-sm font-medium text-emerald-200">{userLocation}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      
      </div>
      
      {/* Country Selector Modal */}
      {showCountrySelector && (
        <CountrySelector
          onSelect={(selectedCountry) => {
            setCountry(selectedCountry);
            setShowCountrySelector(false);
            toast({
              title: "Country Updated",
              description: `Emergency contacts will be updated for ${selectedCountry.name}`,
            });
          }}
          onClose={() => setShowCountrySelector(false)}
          currentCountry={country}
        />
      )}
      </div>
    // </div>
  );
} 