import React, { useState } from "react";
import Navigation from "@/components/Navigation";
import ConversationInterface from "@/components/ConversationInterface";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Translator() {
  const [conversationId, setConversationId] = useState<string>();

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
            <Button variant="ghost" size="sm" className="mr-4 border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-white/5 backdrop-blur-sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Real-Time Translator</h1>
            <p className="text-gray-300">Have natural conversations across language barriers</p>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10 mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">🤖 AI Real-Time Translator</h3>
            <p className="text-sm text-gray-300 mb-3">
              Our AI acts as a real-time translator between two speakers, converting speech to text, translating, and generating speech in the target language.
            </p>
            <h4 className="font-medium text-white mb-2">How it works:</h4>
            <ol className="text-sm text-gray-300 space-y-1">
              <li>1. Select languages for Speaker 1 and Speaker 2</li>
              <li>2. Click "Start Conversation" to activate the AI translator</li>
              <li>3. Choose who is speaking (Speaker 1 or Speaker 2)</li>
              <li>4. Tap the microphone to record speech</li>
              <li>5. AI converts speech → text → translation → speech automatically</li>
              <li>6. The translated speech plays for the other speaker to hear</li>
            </ol>
            <div className="mt-3 p-2 bg-cyan-400/10 rounded text-xs text-cyan-300 border border-cyan-400/20">
              <strong>Flow:</strong> Speaker 1 speaks → AI listens → AI translates → AI speaks for Speaker 2 to hear
            </div>
          </CardContent>
        </Card>

        {/* Conversation Interface */}
        <ConversationInterface conversationId={conversationId} />
      </div>
    </div>
  );
}
