'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedMicrophoneProps {
  onRecordingComplete: (audioDataUri: string, transcribedText?: string) => void;
  disabled?: boolean;
  className?: string;
  language?: string;
  languageLabel?: string;
  author?: 'user' | 'other';
}

export default function EnhancedMicrophone({
  onRecordingComplete,
  disabled = false,
  className,
  language = 'en-US',
  languageLabel = 'English',
  author = 'user'
}: EnhancedMicrophoneProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
      };

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
          setTranscribedText(prev => prev + finalTranscript);
          setInterimText(''); // Clear interim when final is available
          console.log('✅ Final transcript:', finalTranscript);
        }
        
        // Show interim results in real-time
        if (interimTranscript) {
          setInterimText(interimTranscript);
          console.log('🎤 Interim transcript:', interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
      };
    }
  }, [language]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscribedText('');
      setInterimText('');

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
            console.log('🎤 FRONTEND DEBUG: Audio recording completed');
            console.log('🎤 FRONTEND DEBUG: Transcribed text:', transcribedText);
            console.log('🎤 FRONTEND DEBUG: Audio data length:', base64Audio.length);
            onRecordingComplete(base64Audio, transcribedText);
          }
          setIsProcessing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.log('Speech recognition already started or not supported');
        }
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
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
        console.log('Speech recognition already stopped');
      }
    }
  }, []);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const browserSupportsMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder;

  if (!browserSupportsMediaRecorder) {
    return (
      <div className={cn("text-center p-4", className)}>
        <p className="text-sm text-gray-500">
          Your browser doesn't support audio recording. Please use a modern browser.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Recording Button */}
      <Button
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all",
          isRecording && "animate-pulse"
        )}
      >
        {isRecording ? (
          <Square className="w-6 h-6" />
        ) : isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>

      {/* Status Messages */}
      {isRecording && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span>Recording...</span>
        </div>
      )}

      {isListening && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span>Listening...</span>
        </div>
      )}

      {isProcessing && (
        <div className="text-sm text-gray-600">
          Processing audio...
        </div>
      )}

      {/* Real-time Speech Display */}
      {(transcribedText || interimText) && (
        <div className="max-w-xs p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">🎤 Real-time Speech:</div>
          
          {/* Final transcribed text */}
          {transcribedText && (
            <div className="text-sm text-gray-800 mb-1">
              <span className="font-medium">Final:</span> {transcribedText}
            </div>
          )}
          
          {/* Interim text (what you're currently saying) */}
          {interimText && (
            <div className="text-sm text-gray-500 italic">
              <span className="font-medium">Speaking:</span> {interimText}
            </div>
          )}
          
          {/* Debug info */}
          <div className="text-xs text-gray-400 mt-2">
            {transcribedText ? `✅ Transcribed: "${transcribedText}"` : '🎤 Listening...'}
          </div>
        </div>
      )}

      {/* Language Info */}
      <div className="text-xs text-gray-500 text-center">
        <p>{languageLabel} ({author === 'user' ? 'You' : 'Other'})</p>
        <p>Language: {language}</p>
      </div>
    </div>
  );
}
