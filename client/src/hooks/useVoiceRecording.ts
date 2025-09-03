import { useState, useRef, useCallback } from 'react';
import { VoiceRecordingState } from '@/types/conversation';

export function useVoiceRecording() {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setRecordingState(prev => ({
          ...prev,
          audioData: audioBlob,
          isRecording: false,
        }));

        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      startTime.current = Date.now();
      
      // Update duration every 100ms
      durationInterval.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - startTime.current,
        }));
      }, 100);

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
      }));
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordingState({
      isRecording: false,
      isProcessing: false,
      duration: 0,
    });
    audioChunks.current = [];
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setRecordingState(prev => ({
      ...prev,
      isProcessing: processing,
    }));
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    clearRecording,
    setProcessing,
  };
}
