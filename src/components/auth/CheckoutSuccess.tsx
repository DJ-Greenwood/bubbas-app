'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/utils/subscriptionService.updated';
import { SubscriptionTier } from '@/types/subscriptionTypes';

const CheckoutSuccess: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, loading } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [status, setStatus] = useState<'success' | 'processing' | 'error'>('processing');
  
  const tier = searchParams.get('tier') as SubscriptionTier || 'plus';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // This is a simplified check - in reality, your backend webhook would handle this
    // and the database would be updated accordingly
    const verifySubscription = async () => {
      try {
        // Wait for subscription data to load
        if (loading) return;
        
        // Add slight delay to let the webhook complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if subscription tier matches the expected tier from URL
        if (subscription.tier === tier) {
          setStatus('success');
        } else {
          // If webhook hasn't processed yet, keep showing processing state
          // In reality, you might poll a backend endpoint to check status
          setStatus('processing');
        }
      } catch (error) {
        console.error('Error verifying subscription:', error);
        setStatus('error');
      } finally {
        setIsVerifying(false);
      }
    };

    if (sessionId || tier) {
      verifySubscription();
    } else {
      // If no session ID or tier, redirect to dashboard
      router.push('/dashboard');
    }
  }, [sessionId, tier, subscription, loading, router]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {status === 'success' 
            ? 'Subscription Activated!' 
            : status === 'processing' 
              ? 'Processing Your Subscription' 
              : 'Subscription Error'}
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'success' 
            ? 'Thank you for your subscription' 
            : status === 'processing' 
              ? 'Your subscription is being processed' 
              : 'There was a problem with your subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        {isVerifying || status === 'processing' ? (
          <div className="text-center">
            <Loader className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <p>We're confirming your subscription...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Subscription Confirmed!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your {tier} plan is now active. Enjoy your premium features!
            </p>
          </div>
        ) : (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Subscription Error</p>
            <p className="text-sm text-muted-foreground mt-2">
              There was a problem activating your subscription. Please contact support.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={isVerifying || status === 'processing'}
        >
          Continue to Dashboard
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CheckoutSuccess;