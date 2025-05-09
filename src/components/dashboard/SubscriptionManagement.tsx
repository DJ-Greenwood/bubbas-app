'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, CreditCard, Settings } from 'lucide-react';
import { useSubscription, getDaysRemaining, isTrialActive, getTrialDaysRemaining, manageSubscription, cancelSubscription} from '@/utils/subscriptionService.updated';

import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

const SubscriptionManagement: React.FC = () => {
  const { subscription, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const { toast } = useToast();

  // Handle redirect to Stripe Customer Portal
  const handleManageSubscription = async () => {
    try {
      await manageSubscription();
      // Page will redirect to Stripe
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to access subscription management. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    
    try {
      const success = await cancelSubscription();
      
      if (success) {
        toast({
          title: 'Subscription Canceled',
          description: 'Your subscription has been canceled successfully.',
          variant: 'default',
        });
        setShowCancelDialog(false);
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Cancellation Error',
        description: 'Failed to cancel your subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate subscription info
  const expirationDate = subscription.expirationDate ? new Date(subscription.expirationDate) : null;
  const daysRemaining = subscription.expirationDate ? getDaysRemaining(subscription.expirationDate) : 0;
  const isOnTrial = isTrialActive(subscription);
  const trialDaysRemaining = getTrialDaysRemaining(subscription);
  const isCanceled = subscription.status === 'canceled';
  const isPastDue = subscription.status === 'past_due';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan Info */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">
                  {isOnTrial 
                    ? `${subscription.name} (Trial)` 
                    : subscription.name} Plan
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {subscription.description}
                </p>
                
                {/* Subscription Status */}
                {subscription.tier !== 'free' && (
                  <div className="mt-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span>Status:</span>
                      <span className={`font-medium ${isCanceled ? 'text-red-600' : isPastDue ? 'text-amber-600' : 'text-green-600'}`}>
                        {isCanceled 
                          ? 'Canceled' 
                          : isPastDue 
                            ? 'Payment Past Due' 
                            : isOnTrial 
                              ? 'Trial Active' 
                              : 'Active'}
                      </span>
                    </div>
                    
                    {isOnTrial && (
                      <div className="flex justify-between items-center mb-1">
                        <span>Trial ends in:</span>
                        <span className="font-medium">{trialDaysRemaining} days</span>
                      </div>
                    )}
                    
                    {expirationDate && (
                      <div className="flex justify-between items-center">
                        <span>{isCanceled ? 'Access until:' : 'Next billing date:'}</span>
                        <span className="font-medium">
                          {formatDate(expirationDate)}
                          {daysRemaining > 0 && ` (${daysRemaining} days)`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Subscription Features */}
          <div>
            <h3 className="text-lg font-medium mb-3">Features & Limits</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Daily Chat Limit:</div>
                <div className="text-sm text-right">{subscription.limits.dailyLimit}</div>
                
                <div className="text-sm font-medium">Monthly Token Limit:</div>
                <div className="text-sm text-right">
                  {typeof subscription.limits.monthlyTokenLimit === 'number'
                    ? subscription.limits.monthlyTokenLimit.toLocaleString()
                    : subscription.limits.monthlyTokenLimit}
                </div>
                
                <div className="text-sm font-medium">Journal Storage:</div>
                <div className="text-sm text-right">{subscription.limits.maxJournalEntries}</div>
                
                <div className="text-sm font-medium">Speech-to-Text:</div>
                <div className="text-sm text-right">{subscription.limits.sttMinutes} min/month</div>
                
                <div className="text-sm font-medium">Text-to-Speech:</div>
                <div className="text-sm text-right">{subscription.limits.ttsMinutes} min/month</div>
              </div>
            </div>
          </div>
          
          {/* Payment past due warning */}
          {isPastDue && (
            <div className="flex items-start p-4 rounded-md bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 mr-2 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Payment Past Due
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Your payment could not be processed. Please update your payment method to continue using premium features.
                </p>
              </div>
            </div>
          )}
          
          {/* Canceled subscription warning */}
          {isCanceled && subscription.tier !== 'free' && (
            <div className="flex items-start p-4 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Subscription Canceled
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Your subscription has been canceled and will not renew. You can continue to use premium features until {expirationDate && formatDate(expirationDate)}.
                </p>
              </div>
            </div>
          )}
          
          {/* Trial ending soon warning */}
          {isOnTrial && trialDaysRemaining <= 2 && (
            <div className="flex items-start p-4 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Trial Ending Soon
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Your free trial will end in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Add a payment method to continue your subscription.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          {subscription.tier === 'free' ? (
            <Button onClick={() => setShowUpgradeDialog(true)}>
              Upgrade Plan
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
              </Button>
              
              {!isCanceled && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelDialog(true)}
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancel Subscription
                </Button>
              )}
              
              <Button 
                variant="default" 
                onClick={() => setShowUpgradeDialog(true)}
                className="flex items-center gap-2"
              >
                {subscription.tier === 'plus' ? 'Upgrade to Pro' : 'Change Plan'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
      
      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your needs
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector 
            onClose={() => setShowUpgradeDialog(false)} 
            currentTier={subscription.tier} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              If you cancel, your subscription will remain active until the end of your current billing period ({expirationDate && formatDate(expirationDate)}), but will not renew afterward.
            </p>
            <p className="text-sm text-gray-500">
              You will be downgraded to the Free plan after your subscription ends.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCanceling}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling ? 'Canceling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionManagement;