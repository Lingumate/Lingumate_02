import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Crown, Users, Building, Zap, Star, ArrowRight, Shield, Globe } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionPlans, getMonthlyPlans, getYearlyPlans, getDailyPass } from '@/data/subscriptionPlans';
import { SubscriptionPlan } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Subscription() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Filter plans based on billing cycle
    const filteredPlans = isYearly 
      ? [...getYearlyPlans(), ...getDailyPass()]
      : [...getMonthlyPlans(), ...getDailyPass()];
    setPlans(filteredPlans);
  }, [isYearly]);

  const handleBuyNow = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase a plan.",
        variant: "destructive",
      });
      setLocation('/auth');
      return;
    }

    setLoading(plan.id);

    try {
      // Check if Razorpay key is available
      if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
        throw new Error('Razorpay Key ID is not configured');
      }

      // Debug: Check authentication
      const token = localStorage.getItem('token');
      console.log('Auth token:', token ? 'Present' : 'Missing');
      console.log('User:', user);

      // Create order on backend first
      const response = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price * 100, // Convert to smallest currency unit (cents)
          currency: plan.currency,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to create order: ${response.status} - ${errorData}`);
      }

      const order = await response.json();
      console.log('Order created:', order);

      // Initialize Razorpay with the backend order
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Lingumate',
        description: `${plan.name} - ${plan.billingCycle} subscription`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            console.log('Payment successful:', response);
            
            // Verify payment on backend
            const verifyResponse = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                planId: plan.id,
                userId: user.id,
              }),
            });

            if (verifyResponse.ok) {
              toast({
                title: "Payment Successful!",
                description: `Welcome to ${plan.name}! Your subscription is now active.`,
              });
              setLocation('/dashboard');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if you were charged.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
        },
        theme: {
          color: '#0891b2',
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setLoading(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    if (plan.isBusiness) return <Building className="w-6 h-6" />;
    if (plan.maxUsers && plan.maxUsers > 1) return <Users className="w-6 h-6" />;
    return <Crown className="w-6 h-6" />;
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    if (plan.isBusiness) return 'from-purple-500 to-indigo-600';
    if (plan.maxUsers && plan.maxUsers > 1) return 'from-emerald-500 to-teal-600';
    if (plan.isPopular) return 'from-amber-500 to-orange-600';
    return 'from-cyan-500 to-blue-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 border border-white/20">
            <Crown className="w-5 h-5 mr-2 text-cyan-400" />
            <span className="text-white">Choose Your Premium Plan</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Unlock Premium
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Translation Power
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Get unlimited access to real-time translation, AI travel assistance, and premium features
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-lg ${!isYearly ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-cyan-500"
            />
            <span className={`text-lg ${isYearly ? 'text-white' : 'text-gray-400'}`}>
              Yearly
              <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                Save up to 17%
              </Badge>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300 transform hover:-translate-y-2 rounded-3xl overflow-hidden ${
                plan.isPopular ? 'ring-2 ring-cyan-400/50' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-full">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {plan.savings && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-sm">
                    {plan.savings}
                  </Badge>
                </div>
              )}

              <CardHeader className="bg-gradient-to-br from-white/10 to-white/5 p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getPlanColor(plan)} rounded-2xl flex items-center justify-center`}>
                    {getPlanIcon(plan)}
                  </div>
                  {plan.isBusiness && (
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      Enterprise
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-bold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-gray-400">
                    /{plan.billingCycle === 'daily' ? 'day' : plan.billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {plan.maxUsers && (
                  <div className="flex items-center mt-2 text-sm text-gray-300">
                    <Users className="w-4 h-4 mr-1" />
                    Up to {plan.maxUsers} users
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-8">
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => handleBuyNow(plan)}
                    disabled={loading === plan.id}
                    className={`w-full bg-gradient-to-r ${getPlanColor(plan)} hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all text-white py-3 rounded-xl font-semibold`}
                  >
                    {loading === plan.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        Buy Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    )}
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-xs text-gray-400">
                    {plan.billingCycle === 'daily' ? '24-hour access' : 'Cancel anytime'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Why Choose Premium?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Lightning Fast</h3>
              <p className="text-gray-300">0.5s response time with 99% accuracy across 100+ languages</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Enterprise Security</h3>
              <p className="text-gray-300">Bank-level encryption and privacy protection for your conversations</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Global Coverage</h3>
              <p className="text-gray-300">Works seamlessly in 150+ countries with offline capabilities</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/20 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Break Language Barriers?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of travelers who trust Lingumate for their global communication needs
            </p>
            <Button
              onClick={() => {
                if (user) {
                  // Start with Individual Yearly plan (most popular)
                  const popularPlan = plans.find(p => p.isPopular) || plans[0];
                  if (popularPlan) {
                    handleBuyNow(popularPlan);
                  }
                } else {
                  setLocation('/auth');
                }
              }}
              size="lg"
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all text-white text-lg px-8 py-4 rounded-2xl"
            >
              <Crown className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
