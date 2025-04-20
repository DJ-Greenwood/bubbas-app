import { useState } from 'react';
import { auth } from '../../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

const SignUp = () => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('User signed up successfully!');
    } catch (error: any) {
      setError(error.message || 'Sign-up failed');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 2) {
      if (!termsAccepted) {
        setError('Please accept the terms to continue.');
        return;
      }
      await handleSignUp();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="signup-convo">
      <h2>🐶 Bubba’s Welcome Chat</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleNext}>
        {step === 0 && (
          <>
            <p>Yay! A new friend! What’s your email so we can get started?</p>
            <input
              type="email"
              placeholder="Your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Next</button>
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
              required
            />
            <button type="submit">Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <p>Last thing! Can you paw-mise to accept the terms before we play?</p>
            <label>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I agree to the <Link href="/terms" className="terms-of-service">Terms of Service</Link>
            </label>
            <br />
            <button type="submit">Join Bubba’s Pack 🐶</button>
          </>
        )}
      </form>
    </div>
  );
};

export default SignUp;
