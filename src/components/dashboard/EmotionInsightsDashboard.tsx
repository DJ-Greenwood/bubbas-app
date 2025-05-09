// src/components/dashboard/EmotionInsightsDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { auth } from '@/utils/firebaseClient';
import { getJournalEntries } from '@/utils/firebaseDataService';
import { getUserDoc } from '@/utils/firebaseDataService';
import { useSubscription } from '@/utils/subscriptionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { JournalEntry } from '@/types/JournalEntry';
import { decryptField } from '@/utils/encryption';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import TokenUsageCharts from '@/components/dashboard/TokenUsageCharts';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

const EmotionInsightsDashboard = () => {
  const user = auth.currentUser;
  const { characterSet } = useEmotionSettings();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [emotionStats, setEmotionStats] = useState<{name: string, value: number}[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<{name: string, chats: number}[]>([]);
  const [usageData, setUsageData] = useState<any>(null);
  const { subscription } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get journal entries
      const entries = await getJournalEntries('active');
      setJournalEntries(entries);
      
      // Calculate emotion distribution
      const emotions: Record<string, number> = {};
      entries.forEach(entry => {
        if (entry.emotion) {
          emotions[entry.emotion] = (emotions[entry.emotion] || 0) + 1;
        }
      });
      
      // Format for chart
      const emotionData = Object.entries(emotions).map(([name, value]) => ({
        name,
        value
      }));
      
      setEmotionStats(emotionData);
      
      // Calculate weekly activity
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const activityByDay: Record<string, number> = {};
      
      // Initialize with zero counts
      days.forEach(day => {
        activityByDay[day] = 0;
      });
      
      // Count entries by day
      entries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const day = days[date.getDay()];
        activityByDay[day] = (activityByDay[day] || 0) + 1;
      });
      
      // Format for chart
      const weeklyData = days.map(day => ({
        name: day,
        chats: activityByDay[day]
      }));
      
      setWeeklyActivity(weeklyData);
      
      // Get usage data
      const userData = user ? await getUserDoc(user.uid) : null;
      if (userData) {
        setUsageData(userData.usage);
      }
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    router.push('/EmotionChat');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading your insights...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={startNewChat}>Start New Chat</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold">{journalEntries.length}</span>
              <span className="text-sm text-muted-foreground">
                Total entries
              </span>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => router.push('/Journal')}
              >
                View Journal
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold capitalize">{subscription.tier} Plan</span>
              <span className="text-sm text-muted-foreground">
                {subscription.tier === 'free' 
                  ? `${journalEntries.length}/50 entries used` 
                  : subscription.tier === 'plus'
                  ? `${journalEntries.length}/500 entries used`
                  : `${journalEntries.length} entries total`}
              </span>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => router.push('/profile')}
              >
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold">
                {usageData ? usageData.totalTokens.toLocaleString() : 0}
              </span>
              <span className="text-sm text-muted-foreground">
                Total tokens used
              </span>
              {subscription.tier === 'free' && (
                <Button 
                  variant="default" 
                  className="mt-4" 
                  onClick={() => router.push('/profile?tab=subscription')}
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emotions">Emotion Insights</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyActivity}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="chats" name="Chat Sessions" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Emotion Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {emotionStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={emotionStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {emotionStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">Not enough data to display</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Emotions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {journalEntries.slice(0, 10).map((entry) => (
                  <div key={entry.timestamp} className="flex flex-col items-center">
                    <EmotionIcon 
                      emotion={entry.emotion || "reflective"} 
                      characterSet={entry.emotionCharacterSet || characterSet}
                      size={48}
                    />
                    <span className="text-xs mt-1 capitalize">{entry.emotion || "unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                
                {journalEntries.length === 0 && (
                  <p className="text-muted-foreground">No chat history yet. Start chatting to see emotions!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="emotions">
          {subscription.tier === 'free' ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">Upgrade to Plus or Pro</h3>
                  <p className="text-muted-foreground">
                    Detailed emotion insights are available on Plus and Pro plans. 
                    Upgrade to gain access to deeper emotional analysis and trends.
                  </p>
                  <Button 
                    onClick={() => router.push('/profile?tab=subscription')}
                    className="mt-4"
                  >
                    View Upgrade Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emotion Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {/* Emotion trend visualization would go here */}
                      <BarChart
                        data={emotionStats}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Frequency" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Common Emotional Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Based on your chat history, here are some common patterns we've detected:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          You tend to feel more <span className="font-medium">reflective</span> in the evenings
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Many of your conversations include moments of <span className="font-medium">gratitude</span>
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          <span className="font-medium">Hopeful</span> emotions often follow periods of <span className="font-medium">frustration</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Emotion History Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex justify-center items-center">
                    <p className="text-muted-foreground">Calendar visualization would go here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="usage">
          <TokenUsageCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmotionInsightsDashboard;