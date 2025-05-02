'use client';
import React from 'react';
import { UserProfileData } from '@/types/UserProfileData';

const EmotionalInsightsCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Emotional Insights</h2>
    <p className="text-gray-700">Access to emotional sentiment analysis and journal trend visualization.</p>
  </div>
);

export default EmotionalInsightsCard;
