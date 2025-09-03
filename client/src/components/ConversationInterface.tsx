import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EnhancedMicrophone from './EnhancedMicrophone';
import GoogleStyleVoiceInput from './GoogleStyleVoiceInput';
import AudioPlayer from './AudioPlayer';
import { Mic, MicOff, ArrowLeftRight } from 'lucide-react';
import { ConversationMessage, TranslationResult } from '@/types/conversation';
import { useToast } from '@/hooks/use-toast';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

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

interface ConversationInterfaceProps {
  conversationId?: string;
}

export default function ConversationInterface({ conversationId }: ConversationInterfaceProps) {
  const [user1Language, setUser1Language] = useState('en');
  const [user2Language, setUser2Language] = useState('fr');
  const [activeUser, setActiveUser] = useState<1 | 2>(1);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('openai');
  const [isTranslating, setIsTranslating] = useState(false);
  const [latencyStats, setLatencyStats] = useState<{
    total: number;
    speechToText: number;
    translation: number;
    textToSpeech: number;
    count: number;
  } | null>(null);
  const [manualText, setManualText] = useState('');
  const [useGoogleStyle, setUseGoogleStyle] = useState(true);
  
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const { toast } = useToast();
  const { speak, isSpeaking } = useTextToSpeech();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Fetch current model info
    const fetchCurrentModel = async () => {
      try {
        const response = await fetch('/api/models/active', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentModel(data.currentModelInfo?.name || 'openai');
        }
      } catch (error) {
        console.error('Error fetching current model:', error);
      }
    };
    
    fetchCurrentModel();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleWebSocketMessage = (message: any) => {
    console.log('Handling WebSocket message:', message.type, message);
    
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established');
        break;
        
      case 'translation_result':
        const result: TranslationResult = message.data;
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          senderId: result.senderId?.toString() || activeUser.toString(),
          originalText: result.originalText,
          translatedText: result.translatedText,
          originalLanguage: result.originalLanguage,
          targetLanguage: result.targetLanguage,
          timestamp: new Date().toISOString(),
          latency: result.latency,
        };
        setMessages(prev => [...prev, newMessage]);
        
        // Use text-to-speech for the translated text
        speak(result.translatedText, result.targetLanguage);
        
        setIsTranslating(false);
        console.log(`🎉 Translation received at ${new Date().toLocaleTimeString()}`);
        console.log(`📄 Original: "${result.originalText}"`);
        console.log(`🌐 Translated: "${result.translatedText}"`);
        
        // Log latency information if available
        if (result.latency) {
          console.log('📊 LATENCY BREAKDOWN:');
          console.log(`   🎤 Speech-to-Text: ${result.latency.speechToText.toFixed(2)} ms`);
          console.log(`   🔄 Translation: ${result.latency.translation.toFixed(2)} ms`);
          console.log(`   🔊 Text-to-Speech: ${result.latency.textToSpeech.toFixed(2)} ms`);
          console.log(`   ⏱️ Total Pipeline: ${result.latency.total.toFixed(2)} ms`);
          
          // Update latency statistics
          updateLatencyStats(result.latency);
        }
        
        toast({
          title: "Translation Complete",
          description: `Translated using ${currentModel}${result.latency ? ` (${result.latency.total.toFixed(0)}ms)` : ''}`,
        });
        break;
      
      case 'conversation_started':
        setIsConversationActive(true);
        toast({
          title: "Conversation Started",
          description: "You can now start translating in real-time",
        });
        break;
      
      case 'error':
        console.error('WebSocket error:', message.message);
        setIsTranslating(false);
        toast({
          title: "Translation Error",
          description: message.message || "Failed to process translation",
          variant: "destructive",
        });
        break;
        
      default:
        console.log('Unhandled WebSocket message type:', message.type);
        break;
    }
  };

  const playAudioData = (base64Audio: string) => {
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audio.play().catch(console.error);
  };

  const startConversation = () => {
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please wait for the connection to be established",
        variant: "destructive",
      });
      return;
    }

    sendMessage({
      type: 'start_conversation',
      sessionId: conversationId || Date.now().toString(),
      user1Language,
      user2Language,
    });
  };

  const handleVoiceRecording = async (audioDataUri: string, transcribedText?: string) => {
    if (!isConversationActive) {
      toast({
        title: "Conversation Not Started",
        description: "Please start the conversation first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTranslating(true);
      
      // Extract base64 data from data URI
      const base64Audio = audioDataUri.split(',')[1];
      
      const targetLanguage = activeUser === 1 ? user2Language : user1Language;
      const sourceLanguage = activeUser === 1 ? user1Language : user2Language;

      console.log('🎤 CONVERSATION DEBUG: Voice recording received');
      console.log('🎤 CONVERSATION DEBUG: Transcribed text from frontend:', transcribedText);
      console.log('🎤 CONVERSATION DEBUG: Audio data length:', base64Audio.length);
      console.log(`🎤 Sending audio for translation using ${currentModel}`);
      console.log(`📝 From ${getLanguageInfo(sourceLanguage).name} to ${getLanguageInfo(targetLanguage).name}`);
      console.log(`⏱️ Starting translation at ${new Date().toLocaleTimeString()}`);

      sendMessage({
        type: 'voice_translation',
        audioData: base64Audio,
        targetLanguage,
        sourceLanguage,
        senderId: activeUser,
        transcribedText: transcribedText,
      });
    } catch (error) {
      setIsTranslating(false);
      toast({
        title: "Recording Error",
        description: "Failed to process voice recording",
        variant: "destructive",
      });
    }
  };

  const getLanguageInfo = (code: string) => {
    return LANGUAGE_OPTIONS.find(lang => lang.code === code) || LANGUAGE_OPTIONS[0];
  };

  const updateLatencyStats = (newLatency: any) => {
    setLatencyStats(prev => {
      if (!prev) {
        return {
          total: newLatency.total,
          speechToText: newLatency.speechToText,
          translation: newLatency.translation,
          textToSpeech: newLatency.textToSpeech,
          count: 1,
        };
      }
      
      return {
        total: (prev.total * prev.count + newLatency.total) / (prev.count + 1),
        speechToText: (prev.speechToText * prev.count + newLatency.speechToText) / (prev.count + 1),
        translation: (prev.translation * prev.count + newLatency.translation) / (prev.count + 1),
        textToSpeech: (prev.textToSpeech * prev.count + newLatency.textToSpeech) / (prev.count + 1),
        count: prev.count + 1,
      };
    });
  };

  const handleManualTranslation = async () => {
    if (!manualText.trim() || !isConversationActive) {
      toast({
        title: "Invalid Input",
        description: "Please enter text to translate",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTranslating(true);
      
      const targetLanguage = activeUser === 1 ? user2Language : user1Language;
      const sourceLanguage = activeUser === 1 ? user1Language : user2Language;

      console.log('🎤 MANUAL DEBUG: Manual translation requested');
      console.log('🎤 MANUAL DEBUG: Text to translate:', manualText);
      console.log('🎤 MANUAL DEBUG: From', sourceLanguage, 'to', targetLanguage);

      sendMessage({
        type: 'voice_translation',
        audioData: '', // Empty for manual mode
        targetLanguage,
        sourceLanguage,
        senderId: activeUser,
        transcribedText: manualText,
      });

      setManualText(''); // Clear the input
    } catch (error) {
      setIsTranslating(false);
      toast({
        title: "Translation Error",
        description: "Failed to process manual translation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Language Selection */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {/* Speaker 1 Language */}
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700">Speaker 1</div>
              <Select value={user1Language} onValueChange={setUser1Language}>
                <SelectTrigger className="w-40" data-testid="select-user1-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language Swap */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const temp = user1Language;
              setUser1Language(user2Language);
              setUser2Language(temp);
            }}
            className="p-2"
            data-testid="button-swap-languages"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>

          {/* Speaker 2 Language */}
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700">Speaker 2</div>
              <Select value={user2Language} onValueChange={setUser2Language}>
                <SelectTrigger className="w-40" data-testid="select-user2-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Start Conversation Button */}
        {!isConversationActive && (
          <div className="text-center">
            <Button 
              onClick={startConversation}
              className="bg-primary hover:bg-primary/90"
              disabled={!isConnected}
              data-testid="button-start-conversation"
            >
              Start Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Conversation Messages */}
      {isConversationActive && (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 max-h-96 overflow-y-auto">
            {/* Latency Statistics */}
            {latencyStats && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="text-center mb-2">
                  <span className="text-sm font-medium text-gray-700">📊 Performance Metrics (Avg. of {latencyStats.count} translations)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{latencyStats.total.toFixed(0)}ms</div>
                    <div className="text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-500">{latencyStats.speechToText.toFixed(0)}ms</div>
                    <div className="text-gray-500">Speech→Text</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{latencyStats.translation.toFixed(0)}ms</div>
                    <div className="text-gray-500">Translation</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-purple-600">{latencyStats.textToSpeech.toFixed(0)}ms</div>
                    <div className="text-gray-500">Text→Speech</div>
                  </div>
                </div>
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8" data-testid="text-no-messages">
                <div className="mb-4">
                  <div className="text-4xl mb-2">🎤</div>
                  <p className="text-lg font-medium">Ready for translation</p>
                </div>
                <p className="text-sm">Select a speaker and start recording to begin the AI translation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {/* Speaker indicator */}
                    <div className="text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Speaker {message.senderId} spoke
                      </span>
                    </div>
                    
                    {/* Original message */}
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-md p-3 max-w-xs">
                        <div className="text-xs text-gray-500 mb-1">
                          {getLanguageInfo(message.originalLanguage).flag} {getLanguageInfo(message.originalLanguage).name}
                        </div>
                        <p className="text-sm text-gray-800" data-testid={`text-original-${message.id}`}>
                          {message.originalText}
                        </p>
                      </div>
                    </div>
                    
                    {/* AI Translator indicator */}
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">
                        <span>🤖</span>
                        <span>AI Translator</span>
                        <span>→</span>
                        <span>{getLanguageInfo(message.targetLanguage).flag}</span>
                      </div>
                    </div>
                    
                    {/* Translated message */}
                    <div className="flex justify-end">
                      <div className="bg-primary text-white rounded-2xl rounded-br-md p-3 max-w-xs">
                        <div className="text-xs text-white/70 mb-1">
                          {getLanguageInfo(message.targetLanguage).flag} {getLanguageInfo(message.targetLanguage).name}
                        </div>
                        <p className="text-sm" data-testid={`text-translated-${message.id}`}>
                          {message.translatedText}
                        </p>
                      </div>
                    </div>
                    
                    {/* Latency information */}
                    {message.latency && (
                      <div className="text-center mt-2">
                        <div className="inline-flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">
                          <span className="text-xs text-gray-600">⏱️</span>
                          <span className="text-xs text-gray-600 font-medium">
                            Total: {message.latency.total.toFixed(0)}ms
                          </span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-blue-600">
                            STT: {message.latency.speechToText.toFixed(0)}ms
                          </span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-green-600">
                            TR: {message.latency.translation.toFixed(0)}ms
                          </span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-purple-600">
                            TTS: {message.latency.textToSpeech.toFixed(0)}ms
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Translator Interface */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold mb-2">🤖 AI Translator Active</h3>
              <p className="text-sm opacity-90">
                I'm translating between {getLanguageInfo(user1Language).name} and {getLanguageInfo(user2Language).name}
              </p>
              <div className="flex items-center justify-center mt-2">
                <div className="bg-white/20 rounded-full px-3 py-1">
                  <span className="text-xs font-medium">
                    Powered by {currentModel.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
              
              <h3 className="text-lg font-semibold mb-4">AI Translator Active</h3>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  The AI will automatically detect the language and translate between {getLanguageInfo(user1Language).name} and {getLanguageInfo(user2Language).name}
                </p>
                <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    🎯 Just speak naturally - AI will handle the translation automatically!
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    AI Translator Ready - Speak in any language
                  </span>
                </div>
              </div>
              
                          {/* Voice Input Method Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-xs text-gray-600">Voice Input Method:</span>
                  <button
                    onClick={() => setUseGoogleStyle(true)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      useGoogleStyle 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Google-style
                  </button>
                  <button
                    onClick={() => setUseGoogleStyle(false)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      !useGoogleStyle 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Standard
                  </button>
                </div>
              </div>

              {/* Voice Input Component */}
              {useGoogleStyle ? (
                <GoogleStyleVoiceInput
                  onRecordingComplete={handleVoiceRecording}
                  disabled={!isConnected || !isConversationActive || isTranslating}
                  className="items-center"
                  language="en-US"
                />
              ) : (
                <EnhancedMicrophone
                  onRecordingComplete={handleVoiceRecording}
                  disabled={!isConnected || !isConversationActive || isTranslating}
                  className="items-center"
                  language="auto"
                  languageLabel="Auto-detect"
                  author="auto"
                />
              )}
            
            {isTranslating && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-700">
                    Translating with {currentModel}...
                  </span>
                </div>
              </div>
            )}
              
              <p className="text-xs text-gray-500 mt-2">
                Tap to record. AI will automatically detect the language and translate it.
              </p>
              
              {/* Manual Text Input as Backup */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs text-gray-600 mb-2">📝 Manual Text Input (if speech recognition fails):</div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your message here..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && manualText.trim()) {
                        handleManualTranslation();
                      }
                    }}
                  />
                  <button
                    onClick={handleManualTranslation}
                    disabled={!manualText.trim() || !isConversationActive || isTranslating}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Translate
                  </button>
                </div>
              </div>
            </div>

            {!isConnected && (
              <div className="text-center text-red-600 text-sm mt-4" data-testid="text-connection-status">
                Connecting to translation service...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
