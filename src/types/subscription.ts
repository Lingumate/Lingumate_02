export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'daily';
  features: string[];
  targetAudience: string;
  maxUsers?: number;
  isPopular?: boolean;
  isBusiness?: boolean;
  description: string;
  buttonText: string;
  savings?: string; // For yearly plans
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'daily';
  features: string[];
  targetAudience: string;
  maxUsers?: number;
  isPopular?: boolean;
  isBusiness?: boolean;
  description: string;
  buttonText: string;
  savings?: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'daily';
}
