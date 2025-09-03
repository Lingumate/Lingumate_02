import axios from 'axios';
import * as cheerio from 'cheerio';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'ambulance' | 'fire' | 'hospital' | 'embassy' | 'tourist_info';
  description: string;
  country: string;
  region?: string;
}

interface CountryEmergencyData {
  country: string;
  iso2: string;
  contacts: EmergencyContact[];
  lastUpdated: Date;
}

export class EmergencyContactService {
  private static instance: EmergencyContactService;
  private cache: Map<string, CountryEmergencyData> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): EmergencyContactService {
    if (!EmergencyContactService.instance) {
      EmergencyContactService.instance = new EmergencyContactService();
    }
    return EmergencyContactService.instance;
  }

  async getEmergencyContacts(countryCode: string): Promise<EmergencyContact[]> {
    const countryName = this.getCountryName(countryCode);
    
    // Check cache first
    const cached = this.cache.get(countryCode);
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_DURATION) {
      console.log(`📞 Using cached emergency contacts for ${countryName}`);
      return cached.contacts;
    }

    console.log(`🔍 Scraping emergency contacts for ${countryName} (${countryCode})`);
    
    try {
      const contacts = await this.scrapeEmergencyContacts(countryName, countryCode);
      
      // Cache the results
      this.cache.set(countryCode, {
        country: countryName,
        iso2: countryCode,
        contacts,
        lastUpdated: new Date()
      });

      console.log(`✅ Found ${contacts.length} emergency contacts for ${countryName}`);
      return contacts;
    } catch (error) {
      console.error(`❌ Failed to scrape emergency contacts for ${countryName}:`, error);
      
      // Return fallback contacts if scraping fails
      return this.getFallbackContacts(countryName, countryCode);
    }
  }

  private async scrapeEmergencyContacts(countryName: string, countryCode: string): Promise<EmergencyContact[]> {
    const contacts: EmergencyContact[] = [];
    
    try {
      // Try multiple sources for emergency contacts
      const sources = [
        `https://en.wikipedia.org/wiki/Emergency_telephone_number#${countryName.replace(/\s+/g, '_')}`,
        `https://www.emergencynumbers.info/country/${countryCode.toLowerCase()}`,
        `https://www.wikidata.org/wiki/Property:P1198` // Emergency number property
      ];

      for (const source of sources) {
        try {
          const response = await axios.get(source, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const $ = cheerio.load(response.data);
          
          // Extract emergency numbers based on common patterns
          const extractedContacts = this.extractContactsFromHTML($, countryName, countryCode);
          contacts.push(...extractedContacts);
          
          if (contacts.length > 0) break; // Stop if we found contacts
        } catch (error) {
          console.log(`⚠️ Failed to scrape from ${source}:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
      }

      // If no contacts found from scraping, use AI to generate them
      if (contacts.length === 0) {
        console.log(`🤖 Using AI to generate emergency contacts for ${countryName}`);
        return await this.generateEmergencyContactsWithAI(countryName, countryCode);
      }

      return contacts;
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  private extractContactsFromHTML($: cheerio.CheerioAPI, countryName: string, countryCode: string): EmergencyContact[] {
    const contacts: EmergencyContact[] = [];
    
    // Common patterns for emergency numbers
    const patterns = [
      { type: 'police', regex: /police.*?(\d{3,4})/i },
      { type: 'ambulance', regex: /ambulance.*?(\d{3,4})/i },
      { type: 'fire', regex: /fire.*?(\d{3,4})/i },
      { type: 'hospital', regex: /hospital.*?(\d{3,4})/i }
    ];

    // Extract text content
    const text = $('body').text();
    
    patterns.forEach((pattern, index) => {
      const match = text.match(pattern.regex);
      if (match) {
        contacts.push({
          id: `${countryCode}-${pattern.type}-${index}`,
          name: `${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} Emergency`,
          phone: match[1],
          type: pattern.type as any,
          description: `Emergency ${pattern.type} number for ${countryName}`,
          country: countryName
        });
      }
    });

    return contacts;
  }

  private async generateEmergencyContactsWithAI(countryName: string, countryCode: string): Promise<EmergencyContact[]> {
    try {
      const { ai } = await import('./genkit');
      
      const prompt = `Generate emergency contact numbers for ${countryName} (${countryCode}). 
      Provide the following emergency numbers in JSON format:
      - Police emergency number
      - Ambulance/Medical emergency number  
      - Fire emergency number
      - General emergency number (if different)
      
      Format the response as a JSON array with objects containing:
      {
        "type": "police|ambulance|fire|hospital",
        "name": "Service Name",
        "phone": "phone number",
        "description": "brief description"
      }
      
      Only provide the JSON response, no additional text.`;

      const response = await ai.generateText({ prompt });
      const jsonText = response.text().trim();
      
      // Extract JSON from response
      const jsonMatch = jsonText.match(/\[.*\]/s);
      if (jsonMatch) {
        const contacts = JSON.parse(jsonMatch[0]);
        return contacts.map((contact: any, index: number) => ({
          id: `${countryCode}-${contact.type}-${index}`,
          name: contact.name,
          phone: contact.phone,
          type: contact.type,
          description: contact.description,
          country: countryName
        }));
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    }

    return this.getFallbackContacts(countryName, countryCode);
  }

  private getFallbackContacts(countryName: string, countryCode: string): EmergencyContact[] {
    // Fallback emergency contacts for common countries
    const fallbackData: { [key: string]: EmergencyContact[] } = {
      'US': [
        { id: 'US-police-0', name: 'Police Emergency', phone: '911', type: 'police', description: 'Emergency police number for United States', country: 'United States' },
        { id: 'US-ambulance-0', name: 'Ambulance Emergency', phone: '911', type: 'ambulance', description: 'Emergency medical number for United States', country: 'United States' },
        { id: 'US-fire-0', name: 'Fire Emergency', phone: '911', type: 'fire', description: 'Emergency fire number for United States', country: 'United States' }
      ],
      'IN': [
        { id: 'IN-police-0', name: 'Police Emergency', phone: '100', type: 'police', description: 'Emergency police number for India', country: 'India' },
        { id: 'IN-ambulance-0', name: 'Ambulance Emergency', phone: '102', type: 'ambulance', description: 'Emergency medical number for India', country: 'India' },
        { id: 'IN-fire-0', name: 'Fire Emergency', phone: '101', type: 'fire', description: 'Emergency fire number for India', country: 'India' }
      ],
      'GB': [
        { id: 'GB-police-0', name: 'Police Emergency', phone: '999', type: 'police', description: 'Emergency police number for United Kingdom', country: 'United Kingdom' },
        { id: 'GB-ambulance-0', name: 'Ambulance Emergency', phone: '999', type: 'ambulance', description: 'Emergency medical number for United Kingdom', country: 'United Kingdom' },
        { id: 'GB-fire-0', name: 'Fire Emergency', phone: '999', type: 'fire', description: 'Emergency fire number for United Kingdom', country: 'United Kingdom' }
      ],
      'FR': [
        { id: 'FR-police-0', name: 'Police Emergency', phone: '17', type: 'police', description: 'Emergency police number for France', country: 'France' },
        { id: 'FR-ambulance-0', name: 'Ambulance Emergency', phone: '15', type: 'ambulance', description: 'Emergency medical number for France', country: 'France' },
        { id: 'FR-fire-0', name: 'Fire Emergency', phone: '18', type: 'fire', description: 'Emergency fire number for France', country: 'France' }
      ],
      'DE': [
        { id: 'DE-police-0', name: 'Police Emergency', phone: '110', type: 'police', description: 'Emergency police number for Germany', country: 'Germany' },
        { id: 'DE-ambulance-0', name: 'Ambulance Emergency', phone: '112', type: 'ambulance', description: 'Emergency medical number for Germany', country: 'Germany' },
        { id: 'DE-fire-0', name: 'Fire Emergency', phone: '112', type: 'fire', description: 'Emergency fire number for Germany', country: 'Germany' }
      ]
    };

    return fallbackData[countryCode] || [
      {
        id: `${countryCode}-general-0`,
        name: 'General Emergency',
        phone: '112',
        type: 'hospital',
        description: `General emergency number for ${countryName} (may vary by region)`,
        country: countryName
      }
    ];
  }

  private getCountryName(countryCode: string): string {
    const countryMap: { [key: string]: string } = {
      'US': 'United States',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'DE': 'Germany',
      'GB': 'United Kingdom',
      'FR': 'France',
      'IT': 'Italy',
      'CA': 'Canada',
      'BR': 'Brazil',
      'AU': 'Australia',
      'RU': 'Russia',
      'KR': 'South Korea',
      'ES': 'Spain',
      'MX': 'Mexico',
      'ID': 'Indonesia',
      'NL': 'Netherlands',
      'SA': 'Saudi Arabia',
      'TR': 'Turkey',
      'CH': 'Switzerland'
    };

    return countryMap[countryCode] || countryCode;
  }

  async resolveLocationToCountry(lat: number, lng: number): Promise<{ iso2: string; name: string }> {
    try {
      // Use reverse geocoding to get country from coordinates
      const response = await axios.get(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { timeout: 5000 }
      );

      const data = response.data;
      return {
        iso2: data.countryCode,
        name: data.countryName
      };
    } catch (error) {
      console.error('Location resolution failed:', error);
      throw new Error('Failed to resolve location to country');
    }
  }
}

export const emergencyContactService = EmergencyContactService.getInstance(); 
