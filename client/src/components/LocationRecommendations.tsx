import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Clock } from 'lucide-react';
import { RecommendationItem } from '@/types/conversation';

interface LocationRecommendationsProps {
  location?: string;
  className?: string;
}

export default function LocationRecommendations({ location, className }: LocationRecommendationsProps) {
  const { data: recommendations, isLoading } = useQuery<RecommendationItem[]>({
    queryKey: ['/api/recommendations', location],
    enabled: !!location,
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600" data-testid="text-no-recommendations">
          No recommendations available for your current location.
        </p>
      </div>
    );
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-green-100 text-green-800';
      case 'attraction':
        return 'bg-blue-100 text-blue-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MapPin className="w-6 h-6 text-success mr-3" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Nearby Recommendations</h3>
            <p className="text-gray-600">Discover places around you</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((item) => (
          <Card 
            key={item.id} 
            className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            data-testid={`card-recommendation-${item.id}`}
          >
            <img 
              src={item.image} 
              alt={item.name}
              className="w-full h-32 object-cover"
              onError={(e) => {
                // Fallback to a gradient if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                target.style.display = 'flex';
                target.style.alignItems = 'center';
                target.style.justifyContent = 'center';
                target.innerHTML = item.name.charAt(0);
                target.style.color = 'white';
                target.style.fontSize = '2rem';
                target.style.fontWeight = 'bold';
              }}
            />
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900" data-testid={`text-name-${item.id}`}>
                  {item.name}
                </h4>
                {item.rating && (
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-gray-600 ml-1" data-testid={`text-rating-${item.id}`}>
                      {item.rating}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3 capitalize" data-testid={`text-type-${item.id}`}>
                {item.type} • {item.distance}
              </p>
              
              <div className="flex items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.type)}`}>
                  {item.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
