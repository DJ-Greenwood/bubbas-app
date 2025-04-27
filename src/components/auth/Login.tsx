import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import '../../../public/assets/css/globals.css';
import { setUserUID } from '@/utils/encryption';

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
      
      console.log("✅ User logged in successfully");
      router.push("/authorize-device"); // <-- 🚀 New flow!
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
    <div className="login-convo max-w-md mx-auto bg-white p-6 rounded shadow-md mt-10">
      <h2 className="flex items-center gap-3 mb-2">
        <img src="/assets/images/emotions/default.jpg" alt="Bubba AI" className="w-12 h-12 object-cover rounded" />
        Bubba's Login
      </h2>
      {error && <p className="text-red-500 mb-2">⚠️ {error}</p>}
      <form onSubmit={handleNext} className="space-y-4">
        {step === 0 && (
          <>
            <p>What's your email?</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border p-2 rounded w-full" />
          </>
        )}
        {step === 1 && (
          <>
            <p>Your password?</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border p-2 rounded w-full" />
          </>
        )}

        <div className="flex gap-4">
          {step > 0 && (
            <button type="button" onClick={handleBack} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
              ← Back
            </button>
          )}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {step === 1 ? "Login →" : "Next →"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginComponent;
