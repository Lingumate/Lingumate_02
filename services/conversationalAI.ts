
import OpenAI from 'openai';
import { z } from 'zod';
import { webSearchService, type WebSearchResponse } from './webSearch';
import { priceComparisonService } from './priceComparison';
import { emergencyContactService } from './emergencyContacts';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'ambulance' | 'fire' | 'hospital' | 'embassy' | 'tourist_info';
  description: string;
  country: string;
  region?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
  location?: string;
  webSearchResults?: WebSearchResponse;
  priceComparison?: any;
  travelTips?: any[];
  emergencyContacts?: EmergencyContact[];
  events?: any[];
}

export interface TravelTip {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'culture' | 'transport' | 'food' | 'money' | 'communication';
  priority: 'high' | 'medium' | 'low';
}

export interface EventInfo {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price?: string;
  category: string;
}

export class ConversationalAIService {
  /**
   * Generate AI response for tourist assistance with comprehensive travel features
   */
  async chatWithAssistant(
    messages: ChatMessage[],
    location?: string,
    language: string = 'en',
    options?: {
      includeEmergencyContacts?: boolean;
      includeTravelTips?: boolean;
      includePriceComparison?: boolean;
      includeEvents?: boolean;
    }
  ): Promise<ChatResponse> {
    try {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        throw new Error('No messages provided');
      }
      
      const systemPrompt = this.buildSystemPrompt(location, language);
      
      // Determine what features to include based on message content and options
      const needsWebSearch = this.shouldPerformWebSearch(lastMessage.content);
      const needsPriceComparison = this.shouldPerformPriceComparison(lastMessage.content);
      const needsEmergencyContacts = this.shouldIncludeEmergencyContacts(lastMessage.content);
      const needsTravelTips = this.shouldIncludeTravelTips(lastMessage.content);
      const needsEvents = this.shouldIncludeEvents(lastMessage.content);
      
      let webSearchResults: WebSearchResponse | undefined;
      let priceComparison: any = undefined;
      let travelTips: TravelTip[] = [];
      let emergencyContacts: EmergencyContact[] = [];
      let events: EventInfo[] = [];
      let enhancedResponse = '';

      if (needsPriceComparison) {
        // Extract product name from the message
        const productName = this.extractProductName(lastMessage.content);
        if (productName) {
          try {
            // Get price comparison
            priceComparison = await priceComparisonService.getPriceComparison(productName, location);
            
            // Generate response with price comparison
            enhancedResponse = await this.generateResponseWithPriceComparison(
              lastMessage.content,
              priceComparison,
              language
            );
          } catch (error) {
            console.error('Price comparison failed:', error);
          }
        }
      }

      if (needsWebSearch) {
        try {
          webSearchResults = await webSearchService.searchWeb(lastMessage.content);
        } catch (error) {
          console.error('Web search failed:', error);
        }
      }

      if (needsEmergencyContacts && location) {
        try {
          emergencyContacts = await emergencyContactService.getEmergencyContacts(location);
        } catch (error) {
          console.error('Emergency contacts failed:', error);
        }
      }

      if (needsTravelTips && location) {
        try {
          travelTips = await this.generateTravelTips(lastMessage.content);
        } catch (error) {
          console.error('Travel tips failed:', error);
        }
      }

      if (needsEvents && location) {
        try {
          events = await this.generateEvents(location, lastMessage.content);
        } catch (error) {
          console.error('Events failed:', error);
        }
      }

      // Generate AI response
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response at this time.';

      // Combine AI response with enhanced features
      const finalResponse = enhancedResponse || aiResponse;

      const chatResponse: ChatResponse = {
        response: finalResponse,
        suggestions: this.generateSuggestions(lastMessage.content),
      };

      // Only add properties if they have values
      if (webSearchResults) {
        chatResponse.webSearchResults = webSearchResults;
      }
      if (priceComparison) {
        chatResponse.priceComparison = priceComparison;
      }
      if (travelTips.length > 0) {
        chatResponse.travelTips = travelTips;
      }
      if (emergencyContacts.length > 0) {
        chatResponse.emergencyContacts = emergencyContacts;
      }
      if (events.length > 0) {
        chatResponse.events = events;
      }
      if (location) {
        chatResponse.location = location;
      }

      return chatResponse;
    } catch (error) {
      console.error('Chat assistant error:', error);
      throw new Error('Failed to generate response');
    }
  }

  private buildSystemPrompt(location?: string, language: string = 'en'): string {
    let prompt = `You are a helpful AI travel assistant. Help users with travel-related questions, recommendations, and assistance.`;
    
    if (location) {
      prompt += ` The user is currently in or asking about ${location}.`;
    }
    
    if (language !== 'en') {
      prompt += ` Respond in ${language} if possible.`;
    }
    
    return prompt;
  }

  private shouldPerformWebSearch(content: string): boolean {
    const webSearchKeywords = ['search', 'find', 'look up', 'information about', 'what is', 'how to'];
    return webSearchKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private shouldPerformPriceComparison(content: string): boolean {
    const priceKeywords = ['price', 'cost', 'cheap', 'expensive', 'buy', 'purchase', 'shopping'];
    return priceKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private shouldIncludeEmergencyContacts(content: string): boolean {
    const emergencyKeywords = ['emergency', 'help', 'police', 'hospital', 'ambulance', 'fire', 'danger'];
    return emergencyKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private shouldIncludeTravelTips(content: string): boolean {
    const tipKeywords = ['tip', 'advice', 'recommendation', 'suggestion', 'best practice'];
    return tipKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private shouldIncludeEvents(content: string): boolean {
    const eventKeywords = ['event', 'festival', 'concert', 'show', 'activity', 'happening'];
    return eventKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private extractProductName(content: string): string | null {
    // Simple extraction - look for product names after keywords
    const productPatterns = [
      /(?:price|cost|buy|purchase)\s+(?:of\s+)?([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+(?:price|cost)/i
    ];
    
    for (const pattern of productPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private async generateResponseWithPriceComparison(
    userMessage: string,
    priceData: any,
    language: string
  ): Promise<string> {
    // Generate a response incorporating price comparison data
    return `Based on your request about pricing, here's what I found: ${JSON.stringify(priceData)}`;
  }

  private async generateTravelTips(content: string): Promise<TravelTip[]> {
    // Generate travel tips based on content
    return [
      {
        id: '1',
        title: 'General Travel Safety',
        description: 'Always keep your belongings secure and be aware of your surroundings.',
        category: 'safety',
        priority: 'high'
      }
    ];
  }

  private async generateEvents(location: string, content: string): Promise<EventInfo[]> {
    // Generate events based on location and content
    return [
      {
        id: '1',
        title: 'Local Event',
        date: 'Today',
        time: 'Various',
        location: location,
        description: 'Check local event listings for current activities.',
        category: 'entertainment'
      }
    ];
  }

  private generateSuggestions(content: string): string[] {
    const suggestions = [];
    
    if (content.toLowerCase().includes('restaurant')) {
      suggestions.push('Find nearby restaurants');
      suggestions.push('Check restaurant reviews');
    }
    
    if (content.toLowerCase().includes('hotel')) {
      suggestions.push('Search for hotels');
      suggestions.push('Compare hotel prices');
    }
    
    if (content.toLowerCase().includes('transport')) {
      suggestions.push('Find public transportation');
      suggestions.push('Check taxi services');
    }
    
    return suggestions.length > 0 ? suggestions : ['Ask about local attractions', 'Get travel recommendations'];
  }
}

export const conversationalAIService = new ConversationalAIService(); 
