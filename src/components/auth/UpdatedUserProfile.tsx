'use client';

import React, { useState, useEffect } from 'react';
import { UserProfileData } from '@/types/UserProfileData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';
import { useToast } from '@/hooks/use-toast';
import { getUserDoc, updateUserDoc } from '@/utils/firebaseDataService';

// Import modular cards
import PersonalInfoCard from './cards/PersonalInfoCard';
import AgreementsCard from './cards/AgreementsCard';
import PreferencesCard from './cards/PreferencesCard';
import SubscriptionDetailsCard from '../../components/cards/SubscriptionDetailsCard';
import UsageStatsCard from '../../components/cards/UsageStatsCard';
import EmotionalInsightsCard from './cards/EmotionalInsightsCard';
import MemoryFeatureCard from './cards/MemoryFeatureCard';
import STTFeatureCard from './cards/STTFeatureCard';
import ThemeSettingsCard from './cards/ThemeSettingsCard';
import { useSubscription } from '@/utils/subscriptionService';

const UpdatedUserProfileService = () => {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUID(user.uid);
        loadProfile(user.uid);
      } else {
        setLoading(false);
        setError('Not authenticated');
      }
    });
    return () => unsubscribe();
  }, []);
  
  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const profile = await getUserDoc(userId);
      if (profile) {
        setUserProfile(profile as UserProfileData);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(`Failed to load profile: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Error",
        description: "Failed to load your profile data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfileData>) => {
    try {
      if (!userProfile) {
        setError('No profile to update');
        return;
      }
      
      const user = auth.currentUser;
      if (!user) {
        setError('Not authenticated');
        return;
      }
      
      // Update user document
      await updateUserDoc(user.uid, updates);
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...updates } : prev);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Error",
        description: "Failed to update your profile.",
        variant: "destructive"
      });
    }
  };

  if (loading) return <div className="text-center mt-20">Loading profile...</div>;
  if (error) return <div className="text-center mt-20 text-red-500">Error: {error}</div>;
  if (!userProfile) return <div className="text-center mt-20">Profile not found.</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Profile</h1>
        
        <Tabs defaultValue="account" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>
          
          {/* Account Settings Section */}
          <TabsContent value="account" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PersonalInfoCard user={userProfile} />
              <AgreementsCard user={userProfile} />
              <PreferencesCard user={userProfile} onUpdate={handleProfileUpdate} />
              <ThemeSettingsCard user={userProfile} onUpdate={handleProfileUpdate} />
            </div>
          </TabsContent>
          
          <TabsContent value="subscription" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SubscriptionDetailsCard />
              <UsageStatsCard />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Subscription Benefits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Free Tier</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>10 chats per day</li>
                    <li>10,000 tokens per month</li>
                    <li>Basic mood tracking</li>
                    <li>Limited journal entries (50)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Plus Tier</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>30 chats per day</li>
                    <li>50,000 tokens per month</li>
                    <li>Enhanced mood tracking</li>
                    <li>Cross-device sync</li>
                    <li>500 journal entries</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Pro Tier</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>100 chats per day</li>
                    <li>200,000 tokens per month</li>
                    <li>Advanced AI insights</li>
                    <li>Unlimited journal entries</li>
                    <li>All premium features</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProfile.features.emotionalInsights && <EmotionalInsightsCard user={userProfile} />}
              {userProfile.features.memory && <MemoryFeatureCard user={userProfile} />}
              {userProfile.features.stt && <STTFeatureCard user={userProfile} />}
              
              {/* Add feature availability based on subscription */}
              {subscription.tier !== 'free' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold mb-4">Cross-Device Sync</h2>
                  <p className="text-gray-700">Your journal entries and preferences are automatically synced across all your devices.</p>
                </div>
              )}
              
              {subscription.tier === 'pro' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold mb-4">Advanced AI Insights</h2>
                  <p className="text-gray-700">Get deeper emotional analysis and personalized long-term trends from your journaling history.</p>
                </div>
              )}
            </div>
            
            {subscription.tier === 'free' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Unlock More Features</h3>
                <p className="text-blue-700 mb-4">
                  Upgrade to Plus or Pro to access premium features like cross-device syncing, 
                  advanced AI insights, and higher usage limits.
                </p>
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => window.location.href = '/subscription'}
                >
                  View Plans
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UpdatedUserProfileService;