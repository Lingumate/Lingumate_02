import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Star,
  Clock,
  MapPin
} from 'lucide-react';

interface PriceInfo {
  product: string;
  price: number;
  currency: string;
  source: string;
  location?: string;
  timestamp: Date;
  url?: string;
  description?: string;
}

interface PriceComparisonResult {
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

interface PriceComparisonProps {
  userLocation?: string;
  userCurrency?: string;
}

export default function PriceComparison({ userLocation = 'Paris, France', userCurrency = 'USD' }: PriceComparisonProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceComparisonResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product name to search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/price-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: searchQuery,
          location: userLocation,
          currency: userCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get price comparison');
      }

      const data = await response.json();
      setPriceData(data);
      
      // Add to recent searches
      setRecentSearches(prev => {
        const newSearches = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
        return newSearches;
      });

      toast({
        title: "Success",
        description: `Found ${data.sources.length} price sources for ${searchQuery}`,
      });
    } catch (error) {
      console.error('Price comparison error:', error);
      toast({
        title: "Error",
        description: "Failed to get price comparison. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = (product: string) => {
    setSearchQuery(product);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getPriceTrend = (price: number, averagePrice: number) => {
    if (price < averagePrice * 0.9) return 'good';
    if (price > averagePrice * 1.1) return 'high';
    return 'normal';
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'amazon':
        return '🛒';
      case 'ebay':
        return '📦';
      case 'google shopping':
        return '🔍';
      default:
        return '🏪';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Price Comparison Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Section */}
          <div className="flex gap-2 mb-6">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter product name (e.g., iPhone 15, Nike shoes, coffee beans)..."
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches:</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(search)}
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Price Comparison Results */}
          {priceData && (
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">{priceData.product}</h3>
                      <p className="text-sm text-blue-700">
                        Average Price: {formatPrice(priceData.averagePrice, priceData.currency)}
                      </p>
                      <p className="text-sm text-blue-700">
                        Price Range: {formatPrice(priceData.priceRange.min, priceData.currency)} - {formatPrice(priceData.priceRange.max, priceData.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">
                        {priceData.sources.length} Sources
                      </Badge>
                      <p className="text-xs text-blue-600">
                        Updated: {new Date(priceData.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Sources */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Price Sources</h3>
                <div className="grid gap-3">
                  {priceData.sources.map((source, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getSourceIcon(source.source)}</span>
                              <h4 className="font-medium">{source.product}</h4>
                              <Badge 
                                variant={getPriceTrend(source.price, priceData.averagePrice) === 'good' ? 'default' : 
                                         getPriceTrend(source.price, priceData.averagePrice) === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {getPriceTrend(source.price, priceData.averagePrice) === 'good' ? (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                ) : getPriceTrend(source.price, priceData.averagePrice) === 'high' ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : null}
                                {getPriceTrend(source.price, priceData.averagePrice) === 'good' ? 'Good Deal' : 
                                 getPriceTrend(source.price, priceData.averagePrice) === 'high' ? 'High Price' : 'Average'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{source.source}</p>
                            {source.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin className="w-3 h-3" />
                                {source.location}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatPrice(source.price, source.currency)}
                            </div>
                            {source.url && (
                              <Button size="sm" variant="outline" className="mt-1">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {priceData.recommendations.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Price Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {priceData.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-yellow-800">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Searching for prices across multiple sources...</p>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !priceData && searchQuery && (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No price data found for "{searchQuery}"</p>
              <p className="text-sm text-gray-500">Try searching with different terms or check spelling</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 