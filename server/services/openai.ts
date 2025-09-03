import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Check if we have a valid API key
const hasValidApiKey = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== "sk-mock-key-for-development" && 
  process.env.OPENAI_API_KEY !== "default_key";

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export class OpenAIService {
  async transcribeAudio(audioBuffer: Buffer | string): Promise<TranscriptionResult> {
    if (!hasValidApiKey) {
      // Mock response for development
      return {
        text: "This is a mock transcription for development purposes.",
        duration: 0,
      };
    }

    try {
      // Convert WebM to proper format for OpenAI
      let fileBuffer: Buffer;
      
      if (typeof audioBuffer === 'string') {
        // If it's a base64 string, decode it
        fileBuffer = Buffer.from(audioBuffer, 'base64');
      } else {
        fileBuffer = audioBuffer;
      }

      // Create a proper file object for OpenAI
      const file = new File([fileBuffer], 'audio.webm', { type: 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        file: file as any,
        model: "whisper-1",
      });

      return {
        text: transcription.text,
        duration: 0, // OpenAI Whisper API doesn't provide duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to transcribe audio: ${errorMessage}`);
    }
  }

  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    if (!hasValidApiKey) {
      // Mock response for development
      return {
        originalText: text,
        translatedText: `[Mock translation to ${targetLanguage}]: ${text}`,
        originalLanguage: sourceLanguage || "en",
        targetLanguage,
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${targetLanguage}. Maintain the original tone and context. Respond with JSON in this format: { "translatedText": "translated content", "detectedLanguage": "detected source language code" }`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content);

      return {
        originalText: text,
        translatedText: result.translatedText,
        originalLanguage: sourceLanguage || result.detectedLanguage,
        targetLanguage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to translate text: ${errorMessage}`);
    }
  }

  async generateSpeech(text: string, language: string = "en"): Promise<Buffer> {
    if (!hasValidApiKey) {
      // Return empty buffer for development
      return Buffer.from("mock audio data");
    }

    try {
      // Map language codes to voices
      const voiceMap: { [key: string]: string } = {
        en: "alloy",
        es: "nova",
        fr: "shimmer",
        de: "echo",
        it: "fable",
        pt: "onyx",
      };

      const voice = voiceMap[language] || "alloy";

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: text,
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to generate speech: ${errorMessage}`);
    }
  }

  async summarizeText(text: string, targetLanguage: string = "en"): Promise<SummaryResult> {
    if (!hasValidApiKey) {
      // Mock response for development
      return {
        summary: "This is a mock summary for development purposes.",
        keyPoints: ["Mock point 1", "Mock point 2", "Mock point 3"],
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert summarizer. Create a concise summary of the given text in ${targetLanguage}. Also extract key points. Respond with JSON in this format: { "summary": "concise summary", "keyPoints": ["point 1", "point 2", "point 3"] }`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content);

      return {
        summary: result.summary,
        keyPoints: result.keyPoints || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to summarize text: ${errorMessage}`);
    }
  }

  async chatWithAssistant(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    userLocation?: string,
    language: string = "en"
  ): Promise<string> {
    if (!hasValidApiKey) {
      // Mock response for development
      return "This is a mock AI assistant response for development purposes. In production, this would provide real travel recommendations and assistance.";
    }

    try {
      const systemPrompt = `You are a helpful AI travel assistant. You can provide recommendations for restaurants, tourist spots, local events, and emergency services. ${
        userLocation ? `The user is currently in ${userLocation}.` : ""
      } Respond in ${language}. Be concise and helpful.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      return content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to chat with assistant: ${errorMessage}`);
    }
  }
}

export const openaiService = new OpenAIService();
