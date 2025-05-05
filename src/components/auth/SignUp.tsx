'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/utils/firebaseClient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserProfile } from '@/utils/userProfileService';
import { setUserUID } from '@/utils/encryption';
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
import { setEncryptionPassphrase } from '@/utils/encryption';

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
  const [passphrase, setPassphrase] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep(0);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPassphrase('');
    setTermsAccepted(false);
    setError(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleSignUp = async () => {
    setError(null);
  
    if (!email || !password || !passphrase) {
      setError('Please fill in all fields.');
      return;
    }
  
    try {
      const trimmedEmail = email.trim();
      const trimmedPass = password.trim();
      const encryptedTrimmedPassphrase = setEncryptionPassphrase(passphrase.trim());
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, encryptedTrimmedPassphrase);
      const user = userCredential.user;
  
      if (!user) {
        throw new Error('User not authenticated after sign-up.');
      }
  
      setUserUID(user.uid);
      await createUserProfile(user.uid, trimmedEmail, trimmedPassphrase);
  
      console.log('✅ User signed up and profile created successfully');
      handleDialogChange(false);
      router.push('/');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      setError(error.message || 'Sign-up failed');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 0) {
      if (!email) {
        setError('Please enter your email address');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!password) {
        setError('Please enter a password');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!confirmPassword) {
        setError('Please confirm your password');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!passphrase || passphrase.length < 4) {
        setError('Please create a passphrase with at least 4 characters');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!termsAccepted) {
        setError('Please accept the terms to continue');
        return;
      }
      await handleSignUp();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <img 
              src="/assets/images/emotions/Bubba/default.jpg" 
              alt="Bubba AI" 
              className="w-16 h-16 object-cover rounded-full"
            />
            <div>
              <DialogTitle className="text-2xl">
                {new Date().getHours() < 12 ? "Good morning" : "Good evening"}!
              </DialogTitle>
              <DialogDescription>
                It's Bubba. Let's get you signed up!
              </DialogDescription>
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
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="Email address"
                />
              </div>
            )}
            
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Create a secure password</h3>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Password"
                />
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Confirm your password</h3>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Confirm password"
                />
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Create a secret passphrase</h3>
                <p className="text-sm text-muted-foreground">
                  This will be used to encrypt your data. You don't need to remember it, Bubba won't either!
                </p>
                <Input
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  required
                  autoFocus
                  placeholder="Passphrase"
                />
              </div>
            )}
            
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Terms of Service</h3>
                <p className="text-sm text-muted-foreground">
                  Please read and accept our Terms of Service to continue.
                </p>

                <div className="bg-muted p-4 rounded-md max-h-40 overflow-y-auto">
                  <p className="text-sm mb-2">
                    By creating an account, you agree to the Terms of Service for Bubbas.AI.
                  </p>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm underline inline-block"
                  >
                    Read the full Terms of Service
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I accept the terms and conditions
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              type="button"
            >
              ← Back
            </Button>
          ) : (
            <div></div> // Empty div to maintain layout
          )}
          <Button 
            onClick={handleNext}
            type="submit"
          >
            {step === 4 ? "Sign Up" : "Next →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export the legacy component for backward compatibility
const SignUpComponent = () => {
  const [open, setOpen] = useState(true);
  return <SignUpDialog open={open} onOpenChange={setOpen} />;
};

export default SignUpComponent;