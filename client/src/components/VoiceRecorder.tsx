import React from 'react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceRecorder({ onRecordingComplete, disabled, className }: VoiceRecorderProps) {
  const { recordingState, startRecording, stopRecording, clearRecording } = useVoiceRecording();

  const handleToggleRecording = async () => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleRecordingComplete = () => {
    if (recordingState.audioData) {
      onRecordingComplete(recordingState.audioData);
      clearRecording();
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Recording Button */}
      <Button
        variant={recordingState.isRecording ? "destructive" : "default"}
        size="lg"
        onClick={handleToggleRecording}
        disabled={disabled || recordingState.isProcessing}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all",
          recordingState.isRecording && "animate-pulse"
        )}
        data-testid="button-record-toggle"
      >
        {recordingState.isRecording ? (
          <Square className="w-6 h-6" />
        ) : recordingState.isProcessing ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>

      {/* Recording Duration */}
      {recordingState.isRecording && (
        <div className="text-sm text-gray-600" data-testid="text-recording-duration">
          {formatDuration(recordingState.duration)}
        </div>
      )}

      {/* Recording Status */}
      {recordingState.isRecording && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span data-testid="text-recording-status">Recording...</span>
        </div>
      )}

      {recordingState.isProcessing && (
        <div className="text-sm text-gray-600" data-testid="text-processing-status">
          Processing...
        </div>
      )}

      {/* Complete Recording Button */}
      {recordingState.audioData && !recordingState.isRecording && (
        <Button
          onClick={handleRecordingComplete}
          className="bg-success hover:bg-success/90"
          data-testid="button-complete-recording"
        >
          Use Recording
        </Button>
      )}
    </div>
  );
}
