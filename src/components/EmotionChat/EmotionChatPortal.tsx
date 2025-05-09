// src/components/EmotionChatPortal.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import UpdatedEmotionChatPersist from '@/components/EmotionChat/UpdatedEmotionChatPersist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle, BarChart, MessageSquare } from 'lucide-react';
import EmotionInsightsDashboard from '@/components/dashboard/EmotionInsightsDashboard';
import EmotionProfileSettings from '@/components/profile/EmotionProfileSettings';
import { useAuth } from '@/hooks/useAuth';

const EmotionChatPortal = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Sign In Required</h2>
              <p className="text-muted-foreground">
                You need to sign in to access the Bubba AI chat portal.
              </p>
              <Button onClick={() => router.push('/auth')}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Bubba AI Portal</h1>
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="chat">
          <UpdatedEmotionChatPersist />
        </TabsContent>
        
        <TabsContent value="dashboard">
          <EmotionInsightsDashboard />
        </TabsContent>
        
        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <EmotionProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmotionChatPortal;