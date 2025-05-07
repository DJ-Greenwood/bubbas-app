// src/components/dashboard/UsageDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { getTokenUsageStats, getTokenUsageSummary } from '@/utils/TokenDataService';
import { useSubscription } from '@/utils/subscriptionService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

const UsageDashboard = () => {
  const [usageStats, setUsageStats] = useState<any>({
    daily: {},
    monthly: {},
    lifetime: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      count: 0
    },
    limits: {
      dailyRemaining: 0,
      monthlyRemaining: 0,
      dailyUsed: 0,
      monthlyUsed: 0,
      dailyLimit: 0,
      monthlyLimit: 0
    }
  });
  const [usageSummary, setUsageSummary] = useState<any>({
    daily: { used: 0, limit: 0, percent: 0 },
    monthly: { used: 0, limit: 0, percent: 0 },
    lifetime: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { subscription } = useSubscription();
  
  // Get current date for usage stats
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonth = new Date().getFullYear() + '-' + 
    String(new Date().getMonth() + 1).padStart(2, '0'); // YYYY-MM
  
  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        // Get detailed token usage stats
        const stats = await getTokenUsageStats();
        setUsageStats(stats);
        
        // Get simplified summary for display
        const summary = await getTokenUsageSummary();
        setUsageSummary(summary);
        
        setError(null);
      } catch (err: any) {
        console.error('Error loading usage stats:', err);
        setError(err.message || 'Failed to load usage statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate percentages for progress bars
  const dailyPercent = usageSummary.daily.percent;
  const monthlyPercent = usageSummary.monthly.percent;
  
  // Determine if limits are close to being reached (80% or more)
  const isDailyLimitNearlyReached = dailyPercent >= 80;
  const isMonthlyLimitNearlyReached = monthlyPercent >= 80;
  
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Usage Dashboard</CardTitle>
              <CardDescription>
                Track your chat and token usage across your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Daily Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Daily Chat Usage</span>
                  <span className={`text-sm ${isDailyLimitNearlyReached ? 'text-amber-600 font-medium' : ''}`}>
                    {usageSummary.daily.used} / {usageSummary.daily.limit} chats
                  </span>
                </div>
                <Progress 
                  value={dailyPercent} 
                  className={`h-2 ${isDailyLimitNearlyReached ? '!bg-amber-500' : ''}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Resets at midnight</span>
                  <span>{usageStats.limits.dailyRemaining} remaining</span>
                </div>
              </div>
              
              {/* Monthly Token Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Monthly Token Usage</span>
                  <span className={`text-sm ${isMonthlyLimitNearlyReached ? 'text-amber-600 font-medium' : ''}`}>
                    {formatNumber(usageSummary.monthly.used)} / {formatNumber(usageSummary.monthly.limit)} tokens
                  </span>
                </div>
                <Progress 
                  value={monthlyPercent} 
                  className={`h-2 ${isMonthlyLimitNearlyReached ? '!bg-amber-500' : ''}`} 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Resets on the 1st of the month</span>
                  <span>{formatNumber(usageStats.limits.monthlyRemaining)} remaining</span>
                </div>
              </div>
              
              {/* Warning message if limits are nearly reached */}
              {(isDailyLimitNearlyReached || isMonthlyLimitNearlyReached) && (
                <div className="flex items-start p-4 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-5 w-5 mr-2 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      You're reaching your {isDailyLimitNearlyReached ? 'daily chat' : 'monthly token'} limit
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Consider upgrading your plan for increased usage limits
                    </p>
                  </div>
                </div>
              )}
              
              {/* Current plan summary */}
              <div className="flex items-start p-4 rounded-md bg-blue-50 border border-blue-200">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Your current plan: <span className="font-bold">{subscription.name}</span>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {subscription.tier === 'free' 
                      ? 'Upgrade to Plus or Pro for increased limits and features' 
                      : subscription.tier === 'plus'
                      ? 'Enjoy enhanced features with your Plus subscription'
                      : 'You have our highest tier with maximum limits and all features'}
                  </p>
                </div>
              </div>
              
              {/* Subscription Features */}
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-3">Your Plan Features</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Chat Limit</span>
                    <span className="text-sm font-medium">{subscription.limits.dailyLimit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Monthly Token Limit</span>
                    <span className="text-sm font-medium">{formatNumber(subscription.limits.monthlyTokenLimit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Speech-to-Text Minutes</span>
                    <span className="text-sm font-medium">{subscription.limits.sttMinutes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Text-to-Speech Minutes</span>
                    <span className="text-sm font-medium">{subscription.limits.ttsMinutes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Journal Entries</span>
                    <span className="text-sm font-medium">{subscription.limits.maxJournalEntries}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {subscription.tier !== 'pro' && (
                <Button variant="default" onClick={() => setShowUpgradeDialog(true)}>
                  Upgrade Plan
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                Your overall usage stats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lifetime Total</span>
                  <span className="font-mono font-medium">
                    {formatNumber(usageStats.lifetime.totalTokens)} tokens
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chat Sessions</span>
                  <span className="font-mono font-medium">{formatNumber(usageStats.lifetime.count)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prompt Tokens</span>
                  <span className="font-mono font-medium">{formatNumber(usageStats.lifetime.promptTokens)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Tokens</span>
                  <span className="font-mono font-medium">{formatNumber(usageStats.lifetime.completionTokens)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Tokens/Chat</span>
                  <span className="font-mono font-medium">
                    {formatNumber(
                      usageStats.lifetime.count > 0
                        ? Math.round(usageStats.lifetime.totalTokens / usageStats.lifetime.count)
                        : 0
                    )}
                  </span>
                </div>
              </div>
              
              <div className="h-px bg-gray-200 my-4"></div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Month</span>
                  <span className="font-mono font-medium">
                    {formatNumber(usageStats.monthly[currentMonth]?.totalTokens || 0)} tokens
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Today</span>
                  <span className="font-mono font-medium">
                    {formatNumber(usageStats.daily[today]?.totalTokens || 0)} tokens
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Usage Over Time - Upgrade teaser for free tier */}
        {subscription.tier === 'free' && (
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Upgrade to Plus or Pro to access detailed analytics and charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-md flex flex-col items-center justify-center p-4">
                <img 
                  src="/assets/images/usage-analytics-preview.jpg" 
                  alt="Usage Analytics Preview" 
                  className="h-40 object-cover rounded-md opacity-50"
                />
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  Upgrade to See Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Choose the plan that best fits your needs
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
};

export default UsageDashboard;