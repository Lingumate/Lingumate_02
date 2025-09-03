
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LanguageConversionResult {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  audioBuffer?: Buffer;
}

export class LanguageConversionService {
  /**
   * Convert speech to text using OpenAI Whisper
   */
  private async speechToText(audioBuffer: Buffer, language?: string): Promise<string> {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: new Blob([audioBuffer], { type: 'audio/wav' }) as any,
        model: 'whisper-1',
        language: language || 'en',
      });

      return transcription.text;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  /**
   * Translate text using OpenAI
   */
  private async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    try {
      const prompt = `Translate the following text to ${targetLanguage}${sourceLanguage ? ` from ${sourceLanguage}` : ''}:\n\n${text}`;
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguage}. Only return the translated text, nothing else.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  private async textToSpeech(text: string, language: string): Promise<Buffer> {
    try {
      // Map language codes to OpenAI TTS voices
      const voiceMap: { [key: string]: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' } = {
        'en': 'alloy',
        'es': 'echo',
        'fr': 'fable',
        'de': 'onyx',
        'it': 'nova',
        'pt': 'shimmer',
        'ja': 'nova',
        'ko': 'shimmer',
        'zh': 'echo',
        'ru': 'onyx',
        'ar': 'fable',
      };

      const voice = voiceMap[language.toLowerCase()] || 'alloy';

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error('Failed to convert text to speech');
    }
  }

  /**
   * Detect language of text
   */
  private async detectLanguage(text: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a language detection expert. Return only the ISO 639-1 language code (e.g., "en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ru", "ar").',
          },
          {
            role: 'user',
            content: `Detect the language of this text: "${text}"`,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const detectedLanguage = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'en';
      return detectedLanguage;
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Convert speech to speech (complete pipeline)
   */
  async convertSpeechToSpeech(
    audioBuffer: Buffer,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<LanguageConversionResult> {
    try {
      // Step 1: Speech to text
      const originalText = await this.speechToText(audioBuffer, sourceLanguage);
      
      // Step 2: Detect language if not provided
      const detectedLanguage = sourceLanguage || await this.detectLanguage(originalText);
      
      // Step 3: Translate text
      const translatedText = await this.translateText(originalText, targetLanguage, detectedLanguage);
      
      // Step 4: Text to speech
      const audioBufferResult = await this.textToSpeech(translatedText, targetLanguage);

      return {
        originalText,
        translatedText,
        originalLanguage: detectedLanguage,
        targetLanguage,
        audioBuffer: audioBufferResult,
      };
    } catch (error) {
      console.error('Language conversion error:', error);
      throw new Error('Failed to convert speech to speech');
    }
  }

  /**
   * Convert text to speech only
   */
  async textToSpeechOnly(text: string, language: string): Promise<Buffer> {
    return this.textToSpeech(text, language);
  }

  /**
   * Translate text only
   */
  async translateTextOnly(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    return this.translateText(text, targetLanguage, sourceLanguage);
  }

  /**
   * Speech to text only
   */
  async speechToTextOnly(audioBuffer: Buffer, language?: string): Promise<string> {
    return this.speechToText(audioBuffer, language);
  }
}

// Export service instance
export const languageConversionService = new LanguageConversionService();

