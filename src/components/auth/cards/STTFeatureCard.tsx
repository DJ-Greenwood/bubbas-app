'use client';
import React from 'react';
import { UserProfileData } from '@/types/UserProfileData';

const STTFeatureCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Speech to Text (STT)</h2>
    <p className="text-gray-700">Dictate your thoughts directly into Bubba using speech recognition.</p>
  </div>
);

export default STTFeatureCard;
