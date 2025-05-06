'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getTokenUsageSummary } from '@/utils/firebaseDataService';
import { getUserTier } from '@/utils/subscriptionService';

const UsageStatsCard = () => {
  const [usageStats, setUsageStats] = useState({
    daily: { used: 0, limit: 10, percent: 0 },
    monthly: { used: 0, limit: 10000, percent: 0 },
    lifetime: 0
  });
  
  const [tierName, setTierName] = useState('Free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getTokenUsageSummary();
        setUsageStats({
          daily: {
            used: stats.daily.used || 0,
            limit: stats.daily.limit || 10,
            percent: stats.daily.percent || 0,
          },
          monthly: {
            used: stats.monthly.used || 0,
            limit: stats.monthly.limit || 10000,
            percent: stats.monthly.percent || 0,
          },
          lifetime: stats.lifetime.totalTokens || 0,
        });
        
        const tier = await getUserTier();
        setTierName(tier.name);
      } catch (error) {
        console.error('Error loading usage stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <CardDescription>
          Your current {tierName} plan usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Chat Usage</span>
                <span>
                  {usageStats.daily.used} / {usageStats.daily.limit} chats
                </span>
              </div>
              <Progress value={usageStats.daily.percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Resets at midnight
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Token Usage</span>
                <span>
                  {formatNumber(usageStats.monthly.used)} / {formatNumber(usageStats.monthly.limit)} tokens
                </span>
              </div>
              <Progress value={usageStats.monthly.percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Resets on the 1st of each month
              </p>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm">
                <span className="font-medium">Lifetime usage:</span>{' '}
                {formatNumber(usageStats.lifetime)} tokens
              </p>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Upgrade your plan for increased usage limits
      </CardFooter>
    </Card>
  );
};

export default UsageStatsCard;