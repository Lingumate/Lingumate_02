import { Router } from 'express';
import { subscriptionService } from '../services/subscription';
import { authenticateFirebaseToken, type AuthenticatedRequest } from '../middleware/firebaseAuth';

const router = Router();

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  console.log('Creating order with body:', req.body);
  try {
    const { planId, amount, currency, userId } = req.body;

    if (!planId || !amount || !currency || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: planId, amount, currency, userId' 
      });
    }

    const order = await subscriptionService.createOrder({
      planId,
      amount,
      currency,
      userId,
    });

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify payment and create subscription
router.post('/verify-payment', async (req, res) => {
  try {
    const { paymentId, orderId, signature, planId, userId } = req.body;

    if (!paymentId || !orderId || !signature || !planId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: paymentId, orderId, signature, planId, userId' 
      });
    }

    const subscription = await subscriptionService.verifyPayment({
      paymentId,
      orderId,
      signature,
      planId,
      userId,
    });

    res.json({ 
      success: true, 
      subscription,
      message: 'Payment verified and subscription created successfully'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's current subscription
router.get('/current', authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subscription = await subscriptionService.getUserSubscription(userId);
    
    // Return subscription data or null if no subscription exists
    res.json({ 
      subscription,
      hasSubscription: !!subscription,
      message: subscription ? 'Active subscription found' : 'No active subscription found'
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await subscriptionService.cancelSubscription(userId);
    res.json({ 
      message: 'Subscription cancelled successfully',
      ...result
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get subscription plans (public endpoint)
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'individual-monthly',
        name: 'Individual Plan',
        price: 50,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Unlimited real-time translation sessions',
          'Works across all 100+ languages supported',
          'Secure QR handshake for pairing',
          'AI-powered travel assistance',
          'Priority customer support',
          'Offline translation capabilities',
          'Translation history & favorites',
          'Custom voice settings'
        ],
        targetAudience: 'Solo travelers & tourists',
        description: 'Perfect for individual travelers who need reliable translation services',
        buttonText: 'Start Free Trial',
        isPopular: false
      },
      {
        id: 'individual-yearly',
        name: 'Individual Plan',
        price: 500,
        currency: 'USD',
        billingCycle: 'yearly',
        features: [
          'Unlimited real-time translation sessions',
          'Works across all 100+ languages supported',
          'Secure QR handshake for pairing',
          'AI-powered travel assistance',
          'Priority customer support',
          'Offline translation capabilities',
          'Translation history & favorites',
          'Custom voice settings',
          '2 months free (save $100)'
        ],
        targetAudience: 'Solo travelers & tourists',
        description: 'Perfect for individual travelers who need reliable translation services',
        buttonText: 'Start Free Trial',
        savings: 'Save $100/year',
        isPopular: true
      },
      {
        id: 'group-monthly',
        name: 'Group Plan',
        price: 150,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Up to 4 user accounts linked under 1 subscription',
          'Shared session history',
          'Group session pairing support',
          'All Individual plan features',
          'Family-friendly interface',
          'Group chat translation',
          'Shared favorites & phrases',
          'Admin controls for group management'
        ],
        targetAudience: 'Families, small tourist groups',
        maxUsers: 4,
        description: 'Ideal for families and small groups traveling together',
        buttonText: 'Start Free Trial',
        isPopular: false
      },
      {
        id: 'group-yearly',
        name: 'Group Plan',
        price: 1500,
        currency: 'USD',
        billingCycle: 'yearly',
        features: [
          'Up to 4 user accounts linked under 1 subscription',
          'Shared session history',
          'Group session pairing support',
          'All Individual plan features',
          'Family-friendly interface',
          'Group chat translation',
          'Shared favorites & phrases',
          'Admin controls for group management',
          '2 months free (save $300)'
        ],
        targetAudience: 'Families, small tourist groups',
        maxUsers: 4,
        description: 'Ideal for families and small groups traveling together',
        buttonText: 'Start Free Trial',
        savings: 'Save $300/year',
        isPopular: false
      },
      {
        id: 'business-monthly',
        name: 'Business Plan',
        price: 500,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Admin dashboard for managing multiple employees',
          'Priority translation servers (lower latency)',
          'Analytics & usage reporting',
          'Dedicated support team',
          'Custom branding options',
          'API access for integrations',
          'Advanced security features',
          'Team collaboration tools',
          'Unlimited users (flexible tiers)'
        ],
        targetAudience: 'Companies, tour operators, sales teams',
        description: 'Enterprise-grade solution for businesses with global operations',
        buttonText: 'Contact Sales',
        isBusiness: true,
        isPopular: false
      },
      {
        id: 'business-yearly',
        name: 'Business Plan',
        price: 5000,
        currency: 'USD',
        billingCycle: 'yearly',
        features: [
          'Admin dashboard for managing multiple employees',
          'Priority translation servers (lower latency)',
          'Analytics & usage reporting',
          'Dedicated support team',
          'Custom branding options',
          'API access for integrations',
          'Advanced security features',
          'Team collaboration tools',
          'Unlimited users (flexible tiers)',
          '2 months free (save $1000)'
        ],
        targetAudience: 'Companies, tour operators, sales teams',
        description: 'Enterprise-grade solution for businesses with global operations',
        buttonText: 'Contact Sales',
        savings: 'Save $1000/year',
        isBusiness: true,
        isPopular: false
      },
      {
        id: 'daily-pass',
        name: 'Day Pass',
        price: 10,
        currency: 'USD',
        billingCycle: 'daily',
        features: [
          '24-hour access to all Individual plan features',
          'Unlimited real-time translation sessions',
          'Works across all 100+ languages supported',
          'Secure QR handshake for pairing',
          'AI-powered travel assistance',
          'Perfect for short trips'
        ],
        targetAudience: 'Casual tourists who don\'t want a monthly plan',
        description: 'Perfect for short trips and one-time translation needs',
        buttonText: 'Get Day Pass',
        isPopular: false
      }
    ];

    res.json({ plans });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ 
      error: 'Failed to get plans',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
