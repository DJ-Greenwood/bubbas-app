'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import '../../../public/assets/css/globals.css';

const SignUpComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (typeof window === 'undefined') return;
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Bubba: New buddy signed up!');

      // Store passphrase in localStorage (not Firestore)
      localStorage.setItem('bubbaPassphrase', passphrase);

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

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md max-w-xl mx-auto mt-10">
      <h2 className="flex items-center gap-3 mb-2">
        <img
          src="/assets/images/emotions/default.jpg"
          alt="Bubba the AI"
          className="w-16 h-16 object-cover rounded"
        />
        <span className="text-xl font-semibold"> Bubba’s Welcome Chat</span>
      </h2>
      <p className="text-gray-600 mb-4">
        I’m so excited you’re here! Let’s get you signed up and wagging. 🐾
      </p>

      {error && (
        <div className="text-red-500 font-medium mb-2">
          ⚠️ Bubba says: {error}
        </div>
      )}

      <form onSubmit={handleNext} className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <p>Yay! A new friend! What’s your email so we can get started?</p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded border mt-1"
              required
            />
            <button
              type="submit"
              className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Next →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <p>Now, let’s set a secret password so only you can visit our hideout 🐾</p>
            <input
              type="password"
              placeholder="Create a password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded border mt-1"
              required
            />
            <button
              type="submit"
              className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Next →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p>
              Can you create a special secret passphrase? 🗝️  
              <br />
              We'll use this to keep your conversations with Bubba extra private.
            </p>
            <input
              type="text"
              placeholder="Create a private passphrase..."
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full p-2 rounded border mt-1"
              required
            />
            <button
              type="submit"
              className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Next →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <p>Last thing! Can you paw-mise to accept the terms before we play?</p>
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 underline">
                Terms of Service
              </Link>
            </label>

            <button
              type="submit"
              className="self-start bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ✅ Click to sign up and continue to Bubbas.AI
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default SignUpComponent;
