import React from "react";
import Navigation from "@/components/Navigation";
import AITravelAssistant from "@/components/AITravelAssistant";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, MessageCircle, Shield, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AITravelAssistantPage() {
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
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6 z-10">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mr-4 border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-white/5 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Travel Assistant</h1>
            <p className="text-gray-300">Your personal travel companion for location suggestions, ordering help, and emergency assistance</p>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-white">Location Suggestions</h3>
              </div>
              <p className="text-sm text-gray-300">
                Find nearby restaurants, hotels, attractions, and more based on your current location
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-emerald-400/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Ordering Help</h3>
              </div>
              <p className="text-sm text-gray-300">
                Get recommendations on what to order and how to ask for it in the local language
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-purple-400/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Emergency Assistance</h3>
              </div>
              <p className="text-sm text-gray-300">
                Quick access to medical help, police, fire department, and other emergency services
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Travel Assistant Component */}
        <AITravelAssistant 
          userLocation="Paris, France"
          userLanguage="en"
        />
      </div>
    </div>
  );
} 