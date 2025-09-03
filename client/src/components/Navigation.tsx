import React from "react";
import { Link, useLocation } from "wouter";
import { Bell, Globe, Home, MessageCircle, Mic, User, Cpu, Crown, Bluetooth, Sparkles, QrCode } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <>
      {/* Desktop/Mobile Top Navigation */}
      <nav className="bg-white/10 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity cursor-pointer">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-400/25 mr-2">
                    <Globe className="text-white text-lg" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-ping"></div>
                </div>
                <h1 className="text-xl font-bold text-white">Lingumate</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/subscription">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 bg-cyan-400/5 backdrop-blur-sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Premium
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="p-2 rounded-full border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-white/5 backdrop-blur-sm">
                <Bell className="text-white w-5 h-5" data-testid="button-notifications" />
              </Button>
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="User profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
                  data-testid="img-profile-avatar"
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 md:hidden z-50">
        <div className="grid grid-cols-6 py-2">
          <Link href="/dashboard" className={`flex flex-col items-center py-2 ${location === '/dashboard' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'}`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-home">Home</span>
          </Link>
          <Link href="/converter" className={`flex flex-col items-center py-2 ${location === '/converter' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'}`}>
            <MessageCircle className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-translator">Translate</span>
          </Link>
          <Link href="/ble-translator" className={`flex flex-col items-center py-2 ${location === '/ble-translator' ? 'text-indigo-400' : 'text-gray-300 hover:text-indigo-400'}`}>
            <Bluetooth className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-ble-translator">QR</span>
          </Link>
          <Link href="/qr-demo" className={`flex flex-col items-center py-2 ${location === '/qr-demo' ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-400'}`}>
            <QrCode className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-qr-demo">Demo</span>
          </Link>
          <Link href="/events" className={`flex flex-col items-center py-2 ${location === '/events' ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}>
            <Crown className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-events">Events</span>
          </Link>
          <Link href="/model-manager" className={`flex flex-col items-center py-2 ${location === '/model-manager' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'}`}>
            <Cpu className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-models">Models</span>
          </Link>
          <Link href="/settings" className={`flex flex-col items-center py-2 ${location === '/settings' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'}`}>
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs" data-testid="link-settings">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
