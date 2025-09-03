import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Translator from "@/pages/translator";
import BLETranslator from "@/pages/ble-translator";
import QRHandshake from "@/pages/qr-handshake";
import QRDemo from "@/pages/qr-demo";
import Settings from "@/pages/settings";
import AITravelAssistantPage from "@/pages/ai-travel-assistant";
import PriceComparisonPage from "@/pages/price-comparison";
import ModelManagerPage from "@/pages/model-manager";
import EventsPage from "@/pages/events";
import SubscriptionPage from "@/pages/subscription";
import LoadingSpinner from "@/components/LoadingSpinner";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/subscription" component={SubscriptionPage} />
      
      {/* Protected routes */}
      {isLoading ? (
        <Route path="*" component={LoadingSpinner} />
      ) : isAuthenticated ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/converter" component={Translator} />
          <Route path="/qr-handshake" component={QRHandshake} />
          <Route path="/ble-translator" component={BLETranslator} />
          <Route path="/qr-demo" component={QRDemo} />
          <Route path="/ai-travel-assistant" component={AITravelAssistantPage} />
          <Route path="/price-comparison" component={PriceComparisonPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/model-manager" component={ModelManagerPage} />
        </>
      ) : (
        <Route path="*" component={Landing} />
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
