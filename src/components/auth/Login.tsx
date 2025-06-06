// src/components/Login.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/utils/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { setUserUID, recoverWithDecryptionKey } from '@/utils/encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import RecoveryModal from '@/components/RecoveryModal';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [decryptionKey, setDecryptionKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const resetForm = () => {
    setStep(0);
    setEmail('');
    setPassword('');
    setDecryptionKey('');
    setError(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      if (user) {
        setUserUID(user.uid);

        const ok = await recoverWithDecryptionKey(decryptionKey);
        if (!ok) {
          setError('Invalid decryption key');
          return;
        }

        handleDialogChange(false);
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
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
        setError('Please enter your password');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!decryptionKey) {
        setError('Please enter your decryption key');
        return;
      }
      await handleLogin();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleRecoverySuccess = () => {
    setShowRecoveryModal(false);
    setError(null);
    // Optionally pre-fill decryptionKey from sessionStorage if you saved it
  };

  const handleRecoveryCancel = () => {
    setShowRecoveryModal(false);
  };

  return (
    <>
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
                  {new Date().getHours() < 12 ? 'Good morning' : 'Good evening'}!
                </DialogTitle>
                <DialogDescription>It's Bubba. Let's get you logged in!</DialogDescription>
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
                  <h3 className="text-sm font-medium">
                    And your secret password? (Bubba promises not to tell!)
                  </h3>
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
                  <h3 className="text-sm font-medium">Enter your decryption key</h3>
                  <Input
                    type="password"
                    value={decryptionKey}
                    onChange={(e) => setDecryptionKey(e.target.value)}
                    required
                    autoFocus
                    placeholder="Decryption key"
                  />
                  <p className="text-sm text-muted-foreground">
                    Forgot your decryption key?{' '}
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => setShowRecoveryModal(true)}
                    >
                      Recover with Recovery Key
                    </Button>
                  </p>
                </div>
              )}
            </form>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={handleBack} type="button">
                ← Back
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={handleNext} type="submit">
              {step === 2 ? "Let's Go! →" : 'Next →'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RecoveryModal
        isOpen={showRecoveryModal}
        onSuccess={handleRecoverySuccess}
        onCancel={handleRecoveryCancel}
      />
    </>
  );
};

const LoginComponent = () => {
  const [open, setOpen] = useState(true);
  return <LoginDialog open={open} onOpenChange={setOpen} />;
};

export default LoginComponent;
