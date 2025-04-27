// src/app/authorize-device/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { generateDeviceSecret, encryptDeviceSecret } from '@/utils/encryption';

const AuthorizeDevicePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deviceAuthorized, setDeviceAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authorizeDevice = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('No user signed in');
        }

        const userPreferencesRef = doc(db, 'users', user.uid, 'preferences', 'security');
        const userPrefSnap = await getDoc(userPreferencesRef);

        if (!userPrefSnap.exists()) {
          throw new Error('User preferences not found');
        }

        const userPrefs = userPrefSnap.data();
        const storedPassPhraseHash = userPrefs.passPhrase;

        if (!storedPassPhraseHash) {
          throw new Error('No passphrase stored for this user');
        }

        // Check if device is already authorized
        const deviceId = localStorage.getItem('bubbaDeviceId');
        if (deviceId) {
          console.log("✅ Device already authorized locally:", deviceId);
          setDeviceAuthorized(true);
          setLoading(false);
          router.push('/profile');
          return;
        }

        // 🔥 New device flow
        const newDeviceSecret = generateDeviceSecret();

        // Encrypt deviceSecret using stored passPhrase hash (even better, ask for passPhrase if stronger)
        const encryptedDeviceSecret = encryptDeviceSecret(newDeviceSecret, storedPassPhraseHash);

        const deviceCollectionRef = doc(db, 'users', user.uid, 'devices', newDeviceSecret);
        await setDoc(deviceCollectionRef, {
          createdAt: new Date().toISOString(),
          deviceName: navigator.userAgent,
          encryptedDeviceSecret,
        });

        console.log("✅ Device authorized and saved.");

        // Save locally
        localStorage.setItem('bubbaDeviceId', newDeviceSecret);
        localStorage.setItem('bubbaDeviceName', navigator.userAgent);

        setDeviceAuthorized(true);
        router.push('/profile');
      } catch (error: any) {
        console.error(error);
        setError(error.message || 'Failed to authorize device.');
        setLoading(false);
      }
    };

    authorizeDevice();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl">
        Authorizing device... ⏳
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-2xl text-red-500 mb-4">⚠️ Authorization Failed</h1>
        <p>{error}</p>
        <button onClick={() => router.push('/login')} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen text-xl">
      Device Authorized ✅ Redirecting...
    </div>
  );
};

export default AuthorizeDevicePage;
