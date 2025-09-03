<<<<<<< HEAD
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PriceInfo {
  product: string;
  price: number;
  currency: string;
  source: string;
  location?: string;
  timestamp: Date;
  url?: string;
  description?: string;
}

export interface PriceComparisonResult {
  product: string;
  averagePrice: number;
  currency: string;
  priceRange: {
    min: number;
    max: number;
  };
  sources: PriceInfo[];
  recommendations: string[];
  lastUpdated: Date;
}

export class PriceComparisonService {
  /**
   * Get price comparison for a product
   */
  async getPriceComparison(
    product: string,
    location?: string,
    currency: string = 'USD'
  ): Promise<PriceComparisonResult> {
    try {
      // First, use AI to enhance the search query
      const enhancedQuery = await this.enhanceSearchQuery(product, location);
      
      // Scrape prices from multiple sources (with error handling)
      const prices = await Promise.allSettled([
        this.scrapeAmazonPrices(enhancedQuery),
        this.scrapeGoogleShoppingPrices(enhancedQuery),
        this.scrapeLocalMarketPrices(enhancedQuery, location),
        this.scrapeEbayPrices(enhancedQuery),
      ]);

      // Flatten and filter valid prices
      const allPrices = prices
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => (result as PromiseFulfilledResult<PriceInfo[]>).value)
        .filter(price => price && price.price > 0);

      if (allPrices.length === 0) {
        return this.generateFallbackPriceInfo(product, currency);
      }

      // Calculate statistics
      const pricesArray = allPrices.map(p => p.price);
      const averagePrice = pricesArray.reduce((a, b) => a + b, 0) / pricesArray.length;
      const minPrice = Math.min(...pricesArray);
      const maxPrice = Math.max(...pricesArray);

      // Generate recommendations
      const recommendations = await this.generatePriceRecommendations(
        product,
        averagePrice,
        minPrice,
        maxPrice,
        location
      );

      return {
        product,
        averagePrice: Math.round(averagePrice * 100) / 100,
        currency,
        priceRange: {
          min: Math.round(minPrice * 100) / 100,
          max: Math.round(maxPrice * 100) / 100,
        },
        sources: allPrices.slice(0, 10), // Limit to top 10 sources
        recommendations,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Price comparison error:', error);
      return this.generateFallbackPriceInfo(product, currency);
    }
  }

  /**
   * Enhance search query using AI
   */
  private async enhanceSearchQuery(product: string, location?: string): Promise<string> {
    try {
      const prompt = `Enhance this product search query for better price comparison results: "${product}"${location ? ` in ${location}` : ''}. 
      Return only the enhanced query, no explanations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a search query optimization expert. Enhance product search queries for better price comparison results.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content?.trim() || product;
    } catch (error) {
      console.error('Query enhancement error:', error);
      return product;
    }
  }

  /**
   * Scrape Amazon prices
   */
  private async scrapeAmazonPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-result-item').each((i, element) => {
        if (i >= 5) return; // Limit to first 5 results

        const title = $(element).find('.a-text-normal').first().text().trim();
        const priceText = $(element).find('.a-price-whole').first().text().trim();
        const priceFraction = $(element).find('.a-price-fraction').first().text().trim();
        const url = $(element).find('a[href*="/dp/"]').first().attr('href');

        if (title && priceText) {
          const price = parseFloat(priceText + (priceFraction ? '.' + priceFraction : ''));
          if (!isNaN(price) && price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'Amazon',
              timestamp: new Date(),
              url: url ? `https://www.amazon.com${url}` : undefined,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('Amazon scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Google Shopping prices
   */
  private async scrapeGoogleShoppingPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.sh-dlr__product-result').each((i, element) => {
        if (i >= 5) return;

        const title = $(element).find('.sh-dlr__product-title').text().trim();
        const priceText = $(element).find('.sh-dlr__product-price').text().trim();
        const url = $(element).find('a').first().attr('href');

        if (title && priceText) {
          const price = this.extractPriceFromText(priceText);
          if (price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'Google Shopping',
              timestamp: new Date(),
              url,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('Google Shopping scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape local market prices (simulated)
   */
  private async scrapeLocalMarketPrices(query: string, location?: string): Promise<PriceInfo[]> {
    try {
      // Simulate local market scraping by using AI to generate realistic prices
      const prompt = `Generate 3 realistic local market prices for "${query}"${location ? ` in ${location}` : ''}. 
      Return only the prices as numbers, separated by commas.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a local market price expert. Generate realistic local market prices for products.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      const priceText = completion.choices[0]?.message?.content?.trim() || '';
      const prices = priceText.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);

      return prices.map((price, i) => ({
        product: query,
        price,
        currency: 'USD',
        source: `Local Market ${i + 1}`,
        location,
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Local market scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape eBay prices
   */
  private async scrapeEbayPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-item').each((i, element) => {
        if (i >= 5) return;

        const title = $(element).find('.s-item__title').text().trim();
        const priceText = $(element).find('.s-item__price').text().trim();
        const url = $(element).find('.s-item__link').attr('href');

        if (title && priceText) {
          const price = this.extractPriceFromText(priceText);
          if (price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'eBay',
              timestamp: new Date(),
              url,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('eBay scraping error:', error);
      return [];
    }
  }

  /**
   * Extract price from text
   */
  private extractPriceFromText(text: string): number {
    const priceMatch = text.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      return parseFloat(priceMatch[0].replace(/,/g, ''));
    }
    return 0;
  }

  /**
   * Generate price recommendations
   */
  private async generatePriceRecommendations(
    product: string,
    averagePrice: number,
    minPrice: number,
    maxPrice: number,
    location?: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on the price analysis for "${product}" (average: $${averagePrice}, range: $${minPrice}-${maxPrice})${location ? ` in ${location}` : ''}, provide 3 practical recommendations for users to avoid being overcharged. Keep each recommendation under 100 characters.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a price comparison expert providing practical advice to help users avoid being overcharged.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content || '';
      return response.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return [
        'Compare prices across multiple sources before purchasing',
        'Check for seasonal sales and discounts',
        'Consider buying from reputable online retailers'
      ];
    }
  }

  /**
   * Generate fallback price info when scraping fails
   */
  private generateFallbackPriceInfo(product: string, currency: string): PriceComparisonResult {
    return {
      product,
      averagePrice: 0,
      currency,
      priceRange: { min: 0, max: 0 },
      sources: [],
      recommendations: [
        'Unable to fetch current prices. Try searching with more specific terms.',
        'Check multiple online retailers for price comparison.',
        'Consider asking locals for typical prices in the area.'
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(product: string, days: number = 30): Promise<PriceInfo[]> {
    // This would typically connect to a database with historical price data
    // For now, we'll return a simulated price history
    const history: PriceInfo[] = [];
    const basePrice = 50 + Math.random() * 100;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const priceVariation = (Math.random() - 0.5) * 20;
      
      history.push({
        product,
        price: Math.max(0, basePrice + priceVariation),
        currency: 'USD',
        source: 'Historical Data',
        timestamp: date,
      });
    }

    return history;
  }
}

=======
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PriceInfo {
  product: string;
  price: number;
  currency: string;
  source: string;
  location?: string;
  timestamp: Date;
  url?: string;
  description?: string;
}

export interface PriceComparisonResult {
  product: string;
  averagePrice: number;
  currency: string;
  priceRange: {
    min: number;
    max: number;
  };
  sources: PriceInfo[];
  recommendations: string[];
  lastUpdated: Date;
}

export class PriceComparisonService {
  /**
   * Get price comparison for a product
   */
  async getPriceComparison(
    product: string,
    location?: string,
    currency: string = 'USD'
  ): Promise<PriceComparisonResult> {
    try {
      // First, use AI to enhance the search query
      const enhancedQuery = await this.enhanceSearchQuery(product, location);
      
      // Scrape prices from multiple sources (with error handling)
      const prices = await Promise.allSettled([
        this.scrapeAmazonPrices(enhancedQuery),
        this.scrapeGoogleShoppingPrices(enhancedQuery),
        this.scrapeLocalMarketPrices(enhancedQuery, location),
        this.scrapeEbayPrices(enhancedQuery),
      ]);

      // Flatten and filter valid prices
      const allPrices = prices
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => (result as PromiseFulfilledResult<PriceInfo[]>).value)
        .filter(price => price && price.price > 0);

      if (allPrices.length === 0) {
        return this.generateFallbackPriceInfo(product, currency);
      }

      // Calculate statistics
      const pricesArray = allPrices.map(p => p.price);
      const averagePrice = pricesArray.reduce((a, b) => a + b, 0) / pricesArray.length;
      const minPrice = Math.min(...pricesArray);
      const maxPrice = Math.max(...pricesArray);

      // Generate recommendations
      const recommendations = await this.generatePriceRecommendations(
        product,
        averagePrice,
        minPrice,
        maxPrice,
        location
      );

      return {
        product,
        averagePrice: Math.round(averagePrice * 100) / 100,
        currency,
        priceRange: {
          min: Math.round(minPrice * 100) / 100,
          max: Math.round(maxPrice * 100) / 100,
        },
        sources: allPrices.slice(0, 10), // Limit to top 10 sources
        recommendations,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Price comparison error:', error);
      return this.generateFallbackPriceInfo(product, currency);
    }
  }

  /**
   * Enhance search query using AI
   */
  private async enhanceSearchQuery(product: string, location?: string): Promise<string> {
    try {
      const prompt = `Enhance this product search query for better price comparison results: "${product}"${location ? ` in ${location}` : ''}. 
      Return only the enhanced query, no explanations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a search query optimization expert. Enhance product search queries for better price comparison results.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content?.trim() || product;
    } catch (error) {
      console.error('Query enhancement error:', error);
      return product;
    }
  }

  /**
   * Scrape Amazon prices
   */
  private async scrapeAmazonPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-result-item').each((i, element) => {
        if (i >= 5) return; // Limit to first 5 results

        const title = $(element).find('.a-text-normal').first().text().trim();
        const priceText = $(element).find('.a-price-whole').first().text().trim();
        const priceFraction = $(element).find('.a-price-fraction').first().text().trim();
        const url = $(element).find('a[href*="/dp/"]').first().attr('href');

        if (title && priceText) {
          const price = parseFloat(priceText + (priceFraction ? '.' + priceFraction : ''));
          if (!isNaN(price) && price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'Amazon',
              timestamp: new Date(),
              url: url ? `https://www.amazon.com${url}` : undefined,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('Amazon scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Google Shopping prices
   */
  private async scrapeGoogleShoppingPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.sh-dlr__product-result').each((i, element) => {
        if (i >= 5) return;

        const title = $(element).find('.sh-dlr__product-title').text().trim();
        const priceText = $(element).find('.sh-dlr__product-price').text().trim();
        const url = $(element).find('a').first().attr('href');

        if (title && priceText) {
          const price = this.extractPriceFromText(priceText);
          if (price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'Google Shopping',
              timestamp: new Date(),
              url,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('Google Shopping scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape local market prices (simulated)
   */
  private async scrapeLocalMarketPrices(query: string, location?: string): Promise<PriceInfo[]> {
    try {
      // Simulate local market scraping by using AI to generate realistic prices
      const prompt = `Generate 3 realistic local market prices for "${query}"${location ? ` in ${location}` : ''}. 
      Return only the prices as numbers, separated by commas.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a local market price expert. Generate realistic local market prices for products.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      const priceText = completion.choices[0]?.message?.content?.trim() || '';
      const prices = priceText.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);

      return prices.map((price, i) => ({
        product: query,
        price,
        currency: 'USD',
        source: `Local Market ${i + 1}`,
        location,
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Local market scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape eBay prices
   */
  private async scrapeEbayPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-item').each((i, element) => {
        if (i >= 5) return;

        const title = $(element).find('.s-item__title').text().trim();
        const priceText = $(element).find('.s-item__price').text().trim();
        const url = $(element).find('.s-item__link').attr('href');

        if (title && priceText) {
          const price = this.extractPriceFromText(priceText);
          if (price > 0) {
            prices.push({
              product: title,
              price,
              currency: 'USD',
              source: 'eBay',
              timestamp: new Date(),
              url,
            });
          }
        }
      });

      return prices;
    } catch (error) {
      console.error('eBay scraping error:', error);
      return [];
    }
  }

  /**
   * Extract price from text
   */
  private extractPriceFromText(text: string): number {
    const priceMatch = text.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      return parseFloat(priceMatch[0].replace(/,/g, ''));
    }
    return 0;
  }

  /**
   * Generate price recommendations
   */
  private async generatePriceRecommendations(
    product: string,
    averagePrice: number,
    minPrice: number,
    maxPrice: number,
    location?: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on the price analysis for "${product}" (average: $${averagePrice}, range: $${minPrice}-${maxPrice})${location ? ` in ${location}` : ''}, provide 3 practical recommendations for users to avoid being overcharged. Keep each recommendation under 100 characters.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a price comparison expert providing practical advice to help users avoid being overcharged.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content || '';
      return response.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return [
        'Compare prices across multiple sources before purchasing',
        'Check for seasonal sales and discounts',
        'Consider buying from reputable online retailers'
      ];
    }
  }

  /**
   * Generate fallback price info when scraping fails
   */
  private generateFallbackPriceInfo(product: string, currency: string): PriceComparisonResult {
    return {
      product,
      averagePrice: 0,
      currency,
      priceRange: { min: 0, max: 0 },
      sources: [],
      recommendations: [
        'Unable to fetch current prices. Try searching with more specific terms.',
        'Check multiple online retailers for price comparison.',
        'Consider asking locals for typical prices in the area.'
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(product: string, days: number = 30): Promise<PriceInfo[]> {
    // This would typically connect to a database with historical price data
    // For now, we'll return a simulated price history
    const history: PriceInfo[] = [];
    const basePrice = 50 + Math.random() * 100;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const priceVariation = (Math.random() - 0.5) * 20;
      
      history.push({
        product,
        price: Math.max(0, basePrice + priceVariation),
        currency: 'USD',
        source: 'Historical Data',
        timestamp: date,
      });
    }

    return history;
  }
}

>>>>>>> 5886e40123c43fc2ba56868bfe94655deb4d9e53
export const priceComparisonService = new PriceComparisonService(); 