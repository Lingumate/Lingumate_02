import React from "react";
import Navigation from "@/components/Navigation";
import ModelManager from "@/components/ModelManager";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ModelManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Model Manager</h1>
            <p className="text-gray-600">Upload and manage your custom AI models for translation</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use your custom AI model:</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Upload your trained AI model file (supports .model, .onnx, .pb, .h5, .json, .bin)</li>
            <li>2. Provide a name and description for your model</li>
            <li>3. Select the capabilities your model supports</li>
            <li>4. Click "Activate" to use your model for translations</li>
            <li>5. Your model will automatically handle speech-to-text, translation, and text-to-speech</li>
          </ol>
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
            <strong>Note:</strong> Your model should implement the complete pipeline: Speech → Text → Translation → Speech
          </div>
        </div>

        {/* Model Manager Component */}
        <ModelManager />
      </div>
    </div>
  );
}
