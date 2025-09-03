
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
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a search query optimizer. Enhance the given product search query to get better results.'
          },
          {
            role: 'user',
            content: `Optimize this search query for price comparison: "${product}"${location ? ` in ${location}` : ''}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || product;
    } catch (error) {
      console.error('AI query enhancement failed:', error);
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-result-item').each((i, element) => {
        const title = $(element).find('h2 a span').text().trim();
        const priceText = $(element).find('.a-price-whole').text().trim();
        const url = $(element).find('h2 a').attr('href');

        if (title && priceText) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) {
            const priceInfo: PriceInfo = {
              product: title,
              price,
              currency: 'USD',
              source: 'Amazon',
              timestamp: new Date(),
            };
            
            if (url) {
              priceInfo.url = `https://www.amazon.com${url}`;
            }
            
            prices.push(priceInfo);
          }
        }
      });

      return prices.slice(0, 5);
    } catch (error) {
      console.error('Amazon scraping failed:', error);
      return [];
    }
  }

  /**
   * Scrape Google Shopping prices
   */
  private async scrapeGoogleShoppingPrices(query: string): Promise<PriceInfo[]> {
    try {
      const searchUrl = `https://shopping.google.com/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.sh-dlr__product-result').each((i, element) => {
        const title = $(element).find('.sh-dlr__product-title').text().trim();
        const priceText = $(element).find('.sh-dlr__price').text().trim();
        const url = $(element).find('a').attr('href');

        if (title && priceText) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) {
            const priceInfo: PriceInfo = {
              product: title,
              price,
              currency: 'USD',
              source: 'Google Shopping',
              timestamp: new Date(),
            };
            
            if (url) {
              priceInfo.url = url;
            }
            
            prices.push(priceInfo);
          }
        }
      });

      return prices.slice(0, 5);
    } catch (error) {
      console.error('Google Shopping scraping failed:', error);
      return [];
    }
  }

  /**
   * Scrape local market prices
   */
  private async scrapeLocalMarketPrices(query: string, location?: string): Promise<PriceInfo[]> {
    if (!location) return [];

    try {
      // This would integrate with local market APIs
      // For now, return mock data
      return [
        {
          product: query,
          price: Math.random() * 100 + 20,
          currency: 'USD',
          source: 'Local Market',
          location,
          timestamp: new Date(),
        }
      ];
    } catch (error) {
      console.error('Local market scraping failed:', error);
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const prices: PriceInfo[] = [];

      $('.s-item').each((i, element) => {
        const title = $(element).find('.s-item__title').text().trim();
        const priceText = $(element).find('.s-item__price').text().trim();
        const url = $(element).find('.s-item__link').attr('href');

        if (title && priceText) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) {
            const priceInfo: PriceInfo = {
              product: title,
              price,
              currency: 'USD',
              source: 'eBay',
              timestamp: new Date(),
            };
            
            if (url) {
              priceInfo.url = url;
            }
            
            prices.push(priceInfo);
          }
        }
      });

      return prices.slice(0, 5);
    } catch (error) {
      console.error('eBay scraping failed:', error);
      return [];
    }
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
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a shopping advisor. Provide helpful price recommendations based on the given price data.'
          },
          {
            role: 'user',
            content: `Product: ${product}
Average Price: $${averagePrice}
Price Range: $${minPrice} - $${maxPrice}
${location ? `Location: ${location}` : ''}

Provide 3-5 helpful shopping recommendations:`
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const recommendations = response.choices[0]?.message?.content || '';
      return recommendations.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      console.error('AI recommendations failed:', error);
      return [
        'Compare prices across multiple sources',
        'Check for seasonal sales and discounts',
        'Consider shipping costs when comparing prices'
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
        'Unable to fetch current prices',
        'Try searching manually on major retailers',
        'Check local stores for pricing'
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Get price history for a product (placeholder implementation)
   */
  async getPriceHistory(product: string, days: number): Promise<PriceInfo[]> {
    // This is a placeholder implementation
    // In a real application, you would store and retrieve price history from a database
    console.log(`Getting price history for ${product} over ${days} days`);
    
    // Return empty array for now
    return [];
  }
}

export const priceComparisonService = new PriceComparisonService(); 
