'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/utils/firebaseClient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createNewUserProfile } from '@/utils/userProfileService';
import { setUserUID } from '@/utils/encryption';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const SignUpComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
  
    if (!email || !password || !passphrase) {
      setError('Please fill in all fields.');
      return;
    }
  
    try {
      const trimmedEmail = email.trim();
      const trimmedPass = password.trim();
      const trimmedPassphrase = passphrase.trim();
      
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
      const user = userCredential.user;
  
      if (!user) {
        throw new Error('User not authenticated after sign-up.');
      }
  
      setUserUID(user.uid);
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
    <div className="container mx-auto py-8 max-w-md">
      <Card className="mx-auto">
        <CardHeader>
          <div className="flex items-center gap-4">
            <img 
              src="/assets/images/emotions/Bubba/default.jpg" 
              alt="Bubba AI" 
              className="w-16 h-16 object-cover rounded-full"
            />
            <div>
              <CardTitle className="text-2xl">
                {new Date().getHours() < 12 ? "Good morning" : "Good evening"}!
              </CardTitle>
              <CardDescription>
                It's Bubba. Let's get you signed up!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                <h3 className="text-sm font-medium">Create a secret passphrase</h3>
                <p className="text-sm text-muted-foreground">
                  It will be used to encrypt your data. You don't need to remember it, Bubba won't either!
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
            
            {step === 3 && (<div className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
            >
              ← Back
            </Button>
          )}
          <Button 
            onClick={handleNext}
            className={step === 0 ? "ml-auto" : ""}
          >
            {step === 3 ? "Sign Up" : "Next →"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUpComponent;