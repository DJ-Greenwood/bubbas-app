'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import useSubscriptionWithUsage from '@/hooks/useSubscriptionWithUsage';

interface SubscriptionLimitWarningProps {
  showProgress?: boolean;
  compact?: boolean;
}

const SubscriptionLimitWarning: React.FC<SubscriptionLimitWarningProps> = ({
  showProgress = true,
  compact = false
}) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const subscription = useSubscriptionWithUsage();
  
  // If user is on Pro tier or there are no warnings to show, don't render anything
  if (subscription.tier === 'pro' || !subscription.shouldShowUpgrade) {
    return null;
  }
  
  // Render a more compact warning for sidebar or header placement
  if (compact) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
          onClick={() => setShowUpgradeDialog(true)}
        >
          <AlertTriangle className="h-3 w-3" />
          {subscription.hasReachedChatLimit || subscription.hasReachedTokenLimit 
            ? 'Limit Reached' 
            : 'Upgrade'}
        </Button>
        
        {/* Subscription upgrade dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Upgrade Your Plan</DialogTitle>
              <DialogDescription>
                Unlock higher usage limits and more features
              </DialogDescription>
            </DialogHeader>
            <SubscriptionSelector 
              onClose={() => setShowUpgradeDialog(false)} 
              currentTier={subscription.tier} 
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }
  
  return (
    <div className="space-y-2 my-2">
      {/* Show error alerts for reached limits */}
      {subscription.hasReachedChatLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Daily Chat Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You've reached your daily limit of {subscription.limits.dailyLimit} chats.
              Your limit will reset at midnight.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-2 bg-white"
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {subscription.hasReachedTokenLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Monthly Token Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You've reached your monthly limit of {typeof subscription.limits.monthlyTokenLimit === 'number' 
                ? subscription.limits.monthlyTokenLimit.toLocaleString() 
                : subscription.limits.monthlyTokenLimit} tokens.
              Your limit will reset at the start of next month.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-2 bg-white"
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show warning for approaching limits */}
      {!subscription.hasReachedChatLimit && !subscription.hasReachedTokenLimit && 
        (subscription.chatLimitPercentage > 80 || subscription.tokenLimitPercentage > 80) && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Approaching Usage Limits</AlertTitle>
          <AlertDescription>
            You're getting close to your usage limits. Consider upgrading your plan for uninterrupted usage.
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-2 bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              View Plans
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show usage progress bars */}
      {showProgress && (
        <div className="mt-4 space-y-3 border rounded-md p-3 bg-gray-50">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Daily chats: {subscription.chatsToday} / {
                typeof subscription.limits.dailyLimit === 'number' 
                  ? subscription.limits.dailyLimit 
                  : '∞'
              }</span>
              <span>{subscription.chatLimitPercentage}%</span>
            </div>
            <Progress 
              value={subscription.chatLimitPercentage} 
              className="h-2"
              color={subscription.chatLimitPercentage > 90 ? 'red' : 
                     subscription.chatLimitPercentage > 75 ? 'amber' : 'green'}
            />
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Monthly tokens: {subscription.tokensThisMonth.toLocaleString()} / {
                typeof subscription.limits.monthlyTokenLimit === 'number' 
                  ? subscription.limits.monthlyTokenLimit.toLocaleString() 
                  : '∞'
              }</span>
              <span>{subscription.tokenLimitPercentage}%</span>
            </div>
            <Progress 
              value={subscription.tokenLimitPercentage} 
              className="h-2"
              color={subscription.tokenLimitPercentage > 90 ? 'red' : 
                     subscription.tokenLimitPercentage > 75 ? 'amber' : 'green'}
            />
          </div>
        </div>
      )}
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Unlock higher usage limits and more features
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector 
            onClose={() => setShowUpgradeDialog(false)} 
            currentTier={subscription.tier} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionLimitWarning;