
export interface AIServiceInterface {
  // Speech-to-Text conversion
  speechToText(audioBuffer: Buffer, language?: string, transcribedText?: string): Promise<{
    text: string;
    language: string;
    confidence: number;
  }>;

  // Text translation
  translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<{
    originalText: string;
    translatedText: string;
    originalLanguage: string;
    targetLanguage: string;
  }>;

  // Text-to-Speech conversion
  textToSpeech(
    text: string, 
    language: string,
    voice?: string
  ): Promise<{
    audioBuffer: Buffer;
    duration: number;
  }>;

  // Complete pipeline: Speech -> Text -> Translation -> Speech
  translateVoiceToVoice(
    audioBuffer: Buffer,
    targetLanguage: string,
    sourceLanguage?: string,
    transcribedText?: string
  ): Promise<{
    originalText: string;
    translatedText: string;
    originalLanguage: string;
    targetLanguage: string;
    audioBuffer: Buffer;
  }>;
}

// Factory function to create AI service instances
export type AIServiceFactory = () => AIServiceInterface;

// Registry for different AI models
export class AIModelRegistry {
  private static models: Map<string, AIServiceFactory> = new Map();
  private static currentModel: string = 'gemini'; // default - Gemini as primary model

  static registerModel(name: string, factory: AIServiceFactory): void {
    this.models.set(name, factory);
    console.log(`AI Model registered: ${name}`);
  }

  static setCurrentModel(name: string): void {
    if (this.models.has(name)) {
      this.currentModel = name;
      console.log(`Switched to AI model: ${name}`);
    } else {
      console.error(`AI model not found: ${name}`);
    }
  }

  static getCurrentModel(): AIServiceInterface {
    const factory = this.models.get(this.currentModel);
    if (!factory) {
      throw new Error(`No AI model available: ${this.currentModel}`);
    }
    return factory();
  }

  static getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  static getCurrentModelName(): string {
    return this.currentModel;
  }
}

