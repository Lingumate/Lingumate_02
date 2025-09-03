
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: Date;
  relevance: number;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  summary: string;
  sources: string[];
  lastUpdated: Date;
}

export class WebSearchService {
  /**
   * Perform a comprehensive web search for current information
   */
  async searchWeb(query: string, maxResults: number = 10): Promise<WebSearchResponse> {
    try {
      // Use multiple search engines for comprehensive results
      const searchResults = await Promise.allSettled([
        this.searchGoogle(query, maxResults),
        this.searchBing(query, maxResults),
        this.searchDuckDuckGo(query, maxResults),
      ]);

      // Combine and deduplicate results
      const allResults = searchResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => (result as PromiseFulfilledResult<SearchResult[]>).value);

      // Remove duplicates based on URL
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Sort by relevance
      const sortedResults = uniqueResults.sort((a, b) => b.relevance - a.relevance).slice(0, maxResults);

      // Generate AI summary based on search results
      const summary = await this.generateSummary(query, sortedResults);

      return {
        query,
        results: sortedResults,
        summary,
        sources: sortedResults.map(r => r.source),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Web search error:', error);
      throw new Error('Failed to perform web search');
    }
  }

  /**
   * Search Google for current information
   */
  private async searchGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.g').each((i, element) => {
        if (i >= maxResults) return;

        const title = $(element).find('h3').text().trim();
        const url = $(element).find('a').first().attr('href') || '';
        const snippet = $(element).find('.VwiC3b').text().trim();

        if (title && url && snippet) {
          results.push({
            title,
            url: this.cleanUrl(url),
            snippet,
            source: 'Google',
            timestamp: new Date(),
            relevance: this.calculateRelevance(query, title, snippet),
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Google search error:', error);
      return [];
    }
  }

  /**
   * Search Bing for current information
   */
  private async searchBing(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.b_algo').each((i, element) => {
        if (i >= maxResults) return;

        const title = $(element).find('h2 a').text().trim();
        const url = $(element).find('h2 a').attr('href') || '';
        const snippet = $(element).find('.b_caption p').text().trim();

        if (title && url && snippet) {
          results.push({
            title,
            url: this.cleanUrl(url),
            snippet,
            source: 'Bing',
            timestamp: new Date(),
            relevance: this.calculateRelevance(query, title, snippet),
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Bing search error:', error);
      return [];
    }
  }

  /**
   * Search DuckDuckGo for current information
   */
  private async searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.result').each((i, element) => {
        if (i >= maxResults) return;

        const title = $(element).find('.result__title').text().trim();
        const url = $(element).find('.result__url').text().trim();
        const snippet = $(element).find('.result__snippet').text().trim();

        if (title && url && snippet) {
          results.push({
            title,
            url: this.cleanUrl(url),
            snippet,
            source: 'DuckDuckGo',
            timestamp: new Date(),
            relevance: this.calculateRelevance(query, title, snippet),
          });
        }
      });

      return results;
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return [];
    }
  }

  /**
   * Generate AI summary based on search results
   */
  private async generateSummary(query: string, results: SearchResult[]): Promise<string> {
    try {
      const context = results.map(r => `${r.title}: ${r.snippet}`).join('\n\n');
      
      const prompt = `Based on the following search results for "${query}", provide a comprehensive, accurate, and unbiased summary. Focus on the most current and relevant information. If there are conflicting sources, acknowledge the different perspectives.

Search Results:
${context}

Please provide a well-structured summary that:
1. Addresses the user's query directly
2. Includes the most current information available
3. Presents multiple perspectives when relevant
4. Cites sources when appropriate
5. Maintains objectivity and avoids bias

Summary:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert researcher providing accurate, current, and unbiased information based on web search results. Always cite sources and acknowledge different perspectives when relevant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || 'Unable to generate summary at this time.';
    } catch (error) {
      console.error('Summary generation error:', error);
      return 'Summary generation failed. Please refer to the search results directly.';
    }
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(query: string, title: string, snippet: string): number {
    const queryWords = query.toLowerCase().split(' ');
    const titleWords = title.toLowerCase().split(' ');
    const snippetWords = snippet.toLowerCase().split(' ');

    let score = 0;

    // Title relevance (higher weight)
    queryWords.forEach(word => {
      if (titleWords.includes(word)) score += 2;
      if (titleWords.some(tw => tw.includes(word))) score += 1;
    });

    // Snippet relevance
    queryWords.forEach(word => {
      if (snippetWords.includes(word)) score += 1;
      if (snippetWords.some(sw => sw.includes(word))) score += 0.5;
    });

    // Recency bonus (newer results get slight boost)
    score += 0.1;

    return score;
  }

  /**
   * Clean and validate URLs
   */
  private cleanUrl(url: string): string {
    // Remove Google redirects
    if (url.startsWith('/url?q=')) {
      url = url.replace('/url?q=', '');
    }
    
    // Extract actual URL from redirects
    const urlMatch = url.match(/https?:\/\/[^\s&]+/);
    if (urlMatch) {
      return urlMatch[0];
    }

    return url;
  }

  /**
   * Remove duplicate results based on URL
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Search for current news and updates
   */
  async searchNews(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      const newsQuery = `${query} news latest updates`;
      const newsResults = await this.searchWeb(newsQuery, maxResults);
      
      // Filter for news sources
      const newsSources = ['bbc', 'cnn', 'reuters', 'ap', 'npr', 'nytimes', 'washingtonpost', 'wsj'];
      return newsResults.results.filter(result => 
        newsSources.some(source => result.url.toLowerCase().includes(source))
      );
    } catch (error) {
      console.error('News search error:', error);
      return [];
    }
  }

  /**
   * Search for factual information and statistics
   */
  async searchFacts(query: string): Promise<SearchResult[]> {
    try {
      const factQuery = `${query} facts statistics data research`;
      const factResults = await this.searchWeb(factQuery, 5);
      
      // Filter for authoritative sources
      const authoritativeSources = ['wikipedia', 'gov', 'edu', 'who', 'un', 'worldbank', 'imf'];
      return factResults.results.filter(result => 
        authoritativeSources.some(source => result.url.toLowerCase().includes(source))
      );
    } catch (error) {
      console.error('Fact search error:', error);
      return [];
    }
  }
}


export const webSearchService = new WebSearchService(); 
