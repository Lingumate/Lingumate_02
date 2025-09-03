import { AIServiceInterface, AIModelRegistry } from './aiInterface';
import { GeminiWrapper } from './geminiWrapper';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// Interface for model metadata
export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  uploadDate: string;
  filePath: string;
  isActive: boolean;
}

// Interface for model configuration
export interface ModelConfig {
  speechToTextEndpoint?: string;
  translationEndpoint?: string;
  textToSpeechEndpoint?: string;
  apiKey?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
}

export class ModelManager {
  private static modelsDir = path.join(process.cwd(), 'uploads', 'models');
  private static metadataFile = path.join(this.modelsDir, 'metadata.json');
  private static models: Map<string, AIServiceInterface> = new Map();

  static async initialize() {
    // Create models directory if it doesn't exist
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }

    // Create metadata file if it doesn't exist
    if (!fs.existsSync(this.metadataFile)) {
      fs.writeFileSync(this.metadataFile, JSON.stringify([], null, 2));
    }

    // Register Gemini model as primary
    AIModelRegistry.registerModel('gemini', () => new GeminiWrapper());
    console.log('✅ Gemini model registered as primary');
    
    // No OpenAI fallback - using Gemini only
    console.log('✅ Using Gemini only - no OpenAI fallback');
    
    // Ensure Gemini is set as current model (primary)
    AIModelRegistry.setCurrentModel('gemini');
    console.log('✅ Gemini model set as current model (primary)');
    
    // Load and register uploaded models
    await this.loadUploadedModels();
    
