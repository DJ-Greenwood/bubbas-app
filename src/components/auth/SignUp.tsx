'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import '../../../public/assets/css/globals.css';
import CryptoJS from "crypto-js";
import { setUserUID } from '@/utils/encryption';

const SignUpComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getKey = (passPhrase: string): string => {
    return CryptoJS.SHA256(passPhrase).toString();
  };

  const handleSignUp = async () => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);

      const db = getFirestore();
      const user = auth.currentUser;

      if (user) {
        const preferencesRef = doc(db, 'users', user.uid, 'preferences', 'security');
        await setDoc(preferencesRef, {
          passPhrase: getKey(passphrase),
        });
      } else {
        throw new Error('User not authenticated');
      }
      
      if( !user) {
        throw new Error('User not authenticated');
      }
      setUserUID(user.uid);
      console.log('✅ User signed up successfully');

      router.push('/profile');
    } catch (error: any) {
      setError(error.message || 'Sign-up failed');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 3) {
      if (!termsAccepted) {
        setError('Please accept the terms to continue.');
        return;
      }
      if (!passphrase || passphrase.length < 4) {
        setError('Please create a passphrase with at least 4 characters.');
        return;
      }
      await handleSignUp();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="emotion-chat-container max-w-xl mx-auto mt-10 p-6 rounded shadow-md bg-white">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <img src="/assets/images/emotions/default.jpg" alt="Bubba AI" className="w-12 h-12 rounded" />
        Bubba’s Welcome Chat
      </h2>

      {error && <div className="text-red-500 mb-2">⚠️ {error}</div>}

      <form onSubmit={handleNext} className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <p>What's your email?</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border p-2 rounded" />
          </>
        )}
        {step === 1 && (
          <>
            <p>Create a password:</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border p-2 rounded" />
          </>
        )}
        {step === 2 && (
          <>
            <p>Create a secret passphrase:</p>
            <input type="text" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required className="border p-2 rounded" />
          </>
        )}
        {step === 3 && (
          <>
            <p>Accept the terms:</p>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              Accept Terms
            </label>
          </>
        )}

        <div className="flex gap-4">
          {step > 0 && (
            <button type="button" onClick={handleBack} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
              ← Back
            </button>
          )}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {step === 3 ? 'Sign Up' : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignUpComponent;
