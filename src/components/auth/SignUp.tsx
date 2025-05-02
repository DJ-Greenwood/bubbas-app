'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import '../../../public/assets/css/globals.css';
import { createNewUserProfile } from '@/utils/userProfileService'; // ✅ Correct import
import { setUserUID } from '@/utils/encryption'; // ✅ Correct import

const SignUpComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedEmail = email.trim();
  const trimmedPass = password.trim();
  const trimmedPassphrase = passphrase.trim();


  const handleSignUp = async () => {
    setError(null);
  
    if (!email || !password || !passphrase) {
      setError('Please fill in all fields.');
      return;
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPass);

      const user = userCredential.user;
  
      if (!user) {
        throw new Error('User not authenticated after sign-up.');
      }
  
      setUserUID(user.uid); // <-- ✅ Add this line here
  
      await createNewUserProfile(user.uid, trimmedEmail, trimmedPassphrase);
  
      console.log('✅ User signed up and profile created successfully');
      router.push('/profile');
    } catch (error: any) {
      console.error('Sign-up error:', error);
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
        <img src="/assets/images/emotions/Bubba/default.jpg" alt="Bubba AI" className="w-20 h-20 object-cover rounded" />
        {new Date().getHours() < 12 ? "Good morning" : "Good evening"}!
      </h2>

      {error && <div className="text-red-500 mb-2">⚠️ {error}</div>}

      <form onSubmit={handleNext} className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <p>It's Bubba. Let's get you signed up!</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border p-2 rounded"
            />
          </>
        )}
        {step === 1 && (
          <>
            <p>And your secret password? (Bubba promises not to tell!)</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border p-2 rounded"
              autoFocus
            />
          </>
        )}
        {step === 2 && (
          <>
            <p>Now create a secret passphrase.</p>
            <p>It will be used to encrypt your data. You don't need to remember it, I won't either!</p>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              className="border p-2 rounded"
              autoFocus
            />
          </>
        )}
        {step === 3 && (
          <>
            <p>Here are the terms of service for Bubbas.AI</p>
            <p>By checking the box you agree to accept and follow:</p>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Terms of Service
            </a>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                autoFocus
              />
              Accept Terms
            </label>
          </>
        )}

        <div className="flex gap-4">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {step === 3 ? 'Sign Up' : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignUpComponent;
