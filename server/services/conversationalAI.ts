<<<<<<< HEAD
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
              messages,
              priceComparison,
              systemPrompt
            );
          } catch (error) {
            console.warn('Price comparison failed:', error);
          }
        }
      }

      if (needsWebSearch) {
        try {
          // Get web search results
          webSearchResults = await webSearchService.searchWeb(lastMessage.content);
          
          // Generate response with web search
          enhancedResponse = await this.generateResponseWithWebSearch(
            messages,
            webSearchResults,
            systemPrompt
          );
        } catch (error) {
          console.warn('Web search failed:', error);
        }
      }

      // Generate additional travel assistance based on message content and options
      if (needsEmergencyContacts || options?.includeEmergencyContacts) {
        if (location) {
          emergencyContacts = await emergencyContactService.getEmergencyContacts(location);
        }
      }
      if (needsTravelTips || options?.includeTravelTips) {
        travelTips = await this.generateTravelTips(lastMessage.content);
      }
      if (needsEvents || options?.includeEvents) {
        events = await this.generateEvents(location, lastMessage.content);
      }

      // Generate the main response if not already generated
      if (!enhancedResponse) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        enhancedResponse = response.choices[0].message.content || 'I apologize, but I was unable to generate a response at this time.';
      }

      // Extract suggestions from the response
      const suggestions = this.extractSuggestions(enhancedResponse);

      return {
        response: enhancedResponse,
        suggestions,
        location,
        webSearchResults,
        priceComparison,
        travelTips,
        emergencyContacts,
        events
      };
    } catch (error) {
      console.error('Chat with assistant error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Determine if price comparison is needed based on the message content
   */
  private shouldPerformPriceComparison(message: string): boolean {
    const priceKeywords = [
      'price', 'cost', 'expensive', 'cheap', 'how much', 'costs', 'pricing',
      'dollars', 'euros', 'currency', 'budget', 'afford', 'overpriced',
      'value', 'worth', 'rate', 'fee', 'charge', 'bill', 'payment',
      'compare prices', 'price comparison', 'market price', 'retail price'
    ];

    const lowerMessage = message.toLowerCase();
    return priceKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Extract product name from user message
   */
  private extractProductName(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Common patterns for price queries
    const patterns = [
      /(?:price|cost|how much) (?:of|for|is|are) (.+?)(?:\?|$|,|\.)/i,
      /(?:what's|what is|what are) (?:the|a|an) (?:price|cost) (?:of|for) (.+?)(?:\?|$|,|\.)/i,
      /(.+?) (?:price|cost|pricing)/i,
      /(?:check|compare|get) (?:the|a|an) (?:price|cost) (?:of|for) (.+?)(?:\?|$|,|\.)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const product = match[1].trim();
        // Clean up the product name
        return product.replace(/^(the|a|an)\s+/i, '').replace(/\s+(price|cost|pricing)$/i, '');
      }
    }

    // If no pattern matches, try to extract common product words
    const productWords = message.split(' ').filter(word => {
      const lowerWord = word.toLowerCase();
      return !['price', 'cost', 'how', 'much', 'is', 'are', 'the', 'a', 'an', 'of', 'for', 'what', 'check', 'compare', 'get'].includes(lowerWord);
    });

    if (productWords.length > 0) {
      return productWords.slice(0, 3).join(' '); // Take first 3 words as product name
    }

    return null;
  }

  /**
   * Generate response with price comparison results
   */
  private async generateResponseWithPriceComparison(
    messages: ChatMessage[],
    priceComparison: any,
    systemPrompt: string
  ): Promise<string> {
    try {
      const priceContext = `
Price Comparison Results for: "${priceComparison.product}"

Average Price: ${priceComparison.averagePrice} ${priceComparison.currency}
Price Range: ${priceComparison.minPrice} - ${priceComparison.maxPrice} ${priceComparison.currency}
Number of Sources: ${priceComparison.sources.length}

Price Sources:
${priceComparison.sources.map((source: any, index: number) => 
  `${index + 1}. ${source.name}: ${source.price} ${priceComparison.currency}`
).join('\n')}

Recommendations:
${priceComparison.recommendations.join('\n')}

Based on this price comparison, please provide a helpful response to the user's query about pricing. Include the key price information and any relevant recommendations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

You have access to real-time price comparison data. Use this information to provide accurate, helpful pricing information to users. Always include the key price details and any relevant recommendations.`,
          },
          ...messages,
          {
            role: 'user',
            content: priceContext,
          },
        ],
        max_tokens: 800,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide price information at the moment.';
    } catch (error) {
      console.error('Response generation with price comparison error:', error);
      return 'I apologize, but I encountered an error while getting price information. Please try again.';
    }
  }

  /**
   * Determine if web search is needed based on the message content
   */
  private shouldPerformWebSearch(message: string): boolean {
    const searchKeywords = [
      'current', 'latest', 'recent', 'today', 'now', 'update', 'news',
      'what is', 'how to', 'where is', 'when is', 'why is', 'who is',
      'information about', 'tell me about', 'explain', 'describe',
      'weather', 'temperature', 'forecast', 'traffic', 'events',
      'reviews', 'ratings', 'opinions', 'experiences',
      'facts', 'statistics', 'data', 'research', 'study'
    ];

    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate response with web search results
   */
  private async generateResponseWithWebSearch(
    messages: ChatMessage[],
    webSearchResults: WebSearchResponse,
    systemPrompt: string
  ): Promise<string> {
    try {
      const searchContext = `
Web Search Results for: "${webSearchResults.query}"

${webSearchResults.results.map((result, index) => `
${index + 1}. ${result.title}
   Source: ${result.source}
   URL: ${result.url}
   Summary: ${result.snippet}
`).join('\n')}

AI-Generated Summary:
${webSearchResults.summary}

Based on the above search results, please provide a comprehensive, accurate, and unbiased response to the user's query. Include relevant information from the search results and cite sources when appropriate.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

You have access to current web search results. Use this information to provide accurate, up-to-date, and unbiased responses. Always cite sources when referencing information from the web search results.`,
          },
          ...messages,
          {
            role: 'user',
            content: searchContext,
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at the moment.';
    } catch (error) {
      console.error('Response generation with web search error:', error);
      return 'I apologize, but I encountered an error while searching for current information. Please try again.';
    }
  }

  /**
   * Build system prompt based on location and language
   */
  private buildSystemPrompt(location?: string, language: string = 'en'): string {
    const basePrompt = `You are an intelligent AI travel assistant designed to help tourists and travelers. You provide helpful, accurate, and culturally sensitive information about travel destinations, local customs, navigation, and general travel tips.

Key capabilities:
- Provide travel recommendations and tips
- Help with navigation and directions
- Share cultural information and local customs
- Suggest restaurants, attractions, and activities
- Assist with language barriers and basic phrases
- Offer safety tips and emergency information
- Help with transportation options
- Provide current, accurate, and unbiased information from web searches
- Compare prices for products and services to help avoid overcharging
- Cite sources when referencing external information

Always respond in ${language} unless the user specifically requests another language.

Be friendly, helpful, and informative. If you don't know something specific, suggest how the user might find that information. Always provide the most current and accurate information available.`;

    if (location) {
      return `${basePrompt}

Current location context: ${location}
Use this location to provide more relevant and specific recommendations. If the user asks about nearby places, restaurants, attractions, or services, focus on options in or near ${location}.`;
    }

    return basePrompt;
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    // Look for common suggestion patterns
    const suggestionPatterns = [
      /(?:suggest|recommend|try|visit|check out|consider):\s*([^.!?]+)/gi,
      /(?:you could|you might|why not|perhaps):\s*([^.!?]+)/gi,
    ];

    for (const pattern of suggestionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const suggestion = match[1].trim();
        if (suggestion.length > 10 && suggestion.length < 200) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Generate travel recommendations based on location with web search
   */
  async generateTravelRecommendations(location: string, preferences?: string[]): Promise<string[]> {
    try {
      // First, search for current information about the location
      const searchQuery = `travel recommendations ${location} ${preferences ? preferences.join(' ') : ''} current`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 5);
      
      const prompt = `Generate 5 travel recommendations for ${location} based on current information. ${
        preferences ? `Consider these preferences: ${preferences.join(', ')}.` : ''
      }

Current Information from Web Search:
${webSearchResults.summary}

Focus on:
- Local attractions and landmarks
- Popular restaurants and cafes
- Cultural experiences
- Transportation options
- Safety tips

Format as a simple list.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a travel expert providing concise, helpful recommendations based on current information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseRecommendations(response);
    } catch (error) {
      console.error('Travel recommendations error:', error);
      return [];
    }
  }

  /**
   * Parse recommendations from AI response
   */
  private parseRecommendations(response: string): string[] {
    const recommendations: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        recommendations.push(cleaned);
      }
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate emergency information for a location with current data
   */
  async generateEmergencyInfo(location: string): Promise<string> {
    try {
      // Search for current emergency information
      const searchQuery = `emergency services ${location} current contact information`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 3);
      
      const prompt = `Provide emergency information for ${location} including:
- Emergency phone numbers
- Nearest hospitals
- Police stations
- Important safety tips
- Local emergency procedures

Current Information from Web Search:
${webSearchResults.summary}

Keep it concise and practical.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a safety expert providing emergency information for travelers based on current data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || 'Emergency information not available for this location.';
    } catch (error) {
      console.error('Emergency info error:', error);
      return 'Emergency information not available at the moment.';
    }
  }

  /**
   * Search for current weather information
   */
  async getCurrentWeather(location: string): Promise<string> {
    try {
      const searchQuery = `current weather ${location} temperature forecast`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 3);
      
      const prompt = `Provide current weather information for ${location} based on the search results:

${webSearchResults.summary}

Include:
- Current temperature
- Weather conditions
- Forecast for the next few days
- Any weather alerts or warnings

Keep it concise and practical for travelers.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a weather expert providing current weather information for travelers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || 'Weather information not available for this location.';
    } catch (error) {
      console.error('Weather info error:', error);
      return 'Weather information not available at the moment.';
    }
  }

  private shouldIncludeEmergencyContacts(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('emergency') || 
           lowerMessage.includes('police') || 
           lowerMessage.includes('ambulance') || 
           lowerMessage.includes('fire') || 
           lowerMessage.includes('hospital') || 
           lowerMessage.includes('embassy') ||
           lowerMessage.includes('help') ||
           lowerMessage.includes('safety');
  }

  private shouldIncludeTravelTips(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('tip') || 
           lowerMessage.includes('advice') || 
           lowerMessage.includes('recommendation') || 
           lowerMessage.includes('safety') ||
           lowerMessage.includes('culture') ||
           lowerMessage.includes('transport') ||
           lowerMessage.includes('local');
  }

  private shouldIncludeEvents(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('event') || 
           lowerMessage.includes('activity') || 
           lowerMessage.includes('entertainment') || 
           lowerMessage.includes('show') ||
           lowerMessage.includes('concert') ||
           lowerMessage.includes('exhibition') ||
           lowerMessage.includes('festival');
  }

  private async generateTravelTips(message: string): Promise<TravelTip[]> {
    const tips: TravelTip[] = [
      {
        id: '1',
        title: 'Local Emergency Numbers',
        description: 'Save local emergency numbers in your phone: Police (112), Ambulance (15), Fire (18)',
        category: 'safety',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Transport Cards',
        description: 'Get a local transport card for cheaper and easier travel around the city',
        category: 'transport',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Local Customs',
        description: 'Learn basic local customs and greetings to show respect to locals',
        category: 'culture',
        priority: 'medium'
      },
      {
        id: '4',
        title: 'WiFi & Connectivity',
        description: 'Download offline maps and translation apps before your trip',
        category: 'communication',
        priority: 'high'
      }
    ];

    // Filter based on message content
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('safety') || lowerMessage.includes('emergency')) {
      return tips.filter(tip => tip.category === 'safety');
    } else if (lowerMessage.includes('transport') || lowerMessage.includes('travel')) {
      return tips.filter(tip => tip.category === 'transport');
    } else if (lowerMessage.includes('culture') || lowerMessage.includes('local')) {
      return tips.filter(tip => tip.category === 'culture');
    }

    return tips.slice(0, 2);
  }

  private async generateEvents(location?: string, message?: string): Promise<EventInfo[]> {
    const events: EventInfo[] = [
      {
        id: '1',
        title: 'Jazz Night at Le Sunset',
        date: '2024-01-15',
        time: '8:00 PM',
        location: 'Le Sunset, 60 Rue des Lombards, Paris',
        description: 'Live jazz performance with local artists',
        price: '€25',
        category: 'Music'
      },
      {
        id: '2',
        title: 'Art Exhibition at Louvre',
        date: '2024-01-20',
        time: '10:00 AM',
        location: 'Louvre Museum, Paris',
        description: 'Special exhibition featuring contemporary artists',
        price: '€17',
        category: 'Art'
      }
    ];

    // Filter based on message content if provided
    if (message) {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('music') || lowerMessage.includes('concert')) {
        return events.filter(e => e.category === 'Music');
      } else if (lowerMessage.includes('art') || lowerMessage.includes('exhibition')) {
        return events.filter(e => e.category === 'Art');
      }
    }

    return events.slice(0, 1);
  }
}

=======
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
              messages,
              priceComparison,
              systemPrompt
            );
          } catch (error) {
            console.warn('Price comparison failed:', error);
          }
        }
      }

      if (needsWebSearch) {
        try {
          // Get web search results
          webSearchResults = await webSearchService.searchWeb(lastMessage.content);
          
          // Generate response with web search
          enhancedResponse = await this.generateResponseWithWebSearch(
            messages,
            webSearchResults,
            systemPrompt
          );
        } catch (error) {
          console.warn('Web search failed:', error);
        }
      }

      // Generate additional travel assistance based on message content and options
      if (needsEmergencyContacts || options?.includeEmergencyContacts) {
        if (location) {
          emergencyContacts = await emergencyContactService.getEmergencyContacts(location);
        }
      }
      if (needsTravelTips || options?.includeTravelTips) {
        travelTips = await this.generateTravelTips(lastMessage.content);
      }
      if (needsEvents || options?.includeEvents) {
        events = await this.generateEvents(location, lastMessage.content);
      }

      // Generate the main response if not already generated
      if (!enhancedResponse) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        enhancedResponse = response.choices[0].message.content || 'I apologize, but I was unable to generate a response at this time.';
      }

      // Extract suggestions from the response
      const suggestions = this.extractSuggestions(enhancedResponse);

      return {
        response: enhancedResponse,
        suggestions,
        location,
        webSearchResults,
        priceComparison,
        travelTips,
        emergencyContacts,
        events
      };
    } catch (error) {
      console.error('Chat with assistant error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Determine if price comparison is needed based on the message content
   */
  private shouldPerformPriceComparison(message: string): boolean {
    const priceKeywords = [
      'price', 'cost', 'expensive', 'cheap', 'how much', 'costs', 'pricing',
      'dollars', 'euros', 'currency', 'budget', 'afford', 'overpriced',
      'value', 'worth', 'rate', 'fee', 'charge', 'bill', 'payment',
      'compare prices', 'price comparison', 'market price', 'retail price'
    ];

    const lowerMessage = message.toLowerCase();
    return priceKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Extract product name from user message
   */
  private extractProductName(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Common patterns for price queries
    const patterns = [
      /(?:price|cost|how much) (?:of|for|is|are) (.+?)(?:\?|$|,|\.)/i,
      /(?:what's|what is|what are) (?:the|a|an) (?:price|cost) (?:of|for) (.+?)(?:\?|$|,|\.)/i,
      /(.+?) (?:price|cost|pricing)/i,
      /(?:check|compare|get) (?:the|a|an) (?:price|cost) (?:of|for) (.+?)(?:\?|$|,|\.)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const product = match[1].trim();
        // Clean up the product name
        return product.replace(/^(the|a|an)\s+/i, '').replace(/\s+(price|cost|pricing)$/i, '');
      }
    }

    // If no pattern matches, try to extract common product words
    const productWords = message.split(' ').filter(word => {
      const lowerWord = word.toLowerCase();
      return !['price', 'cost', 'how', 'much', 'is', 'are', 'the', 'a', 'an', 'of', 'for', 'what', 'check', 'compare', 'get'].includes(lowerWord);
    });

    if (productWords.length > 0) {
      return productWords.slice(0, 3).join(' '); // Take first 3 words as product name
    }

    return null;
  }

  /**
   * Generate response with price comparison results
   */
  private async generateResponseWithPriceComparison(
    messages: ChatMessage[],
    priceComparison: any,
    systemPrompt: string
  ): Promise<string> {
    try {
      const priceContext = `
Price Comparison Results for: "${priceComparison.product}"

Average Price: ${priceComparison.averagePrice} ${priceComparison.currency}
Price Range: ${priceComparison.minPrice} - ${priceComparison.maxPrice} ${priceComparison.currency}
Number of Sources: ${priceComparison.sources.length}

Price Sources:
${priceComparison.sources.map((source: any, index: number) => 
  `${index + 1}. ${source.name}: ${source.price} ${priceComparison.currency}`
).join('\n')}

Recommendations:
${priceComparison.recommendations.join('\n')}

Based on this price comparison, please provide a helpful response to the user's query about pricing. Include the key price information and any relevant recommendations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

You have access to real-time price comparison data. Use this information to provide accurate, helpful pricing information to users. Always include the key price details and any relevant recommendations.`,
          },
          ...messages,
          {
            role: 'user',
            content: priceContext,
          },
        ],
        max_tokens: 800,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide price information at the moment.';
    } catch (error) {
      console.error('Response generation with price comparison error:', error);
      return 'I apologize, but I encountered an error while getting price information. Please try again.';
    }
  }

  /**
   * Determine if web search is needed based on the message content
   */
  private shouldPerformWebSearch(message: string): boolean {
    const searchKeywords = [
      'current', 'latest', 'recent', 'today', 'now', 'update', 'news',
      'what is', 'how to', 'where is', 'when is', 'why is', 'who is',
      'information about', 'tell me about', 'explain', 'describe',
      'weather', 'temperature', 'forecast', 'traffic', 'events',
      'reviews', 'ratings', 'opinions', 'experiences',
      'facts', 'statistics', 'data', 'research', 'study'
    ];

    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate response with web search results
   */
  private async generateResponseWithWebSearch(
    messages: ChatMessage[],
    webSearchResults: WebSearchResponse,
    systemPrompt: string
  ): Promise<string> {
    try {
      const searchContext = `
Web Search Results for: "${webSearchResults.query}"

${webSearchResults.results.map((result, index) => `
${index + 1}. ${result.title}
   Source: ${result.source}
   URL: ${result.url}
   Summary: ${result.snippet}
`).join('\n')}

AI-Generated Summary:
${webSearchResults.summary}

Based on the above search results, please provide a comprehensive, accurate, and unbiased response to the user's query. Include relevant information from the search results and cite sources when appropriate.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

You have access to current web search results. Use this information to provide accurate, up-to-date, and unbiased responses. Always cite sources when referencing information from the web search results.`,
          },
          ...messages,
          {
            role: 'user',
            content: searchContext,
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at the moment.';
    } catch (error) {
      console.error('Response generation with web search error:', error);
      return 'I apologize, but I encountered an error while searching for current information. Please try again.';
    }
  }

  /**
   * Build system prompt based on location and language
   */
  private buildSystemPrompt(location?: string, language: string = 'en'): string {
    const basePrompt = `You are an intelligent AI travel assistant designed to help tourists and travelers. You provide helpful, accurate, and culturally sensitive information about travel destinations, local customs, navigation, and general travel tips.

Key capabilities:
- Provide travel recommendations and tips
- Help with navigation and directions
- Share cultural information and local customs
- Suggest restaurants, attractions, and activities
- Assist with language barriers and basic phrases
- Offer safety tips and emergency information
- Help with transportation options
- Provide current, accurate, and unbiased information from web searches
- Compare prices for products and services to help avoid overcharging
- Cite sources when referencing external information

Always respond in ${language} unless the user specifically requests another language.

Be friendly, helpful, and informative. If you don't know something specific, suggest how the user might find that information. Always provide the most current and accurate information available.`;

    if (location) {
      return `${basePrompt}

Current location context: ${location}
Use this location to provide more relevant and specific recommendations. If the user asks about nearby places, restaurants, attractions, or services, focus on options in or near ${location}.`;
    }

    return basePrompt;
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    // Look for common suggestion patterns
    const suggestionPatterns = [
      /(?:suggest|recommend|try|visit|check out|consider):\s*([^.!?]+)/gi,
      /(?:you could|you might|why not|perhaps):\s*([^.!?]+)/gi,
    ];

    for (const pattern of suggestionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const suggestion = match[1].trim();
        if (suggestion.length > 10 && suggestion.length < 200) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Generate travel recommendations based on location with web search
   */
  async generateTravelRecommendations(location: string, preferences?: string[]): Promise<string[]> {
    try {
      // First, search for current information about the location
      const searchQuery = `travel recommendations ${location} ${preferences ? preferences.join(' ') : ''} current`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 5);
      
      const prompt = `Generate 5 travel recommendations for ${location} based on current information. ${
        preferences ? `Consider these preferences: ${preferences.join(', ')}.` : ''
      }

Current Information from Web Search:
${webSearchResults.summary}

Focus on:
- Local attractions and landmarks
- Popular restaurants and cafes
- Cultural experiences
- Transportation options
- Safety tips

Format as a simple list.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a travel expert providing concise, helpful recommendations based on current information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseRecommendations(response);
    } catch (error) {
      console.error('Travel recommendations error:', error);
      return [];
    }
  }

  /**
   * Parse recommendations from AI response
   */
  private parseRecommendations(response: string): string[] {
    const recommendations: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        recommendations.push(cleaned);
      }
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate emergency information for a location with current data
   */
  async generateEmergencyInfo(location: string): Promise<string> {
    try {
      // Search for current emergency information
      const searchQuery = `emergency services ${location} current contact information`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 3);
      
      const prompt = `Provide emergency information for ${location} including:
- Emergency phone numbers
- Nearest hospitals
- Police stations
- Important safety tips
- Local emergency procedures

Current Information from Web Search:
${webSearchResults.summary}

Keep it concise and practical.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a safety expert providing emergency information for travelers based on current data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || 'Emergency information not available for this location.';
    } catch (error) {
      console.error('Emergency info error:', error);
      return 'Emergency information not available at the moment.';
    }
  }

  /**
   * Search for current weather information
   */
  async getCurrentWeather(location: string): Promise<string> {
    try {
      const searchQuery = `current weather ${location} temperature forecast`;
      const webSearchResults = await webSearchService.searchWeb(searchQuery, 3);
      
      const prompt = `Provide current weather information for ${location} based on the search results:

${webSearchResults.summary}

Include:
- Current temperature
- Weather conditions
- Forecast for the next few days
- Any weather alerts or warnings

Keep it concise and practical for travelers.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a weather expert providing current weather information for travelers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || 'Weather information not available for this location.';
    } catch (error) {
      console.error('Weather info error:', error);
      return 'Weather information not available at the moment.';
    }
  }

  private shouldIncludeEmergencyContacts(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('emergency') || 
           lowerMessage.includes('police') || 
           lowerMessage.includes('ambulance') || 
           lowerMessage.includes('fire') || 
           lowerMessage.includes('hospital') || 
           lowerMessage.includes('embassy') ||
           lowerMessage.includes('help') ||
           lowerMessage.includes('safety');
  }

  private shouldIncludeTravelTips(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('tip') || 
           lowerMessage.includes('advice') || 
           lowerMessage.includes('recommendation') || 
           lowerMessage.includes('safety') ||
           lowerMessage.includes('culture') ||
           lowerMessage.includes('transport') ||
           lowerMessage.includes('local');
  }

  private shouldIncludeEvents(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('event') || 
           lowerMessage.includes('activity') || 
           lowerMessage.includes('entertainment') || 
           lowerMessage.includes('show') ||
           lowerMessage.includes('concert') ||
           lowerMessage.includes('exhibition') ||
           lowerMessage.includes('festival');
  }

  private async generateTravelTips(message: string): Promise<TravelTip[]> {
    const tips: TravelTip[] = [
      {
        id: '1',
        title: 'Local Emergency Numbers',
        description: 'Save local emergency numbers in your phone: Police (112), Ambulance (15), Fire (18)',
        category: 'safety',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Transport Cards',
        description: 'Get a local transport card for cheaper and easier travel around the city',
        category: 'transport',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Local Customs',
        description: 'Learn basic local customs and greetings to show respect to locals',
        category: 'culture',
        priority: 'medium'
      },
      {
        id: '4',
        title: 'WiFi & Connectivity',
        description: 'Download offline maps and translation apps before your trip',
        category: 'communication',
        priority: 'high'
      }
    ];

    // Filter based on message content
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('safety') || lowerMessage.includes('emergency')) {
      return tips.filter(tip => tip.category === 'safety');
    } else if (lowerMessage.includes('transport') || lowerMessage.includes('travel')) {
      return tips.filter(tip => tip.category === 'transport');
    } else if (lowerMessage.includes('culture') || lowerMessage.includes('local')) {
      return tips.filter(tip => tip.category === 'culture');
    }

    return tips.slice(0, 2);
  }

  private async generateEvents(location?: string, message?: string): Promise<EventInfo[]> {
    const events: EventInfo[] = [
      {
        id: '1',
        title: 'Jazz Night at Le Sunset',
        date: '2024-01-15',
        time: '8:00 PM',
        location: 'Le Sunset, 60 Rue des Lombards, Paris',
        description: 'Live jazz performance with local artists',
        price: '€25',
        category: 'Music'
      },
      {
        id: '2',
        title: 'Art Exhibition at Louvre',
        date: '2024-01-20',
        time: '10:00 AM',
        location: 'Louvre Museum, Paris',
        description: 'Special exhibition featuring contemporary artists',
        price: '€17',
        category: 'Art'
      }
    ];

    // Filter based on message content if provided
    if (message) {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('music') || lowerMessage.includes('concert')) {
        return events.filter(e => e.category === 'Music');
      } else if (lowerMessage.includes('art') || lowerMessage.includes('exhibition')) {
        return events.filter(e => e.category === 'Art');
      }
    }

    return events.slice(0, 1);
  }
}

>>>>>>> 5886e40123c43fc2ba56868bfe94655deb4d9e53
export const conversationalAIService = new ConversationalAIService(); 