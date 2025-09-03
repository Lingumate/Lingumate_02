import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, CreditCard, AlertCircle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'daily';
}

export default function SubscriptionStatus() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled successfully.",
        });
        fetchSubscription(); // Refresh subscription data
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPlanName = (planId: string) => {
    const planMap: Record<string, string> = {
      'individual-monthly': 'Individual Plan (Monthly)',
      'individual-yearly': 'Individual Plan (Yearly)',
      'group-monthly': 'Group Plan (Monthly)',
      'group-yearly': 'Group Plan (Yearly)',
      'business-monthly': 'Business Plan (Monthly)',
      'business-yearly': 'Business Plan (Yearly)',
      'daily-pass': 'Day Pass',
    };
    return planMap[planId] || planId;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Crown className="w-5 h-5 mr-2 text-cyan-400" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Active Subscription</h3>
            <p className="text-gray-300 mb-4">
              Upgrade to premium to unlock unlimited translation sessions and premium features.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setLocation('/subscription')}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 transition-all text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Free Trial
              </Button>
              <Button
                onClick={() => setLocation('/subscription')}
                variant="outline"
                className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50"
              >
                <Crown className="w-4 h-4 mr-2" />
                View All Plans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const endDate = new Date(subscription.endDate);
  const isExpired = endDate < new Date();
  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <Crown className="w-5 h-5 mr-2 text-cyan-400" />
            Subscription Status
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {getStatusIcon(subscription.status)}
            <span className="ml-1 capitalize">{subscription.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Plan</h4>
            <p className="text-white font-semibold">{getPlanName(subscription.planId)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Billing Cycle</h4>
            <p className="text-white font-semibold capitalize">{subscription.billingCycle}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Amount</h4>
            <p className="text-white font-semibold">
              ${(subscription.amount / 100).toFixed(2)} {subscription.currency}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Auto Renew</h4>
            <p className="text-white font-semibold">
              {subscription.autoRenew ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-sm text-gray-300">Subscription Period</span>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            <p>Start: {new Date(subscription.startDate).toLocaleDateString()}</p>
            <p>End: {endDate.toLocaleDateString()}</p>
            {!isExpired && subscription.status === 'active' && (
              <p className="text-cyan-400 font-medium">
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expires today'}
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          {subscription.status === 'active' && (
            <>
              <Button
                onClick={() => setLocation('/subscription')}
                variant="outline"
                size="sm"
                className="flex-1 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                variant="outline"
                size="sm"
                className="border-red-400/30 text-red-400 hover:bg-red-400/10"
              >
                Cancel
              </Button>
            </>
          )}
          {subscription.status === 'cancelled' && (
            <Button
              onClick={() => setLocation('/subscription')}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Renew Subscription
            </Button>
          )}
          {subscription.status === 'expired' && (
            <Button
              onClick={() => setLocation('/subscription')}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
