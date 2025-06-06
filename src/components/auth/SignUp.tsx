'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/utils/firebaseClient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserProfile } from '@/utils/userProfileService';
import { setUserUID, setupEncryption } from '@/utils/encryption';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RecoveryKeyDisplay from '@/components/RecoveryKeyDisplay';

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SignUpDialog = ({ open, onOpenChange }: SignUpDialogProps) => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [hasShownDecryption, setHasShownDecryption] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);

  const resetForm = () => {
    setStep(0);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEncryptionKey('');
    setTermsAccepted(false);
    setError(null);
    setRecoveryKey(null);
    setHasShownDecryption(false);
    setUid(null);
    setRecoveryConfirmed(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleSignUp = async () => {
    setError(null);

    if (!email || !password || !encryptionKey) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      const user = userCredential.user;

      if (!user) {
        throw new Error('User not authenticated after sign-up.');
      }

      setUserUID(user.uid);
      setUid(user.uid); // Save UID for later use

      const result = await setupEncryption(encryptionKey.trim());
      console.log("🧪 Recovery Key:", result.recoveryCode);
      setRecoveryKey(result.recoveryCode);
      // Don't create user profile yet, wait for confirmation
    } catch (error: any) {
      console.error('Sign-up error:', error);
      setError(error.message || 'Sign-up failed');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 0) {
      if (!email) return setError('Please enter your email address');
      setStep(1);
    } else if (step === 1) {
      if (!password) return setError('Please enter your password');
      setStep(2);
    } else if (step === 2) {
      if (!confirmPassword) return setError('Please confirm your password');
      if (password !== confirmPassword) return setError('Passwords do not match');
      setStep(3);
    } else if (step === 3) {
      if (!encryptionKey || encryptionKey.length < 8) return setError('Decryption key must be at least 8 characters');
      setStep(4);
    } else if (step === 4) {
      if (!termsAccepted) return setError('Please accept the terms');
      await handleSignUp();
      setStep(5); // Move to recovery key confirmation step
    } else if (step === 5) {
      if (!recoveryConfirmed) return setError('Please confirm you have saved your recovery key.');
      if (!uid) return setError('Waiting for user ID...');
      try {
        await createUserProfile(uid, email.trim(), encryptionKey.trim());
        handleDialogChange(false);
        router.push('/dashboard');
      } catch (error: any) {
        setError(error.message || 'Failed to create user profile');
      }
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 5) setStep(step - 1);
  };

  // const handleContinue = () => {
  //   handleDialogChange(false);
  //   router.push('/dashboard');
  // };

  useEffect(() => {
    if (recoveryKey) {
      setHasShownDecryption(true);
    }
  }, [recoveryKey]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <img src="/assets/images/emotions/Bubba/default.jpg" alt="Bubba AI" className="w-16 h-16 object-cover rounded-full" />
            <div>
              <DialogTitle className="text-2xl">
                {new Date().getHours() < 12 ? "Good morning" : "Good evening"}!
              </DialogTitle>
              <DialogDescription>It's Bubba. Let's get you signed up!</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleNext} className="space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Please enter your email</h3>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="Email address" />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Create a secure password</h3>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus placeholder="Password" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Confirm your password</h3>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoFocus placeholder="Confirm password" />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Create a Decryption Key</h3>
                <p className="text-sm text-muted-foreground">This will encrypt your data. Make it secure and memorable. If you forget your Decryption Key, the only way to recover it is with your Recovery Key, which will be shown next. Store it somewhere safe.</p>
                <Input type="text" value={encryptionKey} onChange={(e) => setEncryptionKey(e.target.value)} required autoFocus placeholder="Decryption Key" />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Terms of Service</h3>
                <p className="text-sm text-muted-foreground">Please read and accept our Terms of Service to continue.</p>
                <div className="bg-muted p-4 rounded-md max-h-40 overflow-y-auto">
                  <p className="text-sm mb-2">By creating an account, you agree to the Terms of Service for Bubbas.AI.</p>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline inline-block">Read the full Terms of Service</a>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
                  <label htmlFor="terms" className="text-sm font-medium">I accept the terms and conditions</label>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Recovery Key Confirmation</h3>
                <p className="text-sm text-muted-foreground">Please confirm you have saved your Recovery Key. You will need it to recover your account if you lose your decryption key.</p>
                {recoveryKey && (
                  <div className="bg-muted p-4 rounded-md text-center">
                    <span className="font-mono text-lg select-all break-all">{recoveryKey}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox id="recovery-confirm" checked={recoveryConfirmed} onCheckedChange={(checked) => setRecoveryConfirmed(checked === true)} />
                  <label htmlFor="recovery-confirm" className="text-sm font-medium">I have saved my Recovery Key</label>
                </div>
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {step > 0 && step < 5 ? (
            <Button variant="outline" onClick={handleBack} type="button">← Back</Button>
          ) : (
            <div />
          )}
          <Button onClick={handleNext} type="submit">
            {step === 4 ? "Sign Up" : step === 5 ? "Finish" : "Next →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SignUpComponent = () => {
  const [open, setOpen] = useState(true);
  return <SignUpDialog open={open} onOpenChange={setOpen} />;
};

export default SignUpComponent;
