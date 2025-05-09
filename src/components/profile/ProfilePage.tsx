// src/components/profile/ProfilePage.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserProfile } from '@/utils/userProfileService';
import { useSubscription } from '@/utils/subscriptionService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import EmotionProfileSettings from './EmotionProfileSettings';
import TTSFeatureCard from '@/components/auth/cards/TTSFeatureCard';
import ThemeSettingsCard from '@/components/auth/cards/ThemeSettingsCard';
import PersonalInfoCard from '@/components/auth/cards/PersonalInfoCard';
import SubscriptionDetailsCard from '@/components/cards/SubscriptionDetailsCard';
import { UserProfileData } from '@/types/UserProfileData';
import { auth } from '@/utils/firebaseClient';

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscription } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }
    
    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await fetchUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfileData>) => {
    try {
      // This would normally call updateUserProfile, but
      // we'll just update the local state for demonstration
      setUserProfile(prev => prev ? { ...prev, ...updates } : prev);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/');
    });
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!userProfile) {
    return <div className="text-center py-10">Unable to load profile data</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          <EmotionProfileSettings />
          
          {subscription.tier !== 'free' && (
            <TTSFeatureCard 
              user={userProfile} 
              onUpdate={handleProfileUpdate}
            />
          )}
          
          <ThemeSettingsCard 
            user={userProfile} 
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionDetailsCard />
          
          <Card>
            <CardHeader>
              <CardTitle>Subscription Features</CardTitle>
              <CardDescription>Features available on your current plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Free Plan</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li className={subscription.tier === 'free' ? 'text-primary font-medium' : ''}>10 daily chats</li>
                    <li className={subscription.tier === 'free' ? 'text-primary font-medium' : ''}>Basic mood tracking</li>
                    <li className={subscription.tier === 'free' ? 'text-primary font-medium' : ''}>50 journal entries</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Plus Plan</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li className={subscription.tier === 'plus' ? 'text-primary font-medium' : ''}>30 daily chats</li>
                    <li className={subscription.tier === 'plus' ? 'text-primary font-medium' : ''}>Enhanced mood tracking</li>
                    <li className={subscription.tier === 'plus' ? 'text-primary font-medium' : ''}>Text-to-Speech</li>
                    <li className={subscription.tier === 'plus' ? 'text-primary font-medium' : ''}>500 journal entries</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Pro Plan</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li className={subscription.tier === 'pro' ? 'text-primary font-medium' : ''}>Unlimited daily chats</li>
                    <li className={subscription.tier === 'pro' ? 'text-primary font-medium' : ''}>Advanced AI insights</li>
                    <li className={subscription.tier === 'pro' ? 'text-primary font-medium' : ''}>Advanced Text-to-Speech</li>
                    <li className={subscription.tier === 'pro' ? 'text-primary font-medium' : ''}>Unlimited journal entries</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6">
          <PersonalInfoCard user={userProfile} />
          
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Button variant="outline" onClick={() => router.push('/Journal')}>
                  View Journal History
                </Button>
                <Button variant="outline" onClick={() => router.push('/settings/security')}>
                  Security Settings
                </Button>
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;