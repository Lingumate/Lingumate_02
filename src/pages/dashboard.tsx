import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Languages, LogOut, MapPin, DollarSign, Crown, Sparkles, Bluetooth, QrCode } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/badge';
import SubscriptionStatus from '../components/SubscriptionStatus';

export default function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const features = [
    {
      title: "Language-to-Language Conversion",
      description: "Convert speech from one language to another in real-time. Speak in your native language and hear the translation in your target language.",
      icon: <Languages className="h-8 w-8" />,
      href: "/converter",
      color: "bg-gradient-to-br from-cyan-400 to-blue-500",
    },
    {
      title: "QR Code Translation",
      description: "Real-time bi-directional translation via QR handshake + WebSocket. Quick pairing with QR codes for instant translation sessions.",
      icon: <Bluetooth className="h-8 w-8" />,
      href: "/ble-translator",
      color: "bg-gradient-to-br from-indigo-400 to-purple-500",
    },
    {
      title: "QR Code Demo",
      description: "Test the QR code scanning functionality with camera access. Perfect for mobile devices to establish secure handshake connections.",
      icon: <QrCode className="h-8 w-8" />,
      href: "/qr-demo",
      color: "bg-gradient-to-br from-emerald-400 to-teal-500",
    },
    {
      title: "AI Travel Assistant",
      description: "Your personal travel companion. Get location suggestions, ordering help, emergency assistance, and step-by-step guidance in multiple languages.",
      icon: <MapPin className="h-8 w-8" />,
      href: "/ai-travel-assistant",
      color: "bg-gradient-to-br from-emerald-400 to-teal-500",
    },
    {
      title: "Price Comparison Tool",
      description: "Compare prices across multiple sources to avoid being overcharged. Get real-time price data from Amazon, eBay, Google Shopping, and local markets.",
      icon: <DollarSign className="h-8 w-8" />,
      href: "/price-comparison",
      color: "bg-gradient-to-br from-purple-400 to-pink-500",
    },
    {
      title: "Events & Networking",
      description: "Access exclusive global events and networking opportunities. From ultra-elite experiences to cultural explorations, connect with influential individuals worldwide.",
      icon: <Crown className="h-8 w-8" />,
      href: "/events",
      color: "bg-gradient-to-br from-amber-400 to-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Floating Orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/15 to-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Scanning Lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-400/25">
                  <Languages className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-2xl font-bold text-white">Lingumate Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-300">
                    Welcome, {user.firstName} {user.lastName}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-white/5 backdrop-blur-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to Your Language Learning Hub
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Choose from our powerful AI-powered tools to enhance your language learning experience
            and make your travels more enjoyable and cost-effective.
          </p>
        </div>

        {/* Subscription Status */}
        <div className="mb-12">
          <SubscriptionStatus />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
              <CardHeader className="text-center">
                <div className={`mx-auto w-16 h-16 rounded-full ${feature.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                <CardDescription className="text-gray-300">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link href={feature.href}>
                  <Button className="w-full bg-gradient-to-br from-cyan-400 to-blue-500 hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all text-white font-semibold py-3 rounded-2xl" size="lg">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            Your Learning Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-cyan-400">0</CardTitle>
                <CardDescription className="text-gray-300">Conversations Started</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-emerald-400">0</CardTitle>
                <CardDescription className="text-gray-300">Travel Sessions</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-purple-400">0</CardTitle>
                <CardDescription className="text-gray-300">Price Comparisons</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-amber-400">0</CardTitle>
                <CardDescription className="text-gray-300">Events Attended</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Events Widget */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Crown className="w-6 h-6 text-amber-400" />
              Upcoming Events
            </h3>
            <Link href="/events">
              <Button variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 rounded-2xl">
                <Sparkles className="w-4 h-4 mr-2" />
                View All Events
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ultra Elite Preview */}
            <Card className="bg-gradient-to-br from-gray-900 to-emerald-900 border border-amber-400/30 shadow-2xl hover:shadow-amber-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl overflow-hidden">
              <div className="relative">
                <div className="w-full h-32 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 flex items-center justify-center">
                  <Crown className="w-12 h-12 text-amber-400" />
                </div>
                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-0 text-xs">
                  Invite Only
                </Badge>
              </div>
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-white mb-2">Ultra Elite Experiences</h4>
                <p className="text-gray-300 text-sm mb-4">Exclusive events for individuals with net worth exceeding $100M</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-amber-400">~$500K</div>
                  <div className="text-xs text-gray-400">2 events/year</div>
                </div>
                <Link href="/events">
                  <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:shadow-lg hover:shadow-amber-400/25 transform hover:scale-105 transition-all rounded-2xl text-sm">
                    <Crown className="w-4 h-4 mr-2" />
                    Request Invite
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Prestige Preview */}
            <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-400/30 shadow-2xl hover:shadow-blue-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl overflow-hidden">
              <div className="relative">
                <div className="w-full h-32 bg-gradient-to-br from-blue-400/20 to-navy-500/20 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-blue-600" />
                </div>
              </div>
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Prestige Networking</h4>
                <p className="text-gray-600 text-sm mb-4">High-level networking events for individuals with $1M-$100M net worth</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-blue-600">~$5K</div>
                  <div className="text-xs text-gray-500">Multiple/year</div>
                </div>
                <Link href="/events">
                  <Button className="w-full bg-gradient-to-r from-blue-400 to-navy-500 text-white hover:shadow-lg hover:shadow-blue-400/25 transform hover:scale-105 transition-all rounded-2xl text-sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Events
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Cultural Preview */}
            <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-green-400/30 shadow-2xl hover:shadow-green-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl overflow-hidden">
              <div className="relative">
                <div className="w-full h-32 bg-gradient-to-br from-green-400/20 to-teal-500/20 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <CardContent className="p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Cultural Explorer</h4>
                <p className="text-gray-600 text-sm mb-4">Cultural immersion events for travelers and tourists worldwide</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-green-600">~$500</div>
                  <div className="text-xs text-gray-500">Frequent</div>
                </div>
                <Link href="/events">
                  <Button className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white hover:shadow-lg hover:shadow-green-400/25 transform hover:scale-105 transition-all rounded-2xl text-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Explore Events
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="mt-16 bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Languages className="w-5 h-5 mr-2 text-cyan-400" />
                For Language Learning
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  Use the Language Converter for real-time speech translation
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  Practice speaking in different languages
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  Improve your pronunciation with AI feedback
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-amber-400" />
                For Networking & Events
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">•</span>
                  Explore exclusive events and networking opportunities
                </li>
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">•</span>
                  Connect with influential individuals worldwide
                </li>
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">•</span>
                  Experience luxury and cultural events globally
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 