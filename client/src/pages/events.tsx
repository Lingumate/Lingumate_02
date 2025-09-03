import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUserCountry } from '@/hooks/useUserCountry';
import Navigation from '@/components/Navigation';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Crown, 
  Globe, 
  Sparkles, 
  Trophy,
  Wine,
  Camera,
  Plane,
  Heart,
  Zap,
  ArrowRight,
  Clock,
  DollarSign,
  Search,
  Filter,
  Navigation as NavigationIcon,
  Target
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  category: 'ultra-elite' | 'prestige' | 'cultural';
  price: number;
  date: string;
  location: string;
  image: string;
  capacity: number;
  booked: number;
  highlights: string[];
  isInviteOnly?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const events: Event[] = [
  // Ultra Elite Experiences
  {
    id: 'ue-1',
    title: 'Monaco Grand Prix Private Island Experience',
    description: 'Exclusive access to a private island during the Monaco Grand Prix weekend. Includes private yacht transfers, celebrity chef dining, and VIP race viewing.',
    category: 'ultra-elite',
    price: 500000,
    date: '2024-05-25',
    location: 'Monaco',
    image: '/api/placeholder/600/400',
    capacity: 20,
    booked: 15,
    highlights: ['Private Island Access', 'Celebrity Chef Dining', 'VIP Race Viewing', 'Luxury Yacht Transfers'],
    isInviteOnly: true,
    coordinates: { lat: 43.7384, lng: 7.4246 }
  },
  {
    id: 'ue-2',
    title: 'Art Basel Private Collection Auction',
    description: 'Exclusive art auction featuring rare masterpieces and private collection viewings. Includes private dinners with artists and collectors.',
    category: 'ultra-elite',
    price: 750000,
    date: '2024-06-15',
    location: 'Basel, Switzerland',
    image: '/api/placeholder/600/400',
    capacity: 15,
    booked: 12,
    highlights: ['Private Art Collections', 'Exclusive Auctions', 'Artist Dinners', 'Luxury Accommodations'],
    isInviteOnly: true,
    coordinates: { lat: 47.3769, lng: 8.5417 }
  },
  
  // Prestige Networking Events
  {
    id: 'pn-1',
    title: 'Tech Leaders Summit & Yacht Networking',
    description: 'Exclusive networking event with tech industry leaders. Includes keynote talks, yacht party, and private dining experiences.',
    category: 'prestige',
    price: 5000,
    date: '2024-04-20',
    location: 'San Francisco, CA',
    image: '/api/placeholder/600/400',
    capacity: 100,
    booked: 75,
    highlights: ['Tech Leaders Networking', 'Keynote Talks', 'Yacht Party', 'Premium Dining'],
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  {
    id: 'pn-2',
    title: 'Wine & Business in Tuscany',
    description: 'Luxury wine tasting and business networking in the heart of Tuscany. Includes vineyard tours and gourmet dining.',
    category: 'prestige',
    price: 3500,
    date: '2024-05-10',
    location: 'Tuscany, Italy',
    image: '/api/placeholder/600/400',
    capacity: 50,
    booked: 30,
    highlights: ['Premium Wine Tasting', 'Business Networking', 'Vineyard Tours', 'Gourmet Dining'],
    coordinates: { lat: 43.7711, lng: 11.2486 }
  },
  {
    id: 'pn-3',
    title: 'London Financial District Networking',
    description: 'Exclusive networking event in the heart of London\'s financial district. Connect with global business leaders.',
    category: 'prestige',
    price: 4000,
    date: '2024-04-30',
    location: 'London, UK',
    image: '/api/placeholder/600/400',
    capacity: 80,
    booked: 60,
    highlights: ['Financial Networking', 'City Tours', 'Premium Dining', 'Business Workshops'],
    coordinates: { lat: 51.5074, lng: -0.1278 }
  },
  
  // Cultural Explorer Events
  {
    id: 'ce-1',
    title: 'Tokyo Cultural Immersion',
    description: 'Explore the rich culture of Tokyo through guided tours, traditional workshops, and authentic dining experiences.',
    category: 'cultural',
    price: 500,
    date: '2024-04-15',
    location: 'Tokyo, Japan',
    image: '/api/placeholder/600/400',
    capacity: 200,
    booked: 150,
    highlights: ['Cultural Workshops', 'Traditional Dining', 'Guided Tours', 'Local Experiences'],
    coordinates: { lat: 35.6762, lng: 139.6503 }
  },
  {
    id: 'ce-2',
    title: 'Marrakech Market Adventure',
    description: 'Discover the vibrant markets and rich culture of Marrakech through guided tours and authentic experiences.',
    category: 'cultural',
    price: 300,
    date: '2024-05-05',
    location: 'Marrakech, Morocco',
    image: '/api/placeholder/600/400',
    capacity: 150,
    booked: 120,
    highlights: ['Market Tours', 'Cultural Workshops', 'Local Cuisine', 'Traditional Music'],
    coordinates: { lat: 31.6295, lng: -7.9811 }
  },
  {
    id: 'ce-3',
    title: 'Paris Art & Culture Week',
    description: 'Immerse yourself in Parisian art and culture with museum visits, art workshops, and cultural experiences.',
    category: 'cultural',
    price: 800,
    date: '2024-05-20',
    location: 'Paris, France',
    image: '/api/placeholder/600/400',
    capacity: 100,
    booked: 80,
    highlights: ['Museum Visits', 'Art Workshops', 'Cultural Tours', 'French Cuisine'],
    coordinates: { lat: 48.8566, lng: 2.3522 }
  }
];

// Major cities for location selection
const majorCities = [
  { name: 'New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
  { name: 'London, UK', coordinates: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Paris, France', coordinates: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Tokyo, Japan', coordinates: { lat: 35.6762, lng: 139.6503 } },
  { name: 'San Francisco, CA', coordinates: { lat: 37.7749, lng: -122.4194 } },
  { name: 'Monaco', coordinates: { lat: 43.7384, lng: 7.4246 } },
  { name: 'Basel, Switzerland', coordinates: { lat: 47.3769, lng: 8.5417 } },
  { name: 'Tuscany, Italy', coordinates: { lat: 43.7711, lng: 11.2486 } },
  { name: 'Marrakech, Morocco', coordinates: { lat: 31.6295, lng: -7.9811 } },
  { name: 'Sydney, Australia', coordinates: { lat: -33.8688, lng: 151.2093 } },
  { name: 'Singapore', coordinates: { lat: 1.3521, lng: 103.8198 } },
  { name: 'Dubai, UAE', coordinates: { lat: 25.2048, lng: 55.2708 } }
];

export default function Events() {
  const { user } = useAuth();
  const { country } = useUserCountry();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  // Set default location based on user's country or detected location
  useEffect(() => {
    if (country && !selectedLocation) {
      const countryCity = majorCities.find(city => 
        city.name.toLowerCase().includes(country.name.toLowerCase()) ||
        city.name.toLowerCase().includes(country.iso2.toLowerCase())
      );
      if (countryCity) {
        setSelectedLocation(countryCity.name);
      }
    }
  }, [country, selectedLocation]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price}`;
  };

  const getCategoryEvents = (category: string) => {
    let filteredEvents = events;
    
    // Filter by category
    if (category !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.category === category);
    }
    
    // Filter by search query
    if (searchQuery) {
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by location and distance
    if (selectedLocation && distanceFilter !== 'all') {
      const selectedCity = majorCities.find(city => city.name === selectedLocation);
      if (selectedCity) {
        filteredEvents = filteredEvents.filter(event => {
          if (!event.coordinates) return false;
          const distance = calculateDistance(
            selectedCity.coordinates.lat,
            selectedCity.coordinates.lng,
            event.coordinates.lat,
            event.coordinates.lng
          );
          
          switch (distanceFilter) {
            case 'nearby':
              return distance <= 100; // Within 100km
            case 'regional':
              return distance <= 500; // Within 500km
            case 'continental':
              return distance <= 2000; // Within 2000km
            default:
              return true;
          }
        });
      }
    }
    
    // Sort by distance if location is selected
    if (selectedLocation) {
      const selectedCity = majorCities.find(city => city.name === selectedLocation);
      if (selectedCity) {
        filteredEvents.sort((a, b) => {
          if (!a.coordinates || !b.coordinates) return 0;
          const distanceA = calculateDistance(
            selectedCity.coordinates.lat,
            selectedCity.coordinates.lng,
            a.coordinates.lat,
            a.coordinates.lng
          );
          const distanceB = calculateDistance(
            selectedCity.coordinates.lat,
            selectedCity.coordinates.lng,
            b.coordinates.lat,
            b.coordinates.lng
          );
          return distanceA - distanceB;
        });
      }
    }
    
    return filteredEvents;
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'ultra-elite':
        return {
          title: 'Ultra Elite Experiences',
          subtitle: 'For individuals with net worth exceeding $100M',
          frequency: '2 events per year',
          priceRange: '~$500,000 per participant',
          color: 'from-amber-400 to-yellow-500',
          bgColor: 'from-gray-900 to-emerald-900',
          borderColor: 'border-amber-400/30',
          icon: <Crown className="w-6 h-6" />
        };
      case 'prestige':
        return {
          title: 'Prestige Networking Events',
          subtitle: 'For individuals with net worth between $1M and $100M',
          frequency: 'Multiple events throughout the year',
          priceRange: '~$5,000 per participant',
          color: 'from-blue-400 to-navy-500',
          bgColor: 'from-white to-blue-50',
          borderColor: 'border-blue-400/30',
          icon: <Trophy className="w-6 h-6" />
        };
      case 'cultural':
        return {
          title: 'Cultural Explorer Events',
          subtitle: 'For regular travelers and tourists',
          frequency: 'Frequent events across global destinations',
          priceRange: '~$500 per participant',
          color: 'from-green-400 to-teal-500',
          bgColor: 'from-orange-50 to-yellow-50',
          borderColor: 'border-green-400/30',
          icon: <Globe className="w-6 h-6" />
        };
      default:
        return null;
    }
  };

  const getDistanceText = (event: Event) => {
    if (!selectedLocation || !event.coordinates) return null;
    
    const selectedCity = majorCities.find(city => city.name === selectedLocation);
    if (!selectedCity) return null;
    
    const distance = calculateDistance(
      selectedCity.coordinates.lat,
      selectedCity.coordinates.lng,
      event.coordinates.lat,
      event.coordinates.lng
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    } else if (distance < 100) {
      return `${Math.round(distance)}km away`;
    } else {
      return `${Math.round(distance)}km away`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Navigation />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Premium Events & Networking
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Exclusive Global
            <span className="block bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Experiences
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Connect with the world's most influential individuals through our curated selection of 
            premium events, from ultra-elite experiences to cultural explorations.
          </p>
        </div>

        {/* Location and Search Filters */}
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Location Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Your Location
                  </label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {majorCities.map((city) => (
                        <SelectItem key={city.name} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <NavigationIcon className="w-4 h-4" />
                    Distance
                  </label>
                  <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="nearby">Nearby (≤100km)</SelectItem>
                      <SelectItem value="regional">Regional (≤500km)</SelectItem>
                      <SelectItem value="continental">Continental (≤2000km)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Events
                  </label>
                  <Input
                    placeholder="Search events, locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                {/* Current Location Button */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Use My Location
                  </label>
                  <Button
                    onClick={() => {
                      if (userLocation) {
                        // Find nearest city to user's location
                        let nearestCity = majorCities[0];
                        let minDistance = Infinity;
                        
                        majorCities.forEach(city => {
                          const distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            city.coordinates.lat,
                            city.coordinates.lng
                          );
                          if (distance < minDistance) {
                            minDistance = distance;
                            nearestCity = city;
                          }
                        });
                        
                        setSelectedLocation(nearestCity.name);
                      }
                    }}
                    disabled={!userLocation}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all rounded-2xl"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    {userLocation ? 'Use My Location' : 'Getting Location...'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-12">
          <TabsList className="grid w-full grid-cols-4 p-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
            <TabsTrigger 
              value="all" 
              className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-400/25 rounded-xl"
            >
              <Globe className="w-4 h-4" />
              All Events
            </TabsTrigger>
            <TabsTrigger 
              value="ultra-elite" 
              className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-400/25 rounded-xl"
            >
              <Crown className="w-4 h-4" />
              Ultra Elite
            </TabsTrigger>
            <TabsTrigger 
              value="prestige" 
              className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:to-navy-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-400/25 rounded-xl"
            >
              <Trophy className="w-4 h-4" />
              Prestige
            </TabsTrigger>
            <TabsTrigger 
              value="cultural" 
              className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-400 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-400/25 rounded-xl"
            >
              <Heart className="w-4 h-4" />
              Cultural
            </TabsTrigger>
          </TabsList>

          {/* All Events Tab */}
          <TabsContent value="all" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getCategoryEvents('all').map((event) => {
                const categoryInfo = getCategoryInfo(event.category);
                const distanceText = getDistanceText(event);
                return (
                  <Card key={event.id} className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden">
                    <div className="relative">
                      <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-gray-400" />
                      </div>
                      {event.isInviteOnly && (
                        <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-0">
                          <Crown className="w-3 h-3 mr-1" />
                          Invite Only
                        </Badge>
                      )}
                      {distanceText && (
                        <Badge className="absolute top-4 left-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-0">
                          <MapPin className="w-3 h-3 mr-1" />
                          {distanceText}
                        </Badge>
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryInfo?.color}`}></div>
                    </div>
                    <CardHeader className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-xl text-white">{event.title}</CardTitle>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${categoryInfo?.color} flex items-center justify-center text-white`}>
                          {categoryInfo?.icon}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-4">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-2xl font-bold text-white">{formatPrice(event.price)}</div>
                        <div className="text-sm text-gray-400">
                          {event.booked}/{event.capacity} booked
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {event.highlights.slice(0, 2).map((highlight, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-gray-300 border-white/20">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      {event.isInviteOnly ? (
                        <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:shadow-lg hover:shadow-amber-400/25 transform hover:scale-105 transition-all rounded-2xl">
                          <Crown className="w-4 h-4 mr-2" />
                          Request Invite
                        </Button>
                      ) : (
                        <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all rounded-2xl">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Category-specific tabs */}
          {['ultra-elite', 'prestige', 'cultural'].map((category) => {
            const categoryInfo = getCategoryInfo(category);
            const categoryEvents = getCategoryEvents(category);
            
            return (
              <TabsContent key={category} value={category} className="mt-8">
                {/* Category Header */}
                <div className={`mb-8 p-8 rounded-3xl bg-gradient-to-br ${categoryInfo?.bgColor} border ${categoryInfo?.borderColor} shadow-2xl`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${categoryInfo?.color} flex items-center justify-center text-white shadow-lg`}>
                      {categoryInfo?.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{categoryInfo?.title}</h2>
                      <p className="text-gray-600">{categoryInfo?.subtitle}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-900">Frequency</div>
                        <div className="text-sm text-gray-600">{categoryInfo?.frequency}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-900">Pricing</div>
                        <div className="text-sm text-gray-600">{categoryInfo?.priceRange}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-900">Available</div>
                        <div className="text-sm text-gray-600">{categoryEvents.length} events</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categoryEvents.map((event) => {
                    const distanceText = getDistanceText(event);
                    return (
                      <Card key={event.id} className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden">
                        <div className="relative">
                          <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          {event.isInviteOnly && (
                            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-0">
                              <Crown className="w-3 h-3 mr-1" />
                              Invite Only
                            </Badge>
                          )}
                          {distanceText && (
                            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-0">
                              <MapPin className="w-3 h-3 mr-1" />
                              {distanceText}
                            </Badge>
                          )}
                          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryInfo?.color}`}></div>
                        </div>
                        <CardHeader className="p-6">
                          <CardTitle className="text-xl text-white">{event.title}</CardTitle>
                          <p className="text-gray-300 text-sm mb-4">{event.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(event.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-2xl font-bold text-white">{formatPrice(event.price)}</div>
                            <div className="text-sm text-gray-400">
                              {event.booked}/{event.capacity} booked
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {event.highlights.slice(0, 2).map((highlight, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-gray-300 border-white/20">
                                {highlight}
                              </Badge>
                            ))}
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          {event.isInviteOnly ? (
                            <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:shadow-lg hover:shadow-amber-400/25 transform hover:scale-105 transition-all rounded-2xl">
                              <Crown className="w-4 h-4 mr-2" />
                              Request Invite
                            </Button>
                          ) : (
                            <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all rounded-2xl">
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Book Now
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Global Map Section */}
        <div className="mt-16">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Globe className="w-6 h-6 text-cyan-400" />
                Global Event Locations
              </CardTitle>
              <p className="text-gray-300">Explore our upcoming events across the world's most prestigious destinations</p>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="w-full h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Interactive map coming soon</p>
                  <p className="text-sm text-gray-500">View all event locations and venues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