    // Double-check that Gemini is set as primary
    const currentModel = AIModelRegistry.getCurrentModelName();
    if (currentModel !== 'gemini') {
      console.log(`⚠️  Current model is ${currentModel}, setting Gemini as primary...`);
      AIModelRegistry.setCurrentModel('gemini');
      console.log('✅ Gemini model confirmed as primary');
    } else {
      console.log('✅ Gemini model confirmed as primary model');
    }
  }

  static async loadUploadedModels() {
    try {
      const metadata = this.getModelsMetadata();
      
      for (const model of metadata) {
        if (model.isActive) {
          await this.loadModel(model);
        }
      }
    } catch (error) {
      console.error('Error loading uploaded models:', error);
    }
  }

  static async uploadModel(
    modelFile: Buffer,
    modelName: string,
    description: string,
    capabilities: string[]
  ): Promise<ModelMetadata> {
    const modelId = `${modelName}-${Date.now()}`;
    const fileName = `${modelId}.model`;
    const filePath = path.join(this.modelsDir, fileName);

    // Save the model file
    fs.writeFileSync(filePath, modelFile);

    // Create metadata
    const metadata: ModelMetadata = {
      id: modelId,
      name: modelName,
      version: '1.0.0',
      description,
      capabilities,
      uploadDate: new Date().toISOString(),
      filePath,
      isActive: false
    };

    // Save metadata
    this.saveModelMetadata(metadata);

    console.log(`Model uploaded: ${modelName} (${modelId})`);
    return metadata;
  }

  static async activateModel(modelId: string): Promise<boolean> {
    try {
      const metadata = this.getModelsMetadata();
      const model = metadata.find(m => m.id === modelId);
      
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Deactivate all other models
      metadata.forEach(m => m.isActive = false);
      
      // Activate the selected model
      model.isActive = true;
      
      // Save updated metadata
      this.saveModelsMetadata(metadata);

      // Load the model
      await this.loadModel(model);

      // Set as current model in registry
      AIModelRegistry.setCurrentModel(modelId);

      console.log(`Model activated: ${model.name}`);
      return true;
    } catch (error) {
      console.error('Error activating model:', error);
      return false;
    }
  }

  static async loadModel(metadata: ModelMetadata): Promise<void> {
    try {
      // Create a custom model wrapper that loads your trained model
      const customModel = new CustomModelWrapper(metadata);
      
      // Register the model
      AIModelRegistry.registerModel(metadata.id, () => customModel);
      
      // Store reference
      this.models.set(metadata.id, customModel);
      
      console.log(`Model loaded: ${metadata.name}`);
    } catch (error) {
      console.error(`Error loading model ${metadata.name}:`, error);
    }
  }

  static getModelsMetadata(): ModelMetadata[] {
    try {
      const data = fs.readFileSync(this.metadataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading models metadata:', error);
      return [];
    }
  }

  private static saveModelMetadata(metadata: ModelMetadata): void {
    const allMetadata = this.getModelsMetadata();
    const existingIndex = allMetadata.findIndex(m => m.id === metadata.id);
    
    if (existingIndex >= 0) {
      allMetadata[existingIndex] = metadata;
    } else {
      allMetadata.push(metadata);
    }
    
    this.saveModelsMetadata(allMetadata);
  }

  private static saveModelsMetadata(metadata: ModelMetadata[]): void {
    fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  static getActiveModel(): ModelMetadata | null {
    const metadata = this.getModelsMetadata();
    return metadata.find(m => m.isActive) || null;
  }

  static resetToOpenAI(): void {
    console.warn('⚠️ OpenAI fallback disabled - using Gemini only');
    AIModelRegistry.setCurrentModel('gemini');
    console.log('✅ Staying with Gemini model (OpenAI fallback disabled)');
  }

  static setGeminiAsPrimary(): void {
    AIModelRegistry.setCurrentModel('gemini');
    console.log('✅ Gemini set as primary model');
  }

  static getCurrentModelInfo(): { name: string; type: string } {
    const currentModelName = AIModelRegistry.getCurrentModelName();
    const activeModel = this.getActiveModel();
    
    return {
      name: currentModelName,
      type: activeModel ? 'custom' : (currentModelName === 'gemini' ? 'gemini' : 'openai')
    };
  }

  static registerCustomModel(modelId: string, factory: () => AIServiceInterface): void {
    AIModelRegistry.registerModel(modelId, factory);
    console.log(`✅ Custom model registered: ${modelId}`);
  }

  static switchToCustomModel(modelId: string): boolean {
    try {
      AIModelRegistry.setCurrentModel(modelId);
      console.log(`✅ Switched to custom model: ${modelId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to switch to custom model: ${modelId}`, error);
      return false;
    }
  }

  static async deleteModel(modelId: string): Promise<boolean> {
    try {
      const metadata = this.getModelsMetadata();
      const model = metadata.find(m => m.id === modelId);
      
      if (!model) {
        return false;
      }

      // Delete model file
      if (fs.existsSync(model.filePath)) {
        fs.unlinkSync(model.filePath);
      }

      // Remove from metadata
      const updatedMetadata = metadata.filter(m => m.id !== modelId);
      this.saveModelsMetadata(updatedMetadata);

      // Remove from registry
      this.models.delete(modelId);

      console.log(`Model deleted: ${model.name}`);
      return true;
    } catch (error) {
      console.error('Error deleting model:', error);
      return false;
    }
  }
}

// Custom model wrapper that loads your trained model
class CustomModelWrapper implements AIServiceInterface {
  private metadata: ModelMetadata;
  private model: any; // Your trained model will be loaded here

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
    this.loadTrainedModel();
  }

  private loadTrainedModel() {
    try {
      // Load your trained model from the file
      const modelPath = this.metadata.filePath;
      
      // This is where you'll load your specific model format
      // Examples for different model types:
      
      // For TensorFlow.js models:
      // this.model = await tf.loadLayersModel(`file://${modelPath}`);
      
      // For ONNX models:
      // this.model = await ort.InferenceSession.create(modelPath);
      
      // For custom Python models (via API):
      // this.model = { baseUrl: process.env.CUSTOM_MODEL_API_URL };
      
      // For now, we'll use a placeholder that you can replace
      this.model = {
        type: 'custom',
        path: modelPath,
        baseUrl: process.env.CUSTOM_MODEL_API_URL || 'http://localhost:8000'
      };
      
      console.log(`Trained model loaded from: ${modelPath}`);
    } catch (error) {
      console.error('Error loading trained model:', error);
      throw new Error(`Failed to load trained model: ${error}`);
    }
  }

  async speechToText(audioBuffer: Buffer, language?: string): Promise<{
    text: string;
    language: string;
    confidence: number;
  }> {
    try {
      // Use your trained model for speech-to-text
      // This is where you'll call your model's inference
      
      if (this.model.type === 'custom' && this.model.baseUrl) {
        // Example: Call your model's API
        const response = await fetch(`${this.model.baseUrl}/speech-to-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: audioBuffer.toString('base64'),
            language: language || 'en'
          })
        });
        
        const result = await response.json();
        return {
          text: result.text,
          language: result.language || language || 'en',
          confidence: result.confidence || 0.9,
        };
      }
      
      // For direct model inference (TensorFlow.js, ONNX, etc.)
      // const result = await this.model.predict(audioBuffer);
      
      throw new Error('Custom model speechToText not implemented - replace with your model logic');
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw error;
    }
  }

  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<{
    originalText: string;
    translatedText: string;
    originalLanguage: string;
    targetLanguage: string;
  }> {
    try {
      // Use your trained model for translation
      
      if (this.model.type === 'custom' && this.model.baseUrl) {
        const response = await fetch(`${this.model.baseUrl}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            target_language: targetLanguage,
            source_language: sourceLanguage || 'auto'
          })
        });
        
        const result = await response.json();
        return {
          originalText: text,
          translatedText: result.translated_text,
          originalLanguage: sourceLanguage || 'auto',
          targetLanguage: targetLanguage,
        };
      }
      
      throw new Error('Custom model translateText not implemented - replace with your model logic');
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  async textToSpeech(
    text: string, 
    language: string,
    voice?: string
  ): Promise<{
    audioBuffer: Buffer;
    duration: number;
  }> {
    try {
      // Use your trained model for text-to-speech
      
      if (this.model.type === 'custom' && this.model.baseUrl) {
        const response = await fetch(`${this.model.baseUrl}/text-to-speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            language,
            voice: voice || 'default'
          })
        });
        
        const audioData = await response.arrayBuffer();
        return {
          audioBuffer: Buffer.from(audioData),
          duration: text.length * 0.06, // Estimate
        };
      }
      
      throw new Error('Custom model textToSpeech not implemented - replace with your model logic');
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  async translateVoiceToVoice(
    audioBuffer: Buffer,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<{
    originalText: string;
    translatedText: string;
    originalLanguage: string;
    targetLanguage: string;
    audioBuffer: Buffer;
  }> {
    // Step 1: Speech to Text
    const transcription = await this.speechToText(audioBuffer, sourceLanguage);
    
    // Step 2: Text Translation
    const translation = await this.translateText(
      transcription.text,
      targetLanguage,
      transcription.language
    );
    
    // Step 3: Text to Speech
    const speech = await this.textToSpeech(
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
  }
}
