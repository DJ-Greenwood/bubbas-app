// src/components/auth/UpdatedUserProfile.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchUserProfile, updateUserProfile } from '@/utils/userProfileService';
import { UserProfileData } from '@/types/UserProfileData';
import { EmotionCharacters, EmotionCharacterKey } from '@/types/emotionCharacters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';
import { onAuthStateChanged } from 'firebase/auth';

// Import emotion icons for preview
import EmotionIcon from '@/components/emotion/EmotionIcon';

const UpdatedUserProfile = () => {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { emotionIconSize, setEmotionIconSize, characterSet, setCharacterSet } = useEmotionSettings();
  const [activeTab, setActiveTab] = useState('account');
  const [previewSize, setPreviewSize] = useState(64);

  // Add debug logging for emotion settings
  const [debugInfo, setDebugInfo] = useState({
    contextCharacterSet: '',
    profileCharacterSet: '',
    emotionIconSize: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUID(user.uid);
        loadProfile();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  const loadProfile = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);
      
      // Set the emotion settings from the profile if available
      if (profile?.preferences) {
        // Convert the profile's character set to a valid EmotionCharacterKey
        const profileCharSet = profile.preferences.emotionCharacterSet?.toLowerCase() as EmotionCharacterKey;
        if (profileCharSet && Object.keys(EmotionCharacters).includes(profileCharSet)) {
          setCharacterSet(profileCharSet);
        }
        
        // Set icon size from profile
        if (profile.preferences.emotionIconSize) {
          const size = parseInt(profile.preferences.emotionIconSize, 10);
          if (!isNaN(size)) {
            setEmotionIconSize(size);
            setPreviewSize(size);
          }
        }
      }
      
      // Debug info
      setDebugInfo({
        contextCharacterSet: characterSet,
        profileCharacterSet: profile?.preferences.emotionCharacterSet || '',
        emotionIconSize: emotionIconSize
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfileData>) => {
    try {
      await updateUserProfile(updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : prev);
      
      // If updating preferences, also update the emotion settings context
      if (updates.preferences) {
        if (updates.preferences.emotionCharacterSet) {
          const charSet = updates.preferences.emotionCharacterSet.toLowerCase() as EmotionCharacterKey;
          setCharacterSet(charSet);
        }
        
        if (updates.preferences.emotionIconSize) {
          const size = parseInt(updates.preferences.emotionIconSize, 10);
          if (!isNaN(size)) {
            setEmotionIconSize(size);
          }
        }
      }
      
      // Reload profile to ensure we have the latest data
      loadProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleCharacterSetChange = (value: string) => {
    const charSet = value as EmotionCharacterKey;
    
    // Update context
    setCharacterSet(charSet);
    
    // Update profile in database
    handleProfileUpdate({
      preferences: {
        ...userProfile!.preferences,
        emotionCharacterSet: EmotionCharacters[charSet].fileName
      }
    });
  };
  
  const handleIconSizeChange = (size: number) => {
    // Update context and preview
    setEmotionIconSize(size);
    setPreviewSize(size);
    
    // Update profile in database
    handleProfileUpdate({
      preferences: {
        ...userProfile!.preferences,
        emotionIconSize: size.toString()
      }
    });
  };
  
  const handleToggleLocalStorage = () => {
    if (!userProfile) return;
    
    const updatedPreference = !userProfile.preferences.localStorageEnabled;
    
    handleProfileUpdate({
      preferences: {
        ...userProfile.preferences,
        localStorageEnabled: updatedPreference
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Profile Not Found</h2>
        <p className="text-gray-600 mb-6">We couldn't find your profile information.</p>
        <Button onClick={loadProfile}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-8 px-6 text-white">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-white">
                <AvatarImage src="/assets/images/emotions/Bubba/joyful.jpg" alt="Profile" />
                <AvatarFallback>
                  {userProfile.preferences.username?.[0] || userProfile.email[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {userProfile.preferences.username || 'Bubba Friend'}
                </h1>
                <p className="opacity-90">{userProfile.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="bg-white/20 text-white text-xs font-medium px-2.5 py-0.5 rounded">
                    {userProfile.subscription.tier.charAt(0).toUpperCase() + userProfile.subscription.tier.slice(1)} Plan
                  </span>
                  <span className="bg-white/20 text-white text-xs font-medium px-2.5 py-0.5 rounded">
                    Member since {new Date(userProfile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Debug Info - Context character set: {debugInfo.contextCharacterSet}, 
                    Profile character set: {debugInfo.profileCharacterSet},
                    Emotion icon size: {debugInfo.emotionIconSize}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="account" className="p-6" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
            </TabsList>
            
            {/* Account Tab */}
            <TabsContent value="account">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={userProfile.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={userProfile.preferences.username || ''}
                        onChange={(e) => {
                          const username = e.target.value;
                          handleProfileUpdate({
                            preferences: {
                              ...userProfile.preferences,
                              username
                            }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={userProfile.preferences.phoneNumber || ''}
                        onChange={(e) => {
                          const phoneNumber = e.target.value;
                          handleProfileUpdate({
                            preferences: {
                              ...userProfile.preferences,
                              phoneNumber
                            }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy & Storage</CardTitle>
                    <CardDescription>Manage your data preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Local Storage</h3>
                        <p className="text-sm text-gray-500">Save encrypted journal entries locally</p>
                      </div>
                      <Switch
                        checked={userProfile.preferences.localStorageEnabled ?? false}
                        onCheckedChange={handleToggleLocalStorage}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Emotion Icons</CardTitle>
                    <CardDescription>Customize how emotions appear</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Character Set</label>
                        <select
                          value={characterSet}
                          onChange={(e) => handleCharacterSetChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {Object.entries(EmotionCharacters).map(([key, { displayName }]) => (
                            <option key={key} value={key}>
                              {displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon Size: {previewSize}px</label>
                        <input
                          type="range"
                          min={32}
                          max={128}
                          step={8}
                          value={previewSize}
                          onChange={(e) => handleIconSizeChange(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>See how emotions will display in chat</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {['joyful', 'peaceful', 'reflective', 'hopeful', 'sad', 'frustrated'].map((emotion) => (
                        <div key={emotion} className="flex flex-col items-center">
                          <EmotionIcon 
                            emotion={emotion as any} 
                            characterSet={characterSet}
                            size={previewSize}
                          />
                          <span className="mt-2 text-sm capitalize">{emotion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Manage your subscription</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg capitalize">{userProfile.subscription.tier} Plan</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {userProfile.subscription.tier === 'free' 
                          ? 'Basic access with limited features' 
                          : userProfile.subscription.tier === 'plus'
                          ? 'Enhanced features with more access'
                          : 'Full access to all premium features'}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span>Active since: {new Date(userProfile.subscription.activationDate).toLocaleDateString()}</span>
                        {userProfile.subscription.tier !== 'free' && (
                          <span>Renews: {new Date(userProfile.subscription.expirationDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button className="w-full" variant={userProfile.subscription.tier === 'pro' ? "outline" : "default"}>
                      {userProfile.subscription.tier === 'pro' 
                        ? 'Manage Subscription' 
                        : 'Upgrade Plan'}
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Features</CardTitle>
                    <CardDescription>Features enabled on your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                          </svg>
                        </span>
                        <div>
                          <span className="font-medium">Memory</span>
                          <p className="text-sm text-gray-500">Bubba remembers your past conversations</p>
                        </div>
                      </li>
                      {userProfile.features.emotionalInsights && (
                        <li className="flex items-start">
                          <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                            </svg>
                          </span>
                          <div>
                            <span className="font-medium">Emotional Insights</span>
                            <p className="text-sm text-gray-500">Advanced emotional sentiment analysis</p>
                          </div>
                        </li>
                      )}
                      {userProfile.features.tts && (
                        <li className="flex items-start">
                          <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                            </svg>
                          </span>
                          <div>
                            <span className="font-medium">Text to Speech</span>
                            <p className="text-sm text-gray-500">Listen to Bubba read entries aloud</p>
                          </div>
                        </li>
                      )}
                      {userProfile.features.stt && (
                        <li className="flex items-start">
                          <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                            </svg>
                          </span>
                          <div>
                            <span className="font-medium">Speech to Text</span>
                            <p className="text-sm text-gray-500">Dictate your thoughts to Bubba</p>
                          </div>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UpdatedUserProfile;