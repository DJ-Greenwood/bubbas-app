// src/app/authorize-device/page.tsx
// This is a Next.js page component for authorizing a device.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { generateDeviceSecret, encryptDeviceSecret } from '@/utils/encryption';

const AuthorizeDevicePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deviceAuthorized, setDeviceAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("No user signed in");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          throw new Error('User document not found');
        }

        const userData = userSnap.data();
        const passPhrase = userData?.preferences?.security?.passPhrase;
        
        if (!passPhrase) {
          throw new Error('No passphrase stored in user preferences');
        }

        const deviceId = localStorage.getItem('bubbaDeviceId');
        if (deviceId) {
          console.log("✅ Device already authorized locally:", deviceId);
          setDeviceAuthorized(true);
          setLoading(false);
          router.push('/profile');
          return;
        }

        const newDeviceSecret = generateDeviceSecret();
        const encryptedDeviceSecret = encryptDeviceSecret(newDeviceSecret, passPhrase);

        const deviceCollectionRef = doc(db, 'users', user.uid, 'devices', newDeviceSecret);
        await setDoc(deviceCollectionRef, {
          createdAt: new Date().toISOString(),
          deviceName: navigator.userAgent,
          encryptedDeviceSecret,
        });

        localStorage.setItem('bubbaDeviceId', newDeviceSecret);
        localStorage.setItem('bubbaDeviceName', navigator.userAgent);

        console.log("✅ Device authorized and saved.");
        setDeviceAuthorized(true);
        router.push('/profile');
      } catch (error: any) {
        console.error(error);
        setError(error.message || 'Failed to authorize device.');
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Clean up listener
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
        <button
          onClick={() => router.push('/auth')}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
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
