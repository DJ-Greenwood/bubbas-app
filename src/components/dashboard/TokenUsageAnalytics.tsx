'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTokenUsageHistory, getAggregatedTokenStats, TokenRecord } from '@/utils/tokenPersistenceService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

  useEffect(() => {
    const loadTokenHistory = async () => {
      try {
        setLoading(true);
        const history = await getTokenUsageHistory(timeframe);
        setTokenHistory(history);
        
        const stats = await getAggregatedTokenStats();
        setAggregatedStats(stats);
        
        setError(null);
      } catch (err: any) {
        console.error('Error loading token history:', err);
        setError(err.message || 'Failed to load token usage data');
      } finally {
        setLoading(false);
      }
    };
    
    loadTokenHistory();
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
  
  const barChartData = prepareBarChartData();
  const pieChartData = preparePieChartData();
  
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
            {/* Bar chart for token usage over time */}
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
              
              {/* Summary stats */}
              <div>
                <h3 className="text-lg font-medium mb-4">Summary Statistics</h3>
                <div className="space-y-4">
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
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
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