// src/components/dashboard/TokenUsageCharts.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { getTokenUsageHistory, getAggregatedTokenStats } from '@/utils/firebaseDataService';
import { getTokenUsageStats } from '@/utils/firebaseDataService';
import { useSubscription } from '@/utils/subscriptionService';
import { AlertCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

const TokenUsageCharts = () => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [usageData, setUsageData] = useState<any[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<any>({
    daily: {},
    monthly: {},
    lifetime: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      count: 0
    }
  });
  const [usageStats, setUsageStats] = useState<any>({
    limits: {
      dailyRemaining: 0,
      monthlyRemaining: 0,
      dailyUsed: 0,
      monthlyUsed: 0,
      dailyLimit: 0,
      monthlyLimit: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription } = useSubscription();

  useEffect(() => {
    const loadUsageData = async () => {
      setLoading(true);
      try {
        // Get token usage history
        const timeframeMapping: Record<'day' | 'week' | 'month' | 'all', { startDate?: Date; endDate?: Date }> = {
          day: { startDate: new Date(new Date().setHours(0, 0, 0, 0)), endDate: new Date() },
          week: { startDate: new Date(new Date().setDate(new Date().getDate() - 7)), endDate: new Date() },
          month: { startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), endDate: new Date() },
          all: {}
        };

        const history = await getTokenUsageHistory(timeframeMapping[timeframe]);
        
        // Group by day for time-series data
        const groupedByDay: Record<string, {
          date: string;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          count: number;
        }> = {};
        
        history.forEach(record => {
          const date = new Date(record.timestamp).toISOString().split('T')[0];
          
          if (!groupedByDay[date]) {
            groupedByDay[date] = {
              date,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              count: 0
            };
          }
          
          groupedByDay[date].promptTokens += record.promptTokens;
          groupedByDay[date].completionTokens += record.completionTokens;
          groupedByDay[date].totalTokens += record.totalTokens;
          groupedByDay[date].count++;
        });
        
        // Convert to array and sort by date
        const sortedData = Object.values(groupedByDay).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        setUsageData(sortedData);
        
        // Get aggregated stats
        const stats = await getAggregatedTokenStats();
        setAggregatedStats(stats);
        
        // Get usage stats with limits
        const usageStatData = await getTokenUsageStats();
        setUsageStats(usageStatData);
        
        setError(null);
      } catch (error) {
        console.error('Error loading usage data:', error);
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    };
    
    loadUsageData();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(loadUsageData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [timeframe]);

  // Group by chat type for pie chart
  const tokenDistributionData = React.useMemo(() => {
    return [
      { 
        name: 'Prompt', 
        value: usageData.reduce((sum, day) => sum + day.promptTokens, 0) 
      },
      { 
        name: 'Completion', 
        value: usageData.reduce((sum, day) => sum + day.completionTokens, 0) 
      }
    ];
  }, [usageData]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Calculate usage vs limit percentages
  const dailyPercentUsed = Math.min(100, Math.round((usageStats.limits.dailyUsed / usageStats.limits.dailyLimit) * 100) || 0);
  const monthlyPercentUsed = Math.min(100, Math.round((usageStats.limits.monthlyUsed / usageStats.limits.monthlyLimit) * 100) || 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
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

  if (usageData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No usage data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Analytics</CardTitle>
        <CardDescription>
          Monitor your token usage over time
        </CardDescription>
        <TabsList>
          <TabsTrigger 
            value="day"
            onClick={() => setTimeframe('day')}
            className={timeframe === 'day' ? 'bg-primary text-primary-foreground' : ''}
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="week"
            onClick={() => setTimeframe('week')}
            className={timeframe === 'week' ? 'bg-primary text-primary-foreground' : ''}
          >
            Week
          </TabsTrigger>
          <TabsTrigger 
            value="month"
            onClick={() => setTimeframe('month')}
            className={timeframe === 'month' ? 'bg-primary text-primary-foreground' : ''}
          >
            Month
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            onClick={() => setTimeframe('all')}
            className={timeframe === 'all' ? 'bg-primary text-primary-foreground' : ''}
          >
            All Time
          </TabsTrigger>
        </TabsList>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Token Usage by Day Chart */}
          <div>
            <h3 className="text-lg font-medium mb-4">Token Usage Over Time</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={usageData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatNumber(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    name="Prompt Tokens" 
                    dataKey="promptTokens" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    name="Completion Tokens" 
                    dataKey="completionTokens" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Usage Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Token Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tokenDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {tokenDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Chat Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={usageData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatNumber(value)}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Chats" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Warning message if limits are nearly reached */}
          {(dailyPercentUsed >= 80 || monthlyPercentUsed >= 80) && (
            <div className="flex items-start p-4 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  You're approaching your {dailyPercentUsed >= 80 ? 'daily chat' : 'monthly token'} limit
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Consider upgrading your plan for increased usage limits
                </p>
              </div>
            </div>
          )}
          
          {/* Usage vs Limits */}
          <div>
            <h3 className="text-lg font-medium mb-4">Usage vs Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Token Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${monthlyPercentUsed >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${monthlyPercentUsed}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                    <span>
                      {formatNumber(usageStats.limits.monthlyUsed)} tokens used
                    </span>
                    <span>{formatNumber(usageStats.limits.monthlyLimit)} limit</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Daily Chat Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${dailyPercentUsed >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${dailyPercentUsed}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                    <span>
                      {usageStats.limits.dailyUsed} chats today
                    </span>
                    <span>{usageStats.limits.dailyLimit} limit</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Summary Statistics */}
          <div>
            <h3 className="text-lg font-medium mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Tokens</p>
                <p className="text-2xl font-semibold">
                  {formatNumber(aggregatedStats.lifetime.totalTokens)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Chats</p>
                <p className="text-2xl font-semibold">
                  {formatNumber(aggregatedStats.lifetime.count)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Avg Tokens/Chat</p>
                <p className="text-2xl font-semibold">
                  {formatNumber(
                    aggregatedStats.lifetime.count > 0
                      ? Math.round(aggregatedStats.lifetime.totalTokens / aggregatedStats.lifetime.count)
                      : 0
                  )}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Current Tier</p>
                <p className="text-2xl font-semibold capitalize">
                  {subscription.tier}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenUsageCharts;