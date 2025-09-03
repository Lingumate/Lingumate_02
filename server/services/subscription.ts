import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db';
import { subscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

let razorpay: Razorpay | null = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('⚠️ Razorpay API keys are not configured. Subscription features will not work.');
      console.warn('   Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
      console.warn('   See RAZORPAY_SETUP.md for setup instructions.');
      throw new Error('Razorpay API keys are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

export interface CreateOrderRequest {
  planId: string;
  amount: number;
  currency: string;
  userId: string;
}

export interface VerifyPaymentRequest {
  paymentId: string;
  orderId: string;
  signature: string;
  planId: string;
  userId: string;
}

export class SubscriptionService {
  async createOrder(data: CreateOrderRequest) {
    try {
      const razorpayInstance = getRazorpayInstance();
      const options = {
        amount: data.amount,
        currency: data.currency,
        receipt: `ord_${Date.now()}`,
        notes: {
          planId: data.planId,
          userId: data.userId,
        },
      };

      const order = await razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create order');
    }
  }

  async verifyPayment(data: VerifyPaymentRequest) {
    try {
      const { paymentId, orderId, signature, planId, userId } = data;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      // Get plan details
      const plan = this.getPlanDetails(planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = this.calculateEndDate(startDate, plan.billingCycle);

      // Create or update subscription in database
      const subscription = await this.createSubscription({
        userId,
        planId,
        startDate,
        endDate,
        amount: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        paymentId,
        orderId,
      });

      return subscription;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  private getPlanDetails(planId: string) {
    const plans = {
      'individual-monthly': { price: 50, currency: 'USD', billingCycle: 'monthly' as const },
      'individual-yearly': { price: 500, currency: 'USD', billingCycle: 'yearly' as const },
      'group-monthly': { price: 150, currency: 'USD', billingCycle: 'monthly' as const },
      'group-yearly': { price: 1500, currency: 'USD', billingCycle: 'yearly' as const },
      'business-monthly': { price: 500, currency: 'USD', billingCycle: 'monthly' as const },
      'business-yearly': { price: 5000, currency: 'USD', billingCycle: 'yearly' as const },
      'daily-pass': { price: 10, currency: 'USD', billingCycle: 'daily' as const },
    };

    return plans[planId as keyof typeof plans];
  }

  private calculateEndDate(startDate: Date, billingCycle: string): Date {
    const endDate = new Date(startDate);
    
    switch (billingCycle) {
      case 'daily':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  private async createSubscription(data: {
    userId: string;
    planId: string;
    startDate: Date;
    endDate: Date;
    amount: number;
    currency: string;
    billingCycle: string;
    paymentId: string;
    orderId: string;
  }) {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, data.userId),
            eq(subscriptions.status, 'active')
          )
        );

      if (existingSubscription.length > 0) {
        // Update existing subscription
        await db
          .update(subscriptions)
          .set({
            planId: data.planId,
            startDate: data.startDate,
            endDate: data.endDate,
            amount: data.amount,
            currency: data.currency,
            billingCycle: data.billingCycle,
            paymentMethod: 'razorpay',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSubscription[0].id));

        return existingSubscription[0];
      } else {
        // Create new subscription
        const [newSubscription] = await db
          .insert(subscriptions)
          .values({
            userId: data.userId,
            planId: data.planId,
            status: 'active',
            startDate: data.startDate,
            endDate: data.endDate,
            autoRenew: true,
            paymentMethod: 'razorpay',
            amount: data.amount,
            currency: data.currency,
            billingCycle: data.billingCycle,
            paymentId: data.paymentId,
            orderId: data.orderId,
          })
          .returning();

        return newSubscription;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async getUserSubscription(userId: string) {
    try {
      console.log('🔍 Getting subscription for user:', userId);
      
      const userSubscription = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      console.log('📊 Subscription query result:', userSubscription);
      return userSubscription[0] || null;
    } catch (error) {
      console.error('❌ Error getting user subscription:', error);
      throw new Error('Failed to get subscription');
    }
  }

  async cancelSubscription(userId: string) {
    try {
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          autoRenew: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        );

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }
}

export const subscriptionService = new SubscriptionService();
