'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from '@/utils/firebaseClient';
import { signInWithEmailAndPassword } from "firebase/auth";
import { setUserUID } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/chatServices';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const LoginComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      const user = auth.currentUser;
      if (user) {
        setUserUID(user.uid);
        
        const phrase = await fetchPassPhrase();
        if (!phrase) {
          console.warn("No passphrase set. User might need to update preferences.");
        }

        console.log("✅ User logged in successfully");
        router.push("/authorize-device");
      }
    } catch (error: any) {
      setError(error.message || "Login failed");
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      await handleLogin();
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
                It's Bubba. Let's get you logged in!
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
                <h3 className="text-sm font-medium">And your secret password? (Bubba promises not to tell!)</h3>
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
            {step === 1 ? "Let's Go! →" : "Next →"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginComponent;