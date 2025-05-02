// src/components/dashboard/TokenUsageCharts.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { getTokenUsageHistory } from '@/utils/tokenPersistenceService';
import { useSubscription } from '@/utils/subscriptionService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

const TokenUsageCharts = () => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [usageData, setUsageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription } = useSubscription();

  useEffect(() => {
    const loadUsageData = async () => {
      setLoading(true);
      try {
        const data = await getTokenUsageHistory(timeframe);
        
        // Group by day for time-series data
        const groupedByDay: Record<string, {
          date: string;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          count: number;
        }> = {};
        
        data.forEach(record => {
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
      } catch (error) {
        console.error('Error loading usage data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUsageData();
  }, [timeframe]);

  // Group by chat type for pie chart
  const chatTypeData = React.useMemo(() => {
    const types: Record<string, { name: string, value: number }> = {};
    
    usageData.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== 'date' && key !== 'totalTokens' && key !== 'count') {
          if (!types[key]) {
            types[key] = { name: key, value: 0 };
          }
          types[key].value += day[key];
        }
      });
    });
    
    return Object.values(types);
  }, [usageData]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate usage limits based on subscription
  const usageLimits = {
    monthlyTokens: subscription.tier === 'free' ? 10000 : 
                   subscription.tier === 'plus' ? 50000 : 200000,
    dailyChats: subscription.tier === 'free' ? 10 : 
                subscription.tier === 'plus' ? 30 : 100,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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
                    formatter={(value: number) => value.toLocaleString()}
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
                      data={[
                        { name: 'Prompt', value: usageData.reduce((sum, day) => sum + day.promptTokens, 0) },
                        { name: 'Completion', value: usageData.reduce((sum, day) => sum + day.completionTokens, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Prompt', value: usageData.reduce((sum, day) => sum + day.promptTokens, 0) },
                        { name: 'Completion', value: usageData.reduce((sum, day) => sum + day.completionTokens, 0) }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
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
                      formatter={(value: number) => value.toLocaleString()}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Chats" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
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
                      className="h-full bg-primary"
                      style={{ 
                        width: `${Math.min(100, (usageData.reduce((sum, day) => sum + day.totalTokens, 0) / usageLimits.monthlyTokens) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                    <span>
                      {usageData.reduce((sum, day) => sum + day.totalTokens, 0).toLocaleString()} tokens used
                    </span>
                    <span>{usageLimits.monthlyTokens.toLocaleString()} limit</span>
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
                      className="h-full bg-primary"
                      style={{ 
                        width: `${Math.min(100, (usageData[usageData.length - 1]?.count || 0) / usageLimits.dailyChats * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                    <span>
                      {usageData[usageData.length - 1]?.count || 0} chats today
                    </span>
                    <span>{usageLimits.dailyChats} limit</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenUsageCharts;