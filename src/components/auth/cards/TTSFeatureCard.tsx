'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';

const TTSFeatureCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Text to Speech (TTS)</h2>
    <p className="text-gray-700">Listen to Bubba read your journal entries aloud.</p>
  </div>
);

export default TTSFeatureCard;
