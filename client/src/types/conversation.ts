export interface ConversationSession {
  id: string;
  user1Language: string;
  user2Language: string;
  status: 'active' | 'ended';
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  audioUrl?: string;
  timestamp: string;
  latency?: {
    total: number;
    speechToText: number;
    translation: number;
    textToSpeech: number;
  };
}

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  audioData?: Blob;
  duration: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  audioData?: string; // base64
  senderId?: number; // ID of the speaker (1 or 2)
  latency?: {
    total: number;
    speechToText: number;
    translation: number;
    textToSpeech: number;
  };
}

export interface RecommendationItem {
  id: string;
  name: string;
  type: 'restaurant' | 'attraction' | 'emergency';
  rating?: number;
  distance: string;
  status: string;
  image: string;
}

export interface SummaryItem {
  id: string;
  title: string;
  transcription?: string;
  summary?: string;
  duration?: number;
  summaryDuration?: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}
