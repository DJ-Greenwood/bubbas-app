'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSubscription, getDaysRemaining } from '@/utils/subscriptionService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

const SubscriptionDetailsCard = () => {
  const { subscription, loading } = useSubscription();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="animate-pulse bg-muted h-6 w-36 rounded-sm"></CardTitle>
          <CardDescription className="animate-pulse bg-muted h-4 w-24 mt-1 rounded-sm"></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted h-20 rounded-sm"></div>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = subscription.expirationDate 
    ? getDaysRemaining(subscription.expirationDate)
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                {subscription.name} Plan
                {subscription.status === 'trial' && (
                  <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                    Trial
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {subscription.description}
              </CardDescription>
            </div>
            <Badge className={`${subscription.tier === 'free' ? 'bg-gray-500' : subscription.tier === 'plus' ? 'bg-blue-500' : 'bg-purple-500'}`}>
              {subscription.price}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-medium">Included Features:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscription.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {subscription.status === 'trial' && daysRemaining > 0 && (
            <div className="flex items-start p-4 rounded-md bg-yellow-50 border border-yellow-200">
              <Clock className="h-5 w-5 mr-2 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Trial ending in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Enjoy your {subscription.name} trial! No payment required during the trial period.
                </p>
              </div>
            </div>
          )}

          {subscription.status === 'active' && subscription.tier !== 'free' && subscription.expirationDate && (
            <div className="flex items-start p-4 rounded-md bg-blue-50 border border-blue-200">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Subscription will renew on {new Date(subscription.expirationDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  You can cancel anytime before this date
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {subscription.tier === 'free' ? (
            <Button variant="default" onClick={() => setIsUpgradeOpen(true)}>
              Upgrade Plan
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm">
                Cancel Subscription
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsUpgradeOpen(true)}
                disabled={subscription.tier === 'pro'}
              >
                {subscription.tier === 'plus' ? 'Upgrade to Pro' : 'Manage Subscription'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Choose the plan that best fits your needs
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector onClose={() => setIsUpgradeOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionDetailsCard;