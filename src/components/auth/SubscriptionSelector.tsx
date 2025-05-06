'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription, updateSubscriptionTier, startFreeTrial } from '@/utils/subscriptionService';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/utils/subscriptionService';

interface SubscriptionSelectorProps {
  onClose?: () => void;
  currentTier: SubscriptionTier;
}

const SubscriptionSelector: React.FC<SubscriptionSelectorProps> = ({ onClose }) => {
  const { subscription, loading } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('plus');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const isCurrentPlan = (tier: SubscriptionTier) => {
    return subscription.tier === tier;
  };

  const handleTrialStart = async (tier: 'plus' | 'pro') => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await startFreeTrial(tier);
      toast({
        title: 'Trial started!',
        description: `Your 7-day trial of the ${tier === 'plus' ? 'Plus' : 'Pro'} plan has started.`,
      });
      if (onClose) onClose();
    } catch (error) {
      console.error('Error starting trial:', error);
      toast({
        title: 'Error',
        description: 'Failed to start your trial. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // In a real app, this would redirect to a payment page
      // For demo purposes, we'll just update the subscription
      await updateSubscriptionTier(tier);
      toast({
        title: 'Subscription updated!',
        description: `You've successfully upgraded to the ${SUBSCRIPTION_TIERS[tier].name} plan.`,
      });
      if (onClose) onClose();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to upgrade your subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your needs
        </p>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            {/* <TabsTrigger value="yearly">Yearly (Save 20%)</TabsTrigger> */}
            <TabsTrigger value="yearly" disabled>Yearly (Coming Soon)</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className={`relative overflow-hidden ${isCurrentPlan('free') ? 'border-primary' : ''}`}>
              {isCurrentPlan('free') && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-medium px-2 py-1 rounded-bl">
                  Current Plan
                </div>
              )}
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Basic support and journaling</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.free.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-md bg-muted p-3 mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Limits:</span> {SUBSCRIPTION_TIERS.free.limits.dailyLimit} chats/day,{' '}
                      {SUBSCRIPTION_TIERS.free.limits.monthlyTokenLimit.toLocaleString()} tokens/month
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant={isCurrentPlan('free') ? "outline" : "default"}
                  className="w-full"
                  disabled={isCurrentPlan('free')}
                >
                  {isCurrentPlan('free') ? 'Current Plan' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>

            {/* Plus Plan */}
            <Card className={`relative overflow-hidden border-2 ${isCurrentPlan('plus') ? 'border-primary' : 'border-accent'}`}>
              {isCurrentPlan('plus') && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-medium px-2 py-1 rounded-bl">
                  Current Plan
                </div>
              )}
              {!isCurrentPlan('plus') && (
                <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-medium px-2 py-1 rounded-bl">
                  Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>Plus</CardTitle>
                <CardDescription>Enhanced AI with more memory</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$5.99</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.plus.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-md bg-muted p-3 mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Limits:</span> {SUBSCRIPTION_TIERS.plus.limits.dailyLimit} chats/day,{' '}
                      {SUBSCRIPTION_TIERS.plus.limits.monthlyTokenLimit.toLocaleString()} tokens/month
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  variant={isCurrentPlan('plus') ? "outline" : "default"}
                  className="w-full"
                  disabled={isCurrentPlan('plus') || isProcessing}
                  onClick={() => handleUpgrade('plus')}
                >
                  {isCurrentPlan('plus')
                    ? 'Current Plan'
                    : isProcessing
                    ? 'Processing...'
                    : 'Upgrade Now'}
                </Button>
                {!isCurrentPlan('plus') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleTrialStart('plus')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Start 7-Day Free Trial'}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative overflow-hidden ${isCurrentPlan('pro') ? 'border-primary' : ''}`}>
              {isCurrentPlan('pro') && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-medium px-2 py-1 rounded-bl">
                  Current Plan
                </div>
              )}
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>Full experience with all features</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$9.99</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-md bg-muted p-3 mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Limits:</span> {SUBSCRIPTION_TIERS.pro.limits.dailyLimit} chats/day,{' '}
                      {SUBSCRIPTION_TIERS.pro.limits.monthlyTokenLimit.toLocaleString()} tokens/month
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  variant={isCurrentPlan('pro') ? "outline" : "default"}
                  className="w-full"
                  disabled={isCurrentPlan('pro') || isProcessing}
                  onClick={() => handleUpgrade('pro')}
                >
                  {isCurrentPlan('pro')
                    ? 'Current Plan'
                    : isProcessing
                    ? 'Processing...'
                    : 'Upgrade Now'}
                </Button>
                {!isCurrentPlan('pro') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleTrialStart('pro')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Start 7-Day Free Trial'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            All plans include a 7-day free trial with no credit card required.
            <br />
            Every higher tier includes all features from the previous one, with expanded capabilities and deeper personalization.
          </div>
        </TabsContent>

        <TabsContent value="yearly">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Coming Soon!</h3>
              <p className="text-muted-foreground">
                Annual plans with 20% discount will be available soon.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionSelector;