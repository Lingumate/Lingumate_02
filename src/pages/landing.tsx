import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MessageCircle, Mic, Bot, MapPinned, Crown, Shield, Zap, Users, Sparkles, Star, Award, Map, Compass, Play, CheckCircle, Languages, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation('/subscription');
  };

  const handleLogin = () => {
    setLocation('/auth');
  };

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
      <header className="relative bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-400/25">
                  <Globe className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-xl font-bold text-white ml-3">Lingumate</h1>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setLocation('/subscription')} 
                variant="outline" 
                className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-all bg-cyan-400/5 backdrop-blur-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Premium
              </Button>
              <Button 
                onClick={handleLogin} 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all bg-white/5 backdrop-blur-sm"
                data-testid="button-login"
              >
                Login
              </Button>
              <Button 
                onClick={handleGetStarted} 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all text-white" 
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 border border-white/20 shadow-lg">
            <Award className="w-5 h-5 mr-2 text-cyan-400" />
            <span className="text-white">Trusted by 10,000+ travelers worldwide</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Break Language Barriers
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              with AI-Powered Translation
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Real-time speech translation, AI-powered travel assistance, and smart language learning tools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-400 text-lg px-10 py-6 rounded-2xl shadow-lg shadow-cyan-400/25 transform hover:scale-105 transition-all"
              data-testid="button-get-started"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Free Trial
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-6 rounded-2xl bg-transparent"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
              <span>100+ Languages</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
              <span>Real-time Translation</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
              <span>Enterprise Security</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* Real-Time Translation */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10 hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-8">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Languages className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-3">Real-Time Translation</h3>
            </div>
            <CardContent className="p-8">
              <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                Speak naturally and get instant translations in 100+ languages with enterprise-grade 
                accuracy and privacy protection.
              </p>
              <div className="text-center mb-6">
                <div className="text-sm text-gray-300">
                  <span className="block text-3xl font-bold text-cyan-400">0.5s</span>
                  <span className="text-xs">response time</span>
                  <span className="block text-2xl font-bold text-cyan-400 mt-2">→</span>
                  <span className="block text-3xl font-bold text-cyan-400">99%</span>
                  <span className="text-xs">accuracy</span>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-cyan-400/10 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium border border-cyan-400/20">
                  <Zap className="w-4 h-4 inline mr-2" />
                  Instant
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Travel Assistant */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-emerald-400/10 hover:shadow-2xl hover:shadow-emerald-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-8">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-3">AI Travel Assistant</h3>
            </div>
            <CardContent className="p-8">
              <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                Your personal travel companion with location-based recommendations, cultural insights, 
                and emergency assistance in multiple languages.
              </p>
              <div className="text-center mb-6">
                <div className="text-sm text-gray-300">
                  <span className="block text-3xl font-bold text-emerald-400">24/7</span>
                  <span className="text-xs">support</span>
                  <span className="block text-2xl font-bold text-emerald-400 mt-2">→</span>
                  <span className="block text-3xl font-bold text-emerald-400">150+</span>
                  <span className="text-xs">countries</span>
                </div>
              </div>
              <div className="text-center">
                <span className="bg-purple-400/10 text-purple-400 px-4 py-2 rounded-full border border-purple-400/20">Emergency</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-cyan-400/10 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium border border-cyan-400/20">
                  <Zap className="w-4 h-4 inline mr-2" />
                  AI-Powered
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Events & Networking */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-amber-400/10 hover:shadow-2xl hover:shadow-amber-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-8">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-3">Events & Networking</h3>
            </div>
            <CardContent className="p-8">
              <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                Access exclusive global events and networking opportunities. From ultra-elite experiences 
                to cultural explorations, connect with influential individuals worldwide.
              </p>
              <div className="text-center mb-6">
                <div className="text-sm text-gray-300">
                  <span className="block text-3xl font-bold text-amber-400">3</span>
                  <span className="text-xs">tiers</span>
                  <span className="block text-2xl font-bold text-amber-400 mt-2">→</span>
                  <span className="block text-3xl font-bold text-amber-400">Global</span>
                  <span className="text-xs">reach</span>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-amber-400/10 text-amber-400 px-4 py-2 rounded-full text-sm font-medium border border-amber-400/20">
                  <Crown className="w-4 h-4 inline mr-2" />
                  Exclusive
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">Simple, secure, and lightning-fast - get started in just 3 steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-cyan-400/25">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Select Languages</h3>
              <p className="text-gray-300 leading-relaxed">Choose your language and the language you want to translate to from 100+ supported languages</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-emerald-400/25">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Start Speaking</h3>
              <p className="text-gray-300 leading-relaxed">Speak naturally - our AI will transcribe and translate in real-time with enterprise security</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-purple-400/25">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Connect & Explore</h3>
              <p className="text-gray-300 leading-relaxed">Have natural conversations and get local recommendations powered by advanced AI</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden border border-white/20">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6">Ready to Connect with the World?</h2>
            <p className="text-white/90 mb-8 text-xl max-w-2xl mx-auto leading-relaxed">
              Join thousands of travelers who are already breaking language barriers with Lingumate. 
              Start your journey today with our free trial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-400 text-lg px-10 py-6 rounded-2xl shadow-lg shadow-cyan-400/25 transform hover:scale-105 transition-all"
                data-testid="button-join-now"
              >
                <Crown className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-6 rounded-2xl bg-transparent"
              >
                View Pricing
              </Button>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-white/80">
              <div className="flex items-center bg-white/10 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 mr-2" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center bg-white/10 px-4 py-2 rounded-full">
                <Zap className="w-4 h-4 mr-2" />
                <span>Setup in 2 minutes</span>
              </div>
              <div className="flex items-center bg-white/10 px-4 py-2 rounded-full">
                <Users className="w-4 h-4 mr-2" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

