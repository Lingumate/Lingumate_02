'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleStyleVoiceInputProps {
  onRecordingComplete: (audioDataUri: string, transcribedText?: string) => void;
  disabled?: boolean;
  className?: string;
  language?: string;
}

export default function GoogleStyleVoiceInput({
  onRecordingComplete,
  disabled = false,
  className,
  language = 'en-US'
}: GoogleStyleVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google-style speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Google-style settings for better accuracy
      recognitionRef.current.continuous = false; // Single utterance like Google
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = language;

      recognitionRef.current.onstart = () => {
        console.log('🎤 Google-style speech recognition started');
        setIsListening(true);
        setRecognitionError(null);
        
        // Auto-stop after 10 seconds (Google-like behavior)
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 10000);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            console.log('✅ Google-style final transcript:', transcript, 'confidence:', confidence);
          } else {
            interimTranscript += transcript;
            console.log('🎤 Google-style interim transcript:', transcript);
          }
        }

        if (finalTranscript) {
          setTranscribedText(finalTranscript);
          setInterimText('');
          console.log('✅ Final Google-style transcript:', finalTranscript);
        }
        
        if (interimTranscript) {
          setInterimText(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Google-style speech recognition error:', event.error);
        setRecognitionError(event.error);
        setIsListening(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Google-style speech recognition ended');
        setIsListening(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Auto-process if we have transcribed text
        if (transcribedText && isRecording) {
          stopRecording();
        }
      };
    }
  }, [language, transcribedText, isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscribedText('');
      setInterimText('');
      setRecognitionError(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            console.log('🎤 GOOGLE-STYLE DEBUG: Audio recording completed');
            console.log('🎤 GOOGLE-STYLE DEBUG: Transcribed text:', transcribedText);
            console.log('🎤 GOOGLE-STYLE DEBUG: Audio data length:', base64Audio.length);
            onRecordingComplete(base64Audio, transcribedText);
          }
          setIsProcessing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start Google-style speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.log('Google-style speech recognition already started or not supported');
          setRecognitionError('Speech recognition not available');
        }
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setRecognitionError('Could not access microphone');
      alert('Could not access the microphone. Please check your browser permissions.');
    }
  }, [onRecordingComplete, transcribedText]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Google-style speech recognition already stopped');
      }
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const browserSupportsSpeechRecognition = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className={cn("text-center p-4", className)}>
        <p className="text-sm text-gray-500">
          Your browser doesn't support speech recognition. Please use Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Google-style Voice Button */}
      <Button
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
          isRecording && "animate-pulse bg-red-500 hover:bg-red-600",
          !isRecording && "bg-blue-500 hover:bg-blue-600"
        )}
      >
        {isRecording ? (
          <Square className="w-6 h-6 text-white" />
        ) : isProcessing ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </Button>

      {/* Google-style Status Messages */}
      {isRecording && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span>Recording...</span>
        </div>
      )}

      {isListening && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span>Listening... (speak now)</span>
        </div>
      )}

      {isProcessing && (
        <div className="text-sm text-gray-600">
          Processing...
        </div>
      )}

      {/* Google-style Real-time Speech Display */}
      {(transcribedText || interimText) && (
        <div className="max-w-xs p-4 bg-white border border-gray-200 rounded-lg shadow-md">
          <div className="text-xs text-gray-600 mb-2 font-medium">🎤 Google-style Voice Input:</div>
          
          {/* Final transcribed text */}
          {transcribedText && (
            <div className="text-sm text-gray-800 mb-2 p-2 bg-green-50 border border-green-200 rounded">
              <span className="font-medium text-green-700">✓ Final:</span> {transcribedText}
            </div>
          )}
          
          {/* Interim text (what you're currently saying) */}
          {interimText && (
            <div className="text-sm text-gray-500 italic p-2 bg-blue-50 border border-blue-200 rounded">
              <span className="font-medium text-blue-700">🎤 Speaking:</span> {interimText}
            </div>
          )}
          
          {/* Debug info */}
          <div className="text-xs text-gray-400 mt-2">
            {transcribedText ? `✅ Ready to translate: "${transcribedText}"` : '🎤 Listening...'}
          </div>
        </div>
      )}

      {/* Error Display */}
      {recognitionError && (
        <div className="max-w-xs p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs text-red-600 mb-1">❌ Error:</div>
          <div className="text-sm text-red-700">{recognitionError}</div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        <p className="font-medium mb-1">Google-style Voice Recognition</p>
        <p>Click and speak clearly. Auto-stops after 10 seconds.</p>
        <p>Language: {language}</p>
      </div>
    </div>
  );
}
