// src/components/profile/EmotionProfileSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { fetchUserProfile, updateUserProfile } from '@/utils/userProfileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmotionCharacters, EmotionCharacterKey } from '@/types/emotionCharacters';
import { UserProfileData } from '@/types/UserProfileData';
import EmotionIcon from '@/components/emotion/EmotionIcon';

const EmotionProfileSettings = () => {
  const { emotionIconSize, setEmotionIconSize, characterSet, setCharacterSet } = useEmotionSettings();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSize, setPreviewSize] = useState(emotionIconSize);
  const [selectedSet, setSelectedSet] = useState<EmotionCharacterKey>(characterSet);
  const { toast } = useToast();
  const emotions = ["joyful", "peaceful", "tired", "nervous", "frustrated", "grateful"];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await fetchUserProfile();
        if (profile) {
          setUserProfile(profile);
          // Initialize states from profile if available
          if (profile.preferences.emotionIconSize) {
            setPreviewSize(profile.preferences.emotionIconSize);
          }
          if (profile.preferences.emotionCharacterSet) {
            setSelectedSet(profile.preferences.emotionCharacterSet as EmotionCharacterKey);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [toast]);

  const handleSaveChanges = async () => {
    try {
      if (!userProfile) return;
      
      // Update both context and profile
      setEmotionIconSize(previewSize);
      setCharacterSet(selectedSet);
      
      await updateUserProfile({
        preferences: {
          ...userProfile.preferences,
          emotionIconSize: previewSize,
          emotionCharacterSet: selectedSet
        }
      });
      
      toast({
        title: "Settings Saved",
        description: "Your emotion settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save your settings.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading your settings...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Emotion Display Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Character Set</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Choose which character set Bubba uses for emotions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(EmotionCharacters)
                .filter(([key]) => /^[A-Z]/.test(key)) // Filter keys with a capital first letter
                .map(([key, { displayName }]) => (
                  <div 
                    key={key}
                    onClick={() => setSelectedSet(key as EmotionCharacterKey)}
                    className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSet === key ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <EmotionIcon 
                      emotion="joyful" 
                      characterSet={key as EmotionCharacterKey}
                      size={64}
                    />
                    <span className="mt-2 text-sm font-medium">{displayName}</span>
                  </div>
                ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-base font-medium">Icon Size: {previewSize}px</Label>
            <Slider
              min={32}
              max={128}
              step={8}
              value={[previewSize]}
              onValueChange={(values) => setPreviewSize(values[0])}
              className="w-full"
            />
          </div>
          
          <div>
            <Label className="text-base font-medium">Preview</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-2">
              {emotions.map((emotion) => (
                <div key={emotion} className="flex flex-col items-center">
                  <EmotionIcon 
                    emotion={emotion as any} 
                    characterSet={selectedSet}
                    size={previewSize}
                  />
                  <span className="mt-1 text-xs capitalize">{emotion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionProfileSettings;