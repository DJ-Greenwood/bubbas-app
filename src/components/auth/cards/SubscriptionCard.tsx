'use client';
import React from 'react';
import { UserProfileData } from '@/types/UserProfileData';
import { parseFirestoreDate } from '../../../utils/parseDate';

const SubscriptionCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Subscription</h2>
    <p className="text-gray-700"><strong>Tier:</strong> {user.subscription.tier}</p>
    <p className="text-gray-700"><strong>Activation Date:</strong> {parseFirestoreDate(user.subscription.activationDate).toLocaleDateString()}</p>
    <p className="text-gray-700"><strong>Expiration Date:</strong> {
      user.subscription.expirationDate 
        ? parseFirestoreDate(user.subscription.expirationDate).toLocaleDateString() 
        : 'No expiration date'
    }</p>
  </div>
);

export default SubscriptionCard;