import { AIModelRegistry } from "./aiInterface";

export interface VoiceTranslationResult {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  audioBuffer?: Buffer;
  latency?: {
    total: number;
    speechToText: number;
    translation: number;
    textToSpeech: number;
  };
}

export class TranslationService {
  async translateVoiceToVoice(
    audioBuffer: Buffer,
    targetLanguage: string,
    sourceLanguage?: string,
    transcribedText?: string
  ): Promise<VoiceTranslationResult> {
    const startTime = Date.now();
    try {
      console.log('🎤 STEP-BY-STEP TRANSLATION PIPELINE STARTING...');
      console.log('🎤 Audio buffer length:', audioBuffer.length);
      console.log('🎤 From', sourceLanguage || 'auto', 'to', targetLanguage);
      
      // Get the current AI model from the registry
      const aiModel = AIModelRegistry.getCurrentModel();
      const currentModelName = AIModelRegistry.getCurrentModelName();
      
      console.log(`🎯 Using ${currentModelName.toUpperCase()} for step-by-step translation`);
      
      // STEP 1: Speech-to-Text (Google-style STT)
      console.log('🔤 STEP 1: Converting speech to text...');
      const sttStartTime = Date.now();
      const sttResult = await aiModel.speechToText(audioBuffer, sourceLanguage, transcribedText);
      const sttDuration = Date.now() - sttStartTime;
      
      console.log(`✅ STEP 1 COMPLETED in ${sttDuration}ms`);
      console.log(`📄 Extracted text: "${sttResult.text}"`);
      console.log(`🌍 Detected language: ${sttResult.language}`);
      console.log(`🎯 Confidence: ${sttResult.confidence}`);
      
      // STEP 2: Text Translation (L1 → L2)
      console.log('🌐 STEP 2: Translating text...');
      const translationStartTime = Date.now();
      const translationResult = await aiModel.translateText(
        sttResult.text,
        targetLanguage,
        sttResult.language
      );
      const translationDuration = Date.now() - translationStartTime;
      
      console.log(`✅ STEP 2 COMPLETED in ${translationDuration}ms`);
      console.log(`📄 Original text (${translationResult.originalLanguage}): "${translationResult.originalText}"`);
      console.log(`🌐 Translated text (${translationResult.targetLanguage}): "${translationResult.translatedText}"`);
      
      // STEP 3: Text-to-Speech (L2 → Audio)
      console.log('🔊 STEP 3: Converting translated text to speech...');
      const ttsStartTime = Date.now();
      const ttsResult = await aiModel.textToSpeech(
        translationResult.translatedText,
        targetLanguage
      );
      const ttsDuration = Date.now() - ttsStartTime;
      
      console.log(`✅ STEP 3 COMPLETED in ${ttsDuration}ms`);
      console.log(`🔊 Audio generated for: "${translationResult.translatedText}"`);
      console.log(`⏱️ Audio duration: ${ttsResult.duration}ms`);
      
      const totalDuration = Date.now() - startTime;
      console.log(`🎉 ALL 3 STEPS COMPLETED SUCCESSFULLY in ${totalDuration}ms`);
      console.log(`📊 Step-by-step breakdown:`);
      console.log(`   Step 1 (STT): ${sttDuration}ms ✓`);
      console.log(`   Step 2 (Translation): ${translationDuration}ms ✓`);
      console.log(`   Step 3 (TTS): ${ttsDuration}ms ✓`);
      console.log(`   Total Pipeline: ${totalDuration}ms ✓`);
      
      return {
        originalText: translationResult.originalText,
        translatedText: translationResult.translatedText,
        originalLanguage: translationResult.originalLanguage,
        targetLanguage: translationResult.targetLanguage,
        audioBuffer: ttsResult.audioBuffer,
        latency: {
          total: totalDuration,
          speechToText: sttDuration,
          translation: translationDuration,
          textToSpeech: ttsDuration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ Bi-directional translation failed after ${duration}ms: ${errorMessage}`);
      throw new Error(`Failed to complete bi-directional translation: ${errorMessage}`);
    }
  }

  async translateTextToVoice(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<VoiceTranslationResult> {
    try {
      // Get the current AI model from the registry
      const aiModel = AIModelRegistry.getCurrentModel();
      
      // Step 1: Translate text
      const translation = await aiModel.translateText(
        text,
        targetLanguage,
        sourceLanguage
      );
      
      // Step 2: Generate speech from translated text
      const speech = await aiModel.textToSpeech(
        translation.translatedText,
        targetLanguage
      );
      
      return {
        originalText: translation.originalText,
        translatedText: translation.translatedText,
        originalLanguage: translation.originalLanguage,
        targetLanguage: translation.targetLanguage,
        audioBuffer: speech.audioBuffer,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to translate text to voice: ${errorMessage}`);
    }
  }

  async processAudioSummary(
    audioBuffer: Buffer,
    targetLanguage: string = "en"
  ): Promise<{
    transcription: string;
    summary: string;
    summaryAudio: Buffer;
    duration: number;
  }> {
    try {
      // Get the current AI model from the registry
      const aiModel = AIModelRegistry.getCurrentModel();
      
      // Step 1: Transcribe audio
      const transcription = await aiModel.speechToText(audioBuffer, targetLanguage);
      
      // Step 2: Summarize transcription using Gemini
      const { ai } = await import('./genkit');
      
      const summaryPrompt = `Please provide a concise summary of the following text in ${targetLanguage}. 
      Focus on the key points and main ideas.
      
      Text to summarize: "${transcription.text}"
      
      Please provide only the summary:`;
      
      const summaryResponse = await ai.generateText({
        prompt: summaryPrompt,
        model: 'googleai/gemini-2.0-flash',
      });
      
      const summaryResult = {
        summary: summaryResponse.text().trim(),
        keyPoints: []
      };
      
      // Step 3: Generate audio from summary
      const speech = await aiModel.textToSpeech(
        summaryResult.summary,
        targetLanguage
      );
      
      return {
        transcription: transcription.text,
        summary: summaryResult.summary,
        summaryAudio: speech.audioBuffer,
        duration: transcription.confidence * 10, // Rough estimate
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process audio summary: ${errorMessage}`);
    }
  }
}

export const translationService = new TranslationService();
