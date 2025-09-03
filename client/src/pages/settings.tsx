import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Globe, Bell, Shield, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export default function Settings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [location, setLocation] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voicePlayback, setVoicePlayback] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (user) {
      setPrimaryLanguage(user.primaryLanguage || 'en');
      setLocation(user.location || '');
    }
  }, [user]);

  const handleSavePreferences = async () => {
    try {
      // In a real implementation, this would save to the backend
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and app preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                {user?.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    data-testid="img-profile-picture"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-gray-600" data-testid="text-user-email">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Language & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-language">Primary Language</Label>
                  <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                    <SelectTrigger className="mt-1" data-testid="select-primary-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Current Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Paris, France"
                    className="mt-1"
                    data-testid="input-location"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                App Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-gray-600">Receive notifications for translation updates</p>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={setNotificationsEnabled}
                  data-testid="switch-notifications"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Voice Playback</Label>
                  <p className="text-sm text-gray-600">Automatically play translated audio</p>
                </div>
                <Switch 
                  checked={voicePlayback} 
                  onCheckedChange={setVoicePlayback}
                  data-testid="switch-voice-playback"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Data Privacy</h4>
                <p className="text-sm text-blue-800">
                  Your conversations and recordings are processed securely and are not stored permanently 
                  unless you explicitly save them. We use industry-standard encryption to protect your data.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Audio Processing</h4>
                <p className="text-sm text-yellow-800">
                  Voice recordings are processed by AI services for translation. 
                  Audio data is transmitted securely and deleted after processing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleSavePreferences}
              className="bg-primary hover:bg-primary/90 flex-1"
              data-testid="button-save-settings"
            >
              Save Preferences
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="flex items-center justify-center"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
