'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const checkSpeechSupport = () => {
      // More comprehensive speech synthesis detection
      const windowExists = typeof window !== 'undefined';
      const speechSynthesisExists = windowExists && 'speechSynthesis' in window;
      const speechSynthesisUtteranceExists = windowExists && 'SpeechSynthesisUtterance' in window;
      
      const isSupported = speechSynthesisExists && speechSynthesisUtteranceExists;
      
      console.log('🎤 Checking speech synthesis support:', { 
        windowExists,
        speechSynthesisExists,
        speechSynthesisUtteranceExists,
        isSupported 
      });
      
      setSupported(isSupported);
      
      // Initialize speech synthesis if supported
      if (isSupported) {
        console.log('🎤 Speech synthesis supported, initializing...');
        
        // Some browsers require a user interaction before allowing speech synthesis
        // We'll try to resume any paused synthesis
        if (window.speechSynthesis.paused) {
          console.log('🎤 Speech synthesis was paused, attempting to resume...');
          window.speechSynthesis.resume();
        }
        
        // Test if speech synthesis is actually working
        try {
          const testUtterance = new SpeechSynthesisUtterance('');
          console.log('🎤 Speech synthesis test utterance created successfully');
          
          // Additional test: check if we can get voices
          const voices = window.speechSynthesis.getVoices();
          console.log('🎤 Available voices:', voices.length);
          
        } catch (error) {
          console.error('🎤 Error creating test utterance:', error);
          setSupported(false);
        }
      } else {
        console.log('🔇 Speech synthesis not supported in this browser');
      }
    };
    
    // Check immediately
    checkSpeechSupport();
    
    // Also check after a delay (some browsers need time to initialize)
    const timeoutId = setTimeout(checkSpeechSupport, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const speak = useCallback((text: string, lang: string) => {
    console.log('🎤 useTextToSpeech.speak called:', { text: text.substring(0, 50) + '...', lang, supported, isSpeaking });
    
    // Double-check if speech synthesis is available (fallback for detection issues)
    const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (!speechAvailable) {
      console.log('🔇 Speech synthesis not available in window object');
      return;
    }
    
    if (isSpeaking) {
      console.log('🔇 Speech blocked: already speaking');
      return;
    }

    // Check if speech synthesis is paused (common browser issue)
    if (window.speechSynthesis.paused) {
      console.log('🎤 Speech synthesis was paused, resuming...');
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('🎤 Speech started');
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log('🎤 Speech ended');
      setIsSpeaking(false);
    };
    utterance.onerror = (error) => {
      console.error('🎤 Speech error:', error);
      setIsSpeaking(false);
    };

    console.log('🎤 Calling window.speechSynthesis.speak...');
    try {
      // Some browsers require user interaction before allowing speech synthesis
      // We'll try to resume first, then speak
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      
      // Force a small delay to ensure the utterance is queued
      setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          console.log('🎤 Speech synthesis is speaking');
        } else {
          console.log('🎤 Speech synthesis not speaking - may need user interaction');
        }
      }, 100);
      
    } catch (error) {
      console.error('🎤 Error calling speechSynthesis.speak:', error);
    }
  }, [supported, isSpeaking]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [supported]);

  return { speak, stop, isSpeaking, supported };
}
