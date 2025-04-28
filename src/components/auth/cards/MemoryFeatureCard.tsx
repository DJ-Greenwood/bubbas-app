'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';

const MemoryFeatureCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Memory Feature</h2>
    <p className="text-gray-700">Bubba can remember your past reflections to better support you over time.</p>
  </div>
);

export default MemoryFeatureCard;
