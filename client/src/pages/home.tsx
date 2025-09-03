import React, { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { 
  Languages, 
  MapPin, 
  MessageCircle, 
  Shield, 
  TrendingUp, 
  Bot,
  Play,
  Download,
  Star,
  FileAudio,
  NotebookPen
} from 'lucide-react';
import { apiRequest } from '@/lib/utils';

interface SummaryItem {
  id: string;
  title: string;
  duration?: number;
  status: string;
  summary?: string;
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();

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

      <Navigation />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-3" data-testid="text-welcome-greeting">
                    Welcome back, {user?.firstName || 'Explorer'}! 👋
                  </h2>
                  <p className="text-white/90 text-lg mb-6">Your AI travel companion is ready to help you explore the world with confidence</p>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center bg-white/20 px-4 py-2 rounded-full border border-white/30">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span data-testid="text-user-location">{user?.location || "Paris, France"}</span>
                    </div>
                    <div className="flex items-center bg-white/20 px-4 py-2 rounded-full border border-white/30">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span data-testid="text-user-language">{user?.primaryLanguage || "English"}</span>
                    </div>
                    <div className="flex items-center bg-white/20 px-4 py-2 rounded-full border border-white/30">
                      <Shield className="w-4 h-4 mr-2" />
                      <span>Secure & Private</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Real-Time Translator Card */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-cyan-400/25">
                  <Languages className="text-white w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Real-Time Translator</h3>
                  <p className="text-gray-300">Break language barriers with instant speech translation</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-2xl border border-cyan-400/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">EN</span>
                    </div>
                    <span className="text-white text-sm">English</span>
                  </div>
                  <div className="text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <div className="flex items-center">
                    <span className="text-white text-sm">Español</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center ml-3">
                      <span className="text-white text-sm font-bold">ES</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-400/25">
                    <Play className="text-white w-8 h-8" />
                  </div>
                  <p className="text-gray-300 text-sm">Tap to start translating</p>
                </div>
              </div>
              
              <Link href="/converter">
                <Button className="w-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all rounded-2xl py-3" data-testid="button-start-translation">
                  <Languages className="w-4 h-4 mr-2" />
                  Start Conversation
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Travel Assistant Card */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-emerald-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-emerald-400/25">
                  <Bot className="text-white w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Travel Assistant</h3>
                  <p className="text-gray-300">Smart travel recommendations powered by advanced AI</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex">
                  <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-2xl rounded-bl-md p-4 max-w-xs border border-cyan-400/20">
                    <p className="text-sm text-white">Hi! I'm near the Eiffel Tower. Can you recommend a good restaurant for lunch?</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl rounded-br-md p-4 max-w-xs">
                    <p className="text-sm">I'd recommend "Le Jules Verne" for a unique dining experience with amazing views!</p>
                  </div>
                </div>
              </div>
              
              <Link href="/ai-travel-assistant">
                <Button className="w-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-400/25 transform hover:scale-105 transition-all rounded-2xl py-3" data-testid="button-start-ai-assistant">
                  <Bot className="w-4 h-4 mr-2" />
                  Start AI Assistant
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-purple-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-400/25">
                <MapPin className="text-white w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Location Services</h4>
              <p className="text-gray-300 text-sm mb-4">Get location-based recommendations and assistance</p>
              <Link href="/ai-travel-assistant">
                <Button variant="outline" className="w-full border-purple-400/30 text-purple-400 hover:bg-purple-400/10 rounded-2xl">
                  Explore
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-400/25">
                <Languages className="text-white w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Language Learning</h4>
              <p className="text-gray-300 text-sm mb-4">Practice and improve your language skills</p>
              <Link href="/converter">
                <Button variant="outline" className="w-full border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 rounded-2xl">
                  Practice
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-emerald-400/20 transition-all duration-300 transform hover:-translate-y-1 rounded-3xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-400/25">
                <Star className="text-white w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Travel Tips</h4>
              <p className="text-gray-300 text-sm mb-4">Get insider tips and cultural insights</p>
              <Link href="/ai-travel-assistant">
                <Button variant="outline" className="w-full border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 rounded-2xl">
                  Learn More
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
