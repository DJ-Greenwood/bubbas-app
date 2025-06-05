// src/app/profile/page.tsx
// This is a Next.js page component for the User Profile feature.
// This page allows users to view and edit their profile information.

import UserProfile from '@/components/auth/UserProfile';
import UpdatedUserProfile from '@/components/auth/UpdatedUserProfile';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';

const ProfilePage = () => {
  // Placeholder user data - replace with actual data fetching
  const userData = {
    email: 'test@example.com',
    username: 'JohnDoe',
    phoneNumber: '123-456-7890',
    createdAt: new Date().toISOString(),
    agreedTo: {
      terms: new Date().toISOString(),
      privacy: new Date().toISOString(),
      ethics: new Date().toISOString(),
    },
    preferences: {
      tone: 'friendly',
      theme: 'light',
      startPage: 'journal',
    },
    usage: {
      tokens: {
        lifetime: 1000,
        monthly: {
          [new Date().getMonth()]: 200,
        },
      },
      voiceChars: {
        tts: {
          lifetime: 5000,
          monthly: {
            [new Date().getMonth()]: 1000,
          },
        },
        stt: {
          lifetime: 2000,
          monthly: {
            [new Date().getMonth()]: 500,
          },
        },
      },
    },
    subscription: {
      tier: 'premium',
      activationDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    features: {
      memory: true,
      tts: true,
      stt: true,
      emotionalInsights: true,
    },
  };

  return (
    <RequireAuth>
      <div>
          <UpdatedUserProfile />
      </div>
    </RequireAuth>
  );
};

export default ProfilePage;