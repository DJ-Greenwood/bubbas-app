'use client';

import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/utils/subscriptionService';
import { getUserUsageSummary, getUserChatHistory } from '@/utils/usageService';
import { useToast } from '@/hooks/use-toast';
import { getTokenUsageHistory } from '@/utils/TokenDataService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CalendarIcon, AlertTriangle, Crown, MessageSquare, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

const formatNumber = (num: number | 'Unlimited'): string => {
  if (num === 'Unlimited') return 'Unlimited';
  return new Intl.NumberFormat().format(num);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const UsageDashboard: React.FC = () => {
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [recentChatHistory, setRecentChatHistory] = useState<any[]>([]);
  const [tokenHistory, setTokenHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  // Load usage data
  useEffect(() => {
    const loadUsageData = async () => {
      try {
        setIsLoading(true);
        const summary = await getUserUsageSummary();
        setUsageSummary(summary);
      } catch (error) {
        console.error('Error loading usage data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load usage data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUsageData();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadUsageData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [toast]);
  
  // Load chat and token history
  useEffect(() => {
    const loadDetailsData = async () => {
      try {
        setIsDetailsLoading(true);
        
        // Get recent chats (last 5)
        const chatHistory = await getUserChatHistory(5, 0);
        setRecentChatHistory(chatHistory);
        
        // Get recent token usage history
        const tokenUsageHistory = await getTokenUsageHistory({ limit: 10 });
        setTokenHistory(tokenUsageHistory);
      } catch (error) {
        console.error('Error loading history data:', error);
      } finally {
        setIsDetailsLoading(false);
      }
    };
    
    loadDetailsData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!usageSummary) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold">Unable to load usage data</h3>
        <p className="text-gray-500">Please try refreshing the page.</p>
      </div>
    );
  }

  // Calculate percentages for visualizations
  const chatPercentage = usageSummary.dailyLimit === 'Unlimited' 
    ? 0 
    : Math.min(100, Math.round((usageSummary.chatsToday / usageSummary.dailyLimit) * 100));
    
  const tokenPercentage = usageSummary.tokenLimit === 'Unlimited'
    ? 0
    : Math.min(100, Math.round((usageSummary.tokensThisMonth / usageSummary.tokenLimit) * 100));

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usage Dashboard</h1>
          <p className="text-gray-500">
            Monitor your chat and token usage
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
            subscription.tier === 'free' ? 'bg-gray-100 text-gray-800' :
            subscription.tier === 'plus' ? 'bg-blue-100 text-blue-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {subscription.tier === 'pro' && <Crown className="h-4 w-4" />}
            {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
          </div>
          
          {subscription.tier !== 'pro' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUpgradeDialog(true)}
            >
              Upgrade
            </Button>
          )}
        </div>
      </div>
      
      {/* Daily Chat Usage Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Daily Chat Usage
            </CardTitle>
            <CardDescription>
              Resets at midnight in your local time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Chats Today</span>
                <span className="font-medium">
                  {usageSummary.chatsToday} / {usageSummary.dailyLimit === 'Unlimited' ? '∞' : usageSummary.dailyLimit}
                </span>
              </div>
              
              <Progress value={chatPercentage} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Remaining</div>
                  <div className="font-semibold text-lg">
                    {usageSummary.dailyRemaining === 'Unlimited' ? '∞' : usageSummary.dailyRemaining}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Used</div>
                  <div className="font-semibold text-lg">{usageSummary.chatsToday}</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-gray-500 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Resets at midnight
            </div>
            
            {chatPercentage >= 80 && subscription.tier !== 'pro' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Need more?
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Monthly Token Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Monthly Token Usage
            </CardTitle>
            <CardDescription>
              Resets on the first day of each month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Tokens This Month</span>
                <span className="font-medium">
                              {subscription.tier === 'free' 
              ? formatNumber(Math.max(0, 10000 - usageSummary.tokensThisMonth))
              : subscription.tier === 'plus'
                ? formatNumber(Math.max(0, 50000 - usageSummary.tokensThisMonth))
                : '∞'
            }
                </span>
              </div>
              
              <Progress value={tokenPercentage} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Remaining</div>
                  <div className="font-semibold text-lg">
                    {usageSummary.tokensRemaining === 'Unlimited' ? '∞' : formatNumber(usageSummary.tokensRemaining)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Used</div>
                  <div className="font-semibold text-lg">{formatNumber(usageSummary.tokensThisMonth)}</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-gray-500 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Resets {formatDate(usageSummary.nextResetDate)}
            </div>
            
            {tokenPercentage >= 80 && subscription.tier !== 'pro' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Need more?
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Subscription Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan Features</CardTitle>
          <CardDescription>
            Current subscription benefits and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Daily Chat Limit</div>
              <div className="text-xl font-semibold">
                {usageSummary.dailyLimit === 'Unlimited' ? 'Unlimited' : usageSummary.dailyLimit}
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Monthly Token Limit</div>
              <div className="text-xl font-semibold">
                {usageSummary.tokenLimit === 'Unlimited' ? 'Unlimited' : formatNumber(usageSummary.tokenLimit)}
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Journal Storage</div>
              <div className="text-xl font-semibold">
                {subscription.limits.maxJournalEntries === 'Unlimited' 
                  ? 'Unlimited' 
                  : typeof subscription.limits.maxJournalEntries === 'number' || subscription.limits.maxJournalEntries === 'Unlimited'
                    ? formatNumber(subscription.limits.maxJournalEntries)
                    : subscription.limits.maxJournalEntries}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-3">Included Features:</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscription.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-green-100 text-green-800 p-1 mt-0.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          {subscription.tier !== 'pro' && (
            <Button 
              onClick={() => setShowUpgradeDialog(true)}
              className="w-full"
            >
              Upgrade to {subscription.tier === 'free' ? 'Plus' : 'Pro'}
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Token Usage Details Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Detailed Token Usage
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTokenDetails(!showTokenDetails)}
            >
              {showTokenDetails ? "Hide Details" : "Show Details"}
            </Button>
          </CardTitle>
          <CardDescription>
            Track detailed token usage across different chat interactions
          </CardDescription>
        </CardHeader>
        
        {showTokenDetails && (
          <CardContent>
            {isDetailsLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            ) : tokenHistory.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No token usage history available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Chat Type</th>
                      <th className="text-right p-2">Prompt Tokens</th>
                      <th className="text-right p-2">Completion Tokens</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenHistory.map((entry, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{new Date(entry.timestamp).toLocaleString()}</td>
                        <td className="p-2 capitalize">{entry.chatType || 'Unknown'}</td>
                        <td className="p-2 text-right">{entry.promptTokens?.toLocaleString() || 0}</td>
                        <td className="p-2 text-right">{entry.completionTokens?.toLocaleString() || 0}</td>
                        <td className="p-2 text-right font-medium">{entry.totalTokens?.toLocaleString() || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="p-2 font-medium">Totals</td>
                      <td className="p-2 text-right font-medium">
                        {tokenHistory.reduce((sum, entry) => sum + (entry.promptTokens || 0), 0).toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {tokenHistory.reduce((sum, entry) => sum + (entry.completionTokens || 0), 0).toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {tokenHistory.reduce((sum, entry) => sum + (entry.totalTokens || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
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

export default UsageDashboard;