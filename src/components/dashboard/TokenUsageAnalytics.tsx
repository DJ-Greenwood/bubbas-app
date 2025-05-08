'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTokenUsageHistory, getAggregatedTokenStats, TokenRecord, getTokenUsageStats } from '@/utils/TokenDataService';

import { useSubscription } from '@/utils/subscriptionService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

const TokenUsageAnalytics = () => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [tokenHistory, setTokenHistory] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  
  const { subscription } = useSubscription();

  useEffect(() => {
    const loadTokenData = async () => {
      try {
        setLoading(true);
        
        // Load token usage history
        const timeframeMapping: Record<'day' | 'week' | 'month' | 'all', { startDate?: Date; endDate?: Date }> = {
          day: { startDate: new Date(new Date().setHours(0, 0, 0, 0)), endDate: new Date() },
          week: { startDate: new Date(new Date().setDate(new Date().getDate() - 7)), endDate: new Date() },
          month: { startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), endDate: new Date() },
          all: {}
        };

        const history = await getTokenUsageHistory(timeframeMapping[timeframe]);
        setTokenHistory(history);
        
        // Load aggregated token stats
        const stats = await getAggregatedTokenStats();
        setAggregatedStats(stats);
        
        // Load usage stats with limits
        const usageStatData = await getTokenUsageStats();
        setUsageStats(usageStatData);
        
        setError(null);
      } catch (err: any) {
        console.error('Error loading token data:', err);
        setError(err.message || 'Failed to load token usage data');
      } finally {
        setLoading(false);
      }
    };
    
    loadTokenData();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(loadTokenData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [timeframe]);

  // Prepare data for charts
  const prepareBarChartData = () => {
    // Group by day for charts
    const groupedByDay: Record<string, {
      date: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    }> = {};
    
    tokenHistory.forEach(record => {
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
    return Object.values(groupedByDay).sort((a, b) => a.date.localeCompare(b.date));
  };
  
  const preparePieChartData = () => {
    // Group by chat type
    const groupedByType: Record<string, {
      name: string;
      value: number;
      count: number;
    }> = {};
    
    tokenHistory.forEach(record => {
      const chatType = record.chatType || 'other';
      
      if (!groupedByType[chatType]) {
        groupedByType[chatType] = {
          name: chatType.charAt(0).toUpperCase() + chatType.slice(1),
          value: 0,
          count: 0
        };
      }
      
      groupedByType[chatType].value += record.totalTokens;
      groupedByType[chatType].count++;
    });
    
    // Convert to array
    return Object.values(groupedByType);
  };
  
  const prepareModelPieChartData = () => {
    // Group by model
    const groupedByModel: Record<string, {
      name: string;
      value: number;
    }> = {};
    
    tokenHistory.forEach(record => {
      const model = record.model || 'unknown';
      
      if (!groupedByModel[model]) {
        groupedByModel[model] = {
          name: model,
          value: 0
        };
      }
      
      groupedByModel[model].value += record.totalTokens;
    });
    
    // Convert to array
    return Object.values(groupedByModel);
  };
  
  const prepareLineChartData = () => {
    const barData = prepareBarChartData();
    return barData.map(day => ({
      ...day,
      date: formatDate(day.date)
    }));
  };
  
  const barChartData = prepareBarChartData();
  const pieChartData = preparePieChartData();
  const modelPieChartData = prepareModelPieChartData();
  const lineChartData = prepareLineChartData();
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Format large numbers
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  // Calculate usage vs limit percentages
  const dailyPercentUsed = Math.min(100, Math.round((usageStats.limits.dailyUsed / usageStats.limits.dailyLimit) * 100) || 0);
  const monthlyPercentUsed = Math.min(100, Math.round((usageStats.limits.monthlyUsed / usageStats.limits.monthlyLimit) * 100) || 0);
  
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
  
  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Usage Analytics</CardTitle>
        <CardDescription>
          Track your token usage over time
        </CardDescription>
        <TabsList className="mt-2">
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
        {tokenHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No token usage data available for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Usage vs Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {usageStats.limits.dailyUsed} / {usageStats.limits.dailyLimit} chats used
                    </span>
                    <span>{usageStats.limits.dailyRemaining} remaining</span>
                  </div>
                </CardContent>
              </Card>
              
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
                      {formatNumber(usageStats.limits.monthlyUsed)} / {formatNumber(usageStats.limits.monthlyLimit)} tokens
                    </span>
                    <span>{formatNumber(usageStats.limits.monthlyRemaining)} remaining</span>
                  </div>
                </CardContent>
              </Card>
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
            
            {/* Line chart for token usage over time */}
            <div>
              <h3 className="text-lg font-medium mb-4">Token Usage Trend</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
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
            
            {/* Bar chart for token usage by day */}
            <div>
              <h3 className="text-lg font-medium mb-4">Token Usage by Day</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
                    <Bar 
                      name="Prompt Tokens" 
                      dataKey="promptTokens" 
                      stackId="a" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      name="Completion Tokens" 
                      dataKey="completionTokens" 
                      stackId="a" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie chart for usage by chat type */}
              <div>
                <h3 className="text-lg font-medium mb-4">Token Usage by Chat Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatNumber(value)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Pie chart for usage by model */}
              <div>
                <h3 className="text-lg font-medium mb-4">Token Usage by Model</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelPieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {modelPieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatNumber(value)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Summary stats */}
            <div>
              <h3 className="text-lg font-medium mb-4">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-gray-500">Prompt Tokens</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(aggregatedStats.lifetime.promptTokens)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-500">Completion Tokens</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(aggregatedStats.lifetime.completionTokens)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md col-span-2 md:col-span-4">
                  <p className="text-sm text-gray-500">Average Tokens per Chat</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(
                      aggregatedStats.lifetime.count > 0
                        ? Math.round(aggregatedStats.lifetime.totalTokens / aggregatedStats.lifetime.count)
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Recent usage table */}
            <div>
              <h3 className="text-lg font-medium mb-4">Recent Usage</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Model</th>
                      <th className="px-4 py-2 text-right">Prompt</th>
                      <th className="px-4 py-2 text-right">Completion</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenHistory.slice(0, 10).map((record, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {record.chatType || 'Other'}
                        </td>
                        <td className="px-4 py-2">
                          {record.model || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(record.promptTokens)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(record.completionTokens)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatNumber(record.totalTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenUsageAnalytics;