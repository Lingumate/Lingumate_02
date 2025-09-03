import { SubscriptionPlan } from '@/types/subscription';

export const subscriptionPlans: SubscriptionPlan[] = [
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

export const getPopularPlans = () => subscriptionPlans.filter(plan => plan.isPopular);
export const getMonthlyPlans = () => subscriptionPlans.filter(plan => plan.billingCycle === 'monthly');
export const getYearlyPlans = () => subscriptionPlans.filter(plan => plan.billingCycle === 'yearly');
export const getBusinessPlans = () => subscriptionPlans.filter(plan => plan.isBusiness);
export const getIndividualPlans = () => subscriptionPlans.filter(plan => !plan.isBusiness && plan.billingCycle !== 'daily');
export const getDailyPass = () => subscriptionPlans.filter(plan => plan.billingCycle === 'daily');
