// src/utils/stripeService.ts
'use client';

import { auth } from './firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseClient';
import { SubscriptionTier } from '@/types/subscriptionTypes';
import { toast } from '@/hooks/use-toast';

// Firebase callable functions
const createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
const createCustomerPortalSession = httpsCallable(functions, 'createStripeCustomerPortalSession');
const cancelSubscription = httpsCallable(functions, 'cancelStripeSubscription');

/**
 * Interface for subscription product data
 */
export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
}

/**
 * Subscription product mapping
 */
export const STRIPE_PRODUCTS: Record<SubscriptionTier, SubscriptionProduct> = {
  free: {
    id: 'free_tier',
    name: 'Free Tier',
    description: 'Basic access with limited features',
    tier: 'free',
    priceId: '', // No price ID for free tier
    price: 0,
    currency: 'usd',
    interval: 'month'
  },
  plus: {
    id: 'prod_plus',
    name: 'Plus Subscription',
    description: 'Enhanced AI experience with more memory and insights',
    tier: 'plus',
    priceId: 'price_plus_monthly', // Replace with your actual Stripe price ID
    price: 599, // $5.99
    currency: 'usd',
    interval: 'month'
  },
  pro: {
    id: 'prod_pro',
    name: 'Pro Subscription',
    description: 'Full experience with advanced emotional analysis',
    tier: 'pro',
    priceId: 'price_pro_monthly', // Replace with your actual Stripe price ID
    price: 999, // $9.99
    currency: 'usd',
    interval: 'month'
  }
};

/**
 * Type for checkout session parameters
 */
interface CheckoutParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

/**
 * Redirect to Stripe Checkout for a subscription
 */
export const redirectToCheckout = async (tier: 'plus' | 'pro'): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to subscribe.',
        variant: 'destructive'
      });
      return;
    }

    const product = STRIPE_PRODUCTS[tier];
    
    // Prepare checkout session parameters
    const params: CheckoutParams = {
      priceId: product.priceId,
      successUrl: `${window.location.origin}/dashboard?checkout=success&tier=${tier}`,
      cancelUrl: `${window.location.origin}/pricing?checkout=canceled`,
      customerEmail: user.email || undefined,
      metadata: {
        userId: user.uid,
        tier: tier
      }
    };

    // Call the Firebase function to create a checkout session
    const { data } = await createCheckoutSession(params);
    
    // Redirect to the checkout URL
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    toast({
      title: 'Checkout Error',
      description: 'Failed to start the checkout process. Please try again.',
      variant: 'destructive'
    });
  }
};

/**
 * Redirect to Stripe Customer Portal to manage subscription
 */
export const redirectToCustomerPortal = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to manage your subscription.',
        variant: 'destructive'
      });
      return;
    }

    // Call the Firebase function to create a customer portal session
    const { data } = await createCustomerPortalSession({
      returnUrl: `${window.location.origin}/dashboard`
    });
    
    // Redirect to the portal URL
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No portal URL returned');
    }
  } catch (error) {
    console.error('Error redirecting to customer portal:', error);
    toast({
      title: 'Portal Error',
      description: 'Failed to access the customer portal. Please try again.',
      variant: 'destructive'
    });
  }
};

/**
 * Cancel the current subscription
 */
export const cancelCurrentSubscription = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to cancel your subscription.',
        variant: 'destructive'
      });
      return false;
    }

    // Call the Firebase function to cancel the subscription
    const { data } = await cancelSubscription({
      userId: user.uid
    });
    
    if (data && data.success) {
      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription has been canceled successfully.',
        variant: 'default'
      });
      return true;
    } else {
      throw new Error('Failed to cancel subscription');
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    toast({
      title: 'Cancellation Error',
      description: 'Failed to cancel your subscription. Please try again.',
      variant: 'destructive'
    });
    return false;
  }
};

/**
 * Format currency amount from cents to dollars with appropriate format
 */
export const formatCurrency = (amount: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amount / 100);
};

/**
 * Get formatted price string
 */
export const getFormattedPrice = (tier: SubscriptionTier): string => {
  const product = STRIPE_PRODUCTS[tier];
  
  if (tier === 'free') {
    return 'Free';
  }
  
  return `${formatCurrency(product.price)}/${product.interval}`;
};