'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_TIERS, SubscriptionTier, subscribeWithStripe, startFreeTrial  } from '@/utils/subscriptionService.updated';

import { formatCurrency, STRIPE_PRODUCTS } from '@/utils/stripeService';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionSelectorProps {
  onClose: () => void;
  currentTier: SubscriptionTier;
}

const SubscriptionSelector: React.FC<SubscriptionSelectorProps> = ({ onClose, currentTier }) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (selectedTier === 'free') {
      onClose();
      return;
    }

    if (selectedTier === currentTier) {
      toast({
        title: 'Already Subscribed',
        description: `You are already subscribed to the ${SUBSCRIPTION_TIERS[selectedTier].name} plan.`,
        variant: 'default',
      });
      onClose();
      return;
    }

    setIsProcessing(true);
    
    try {
      // Redirect to Stripe checkout
      await subscribeWithStripe(selectedTier as 'plus' | 'pro');
      
      // The component will unmount as the page redirects to Stripe
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription Error',
        description: 'There was a problem processing your subscription. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    if (selectedTier === 'free') {
      onClose();
      return;
    }

    if (selectedTier === currentTier) {
      toast({
        title: 'Already Subscribed',
        description: `You are already subscribed to the ${SUBSCRIPTION_TIERS[selectedTier].name} plan.`,
        variant: 'default',
      });
      onClose();
      return;
    }

    setIsProcessing(true);
    
    try {
      // Start a free trial
      const success = await startFreeTrial(selectedTier as 'plus' | 'pro');
      
      if (success) {
        toast({
          title: 'Trial Started',
          description: `Your ${SUBSCRIPTION_TIERS[selectedTier].name} trial has been started successfully.`,
          variant: 'default',
        });
        onClose();
      } else {
        throw new Error('Failed to start trial');
      }
    } catch (error) {
      console.error('Trial activation error:', error);
      toast({
        title: 'Trial Error',
        description: 'There was a problem activating your trial. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(SUBSCRIPTION_TIERS).map(([tier, details]) => {
          const isCurrent = tier === currentTier;
          const isSelected = tier === selectedTier;
          
          // Get product details from Stripe products
          const stripeProduct = STRIPE_PRODUCTS[tier as SubscriptionTier];
          const formattedPrice = tier === 'free' 
            ? 'Free' 
            : `${formatCurrency(stripeProduct.price)}/${stripeProduct.interval}`;
          
          return (
            <Card 
              key={tier}
              className={`overflow-hidden ${isSelected ? 'border-primary border-2' : ''}`}
            >
              {isCurrent && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Current Plan
                </div>
              )}
              <CardHeader>
                <CardTitle>{details.name}</CardTitle>
                <CardDescription>{details.description}</CardDescription>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{formattedPrice}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Features</h4>
                  <ul className="space-y-2">
                    {details.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Limits</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Daily Chats:</div>
                    <div className="font-medium text-right">{details.limits.dailyLimit}</div>
                    
                    <div>Monthly Tokens:</div>
                    <div className="font-medium text-right">
                      {typeof details.limits.monthlyTokenLimit === 'number' 
                        ? details.limits.monthlyTokenLimit.toLocaleString() 
                        : details.limits.monthlyTokenLimit}
                    </div>
                    
                    <div>Journal Entries:</div>
                    <div className="font-medium text-right">{details.limits.maxJournalEntries}</div>
                    
                    <div>TTS Minutes:</div>
                    <div className="font-medium text-right">{details.limits.ttsMinutes}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setSelectedTier(tier as SubscriptionTier)}
                  disabled={isProcessing}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
                
                {tier !== 'free' && !isCurrent && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartTrial}
                    disabled={isProcessing}
                  >
                    Start 7-day Trial
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-6 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubscribe}
          disabled={selectedTier === currentTier || isProcessing}
        >
          {isProcessing ? "Processing..." : "Confirm Subscription"}
        </Button>
      </div>
      
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Subscription Information
            </p>
            <p className="text-xs text-amber-700 mt-1">
              You will be redirected to Stripe secure checkout to complete your purchase. 
              Subscriptions automatically renew until canceled. You can cancel anytime from your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSelector;