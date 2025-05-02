import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from '@/utils/firebaseClient'; // ✅ Replace relative path
import { signInWithEmailAndPassword } from "firebase/auth";
import '../../../public/assets/css/globals.css';
import { setUserUID} from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/chatServices'; // ✅ Import fetchPassPhrase)

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
<div className="emotion-chat-container max-w-xl mx-auto mt-10 p-6 rounded shadow-md bg-white">
  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
    <img src="/assets/images/emotions/Bubba/default.jpg" alt="Bubba AI" className="w-20 h-20 object-cover rounded" />
    {new Date().getHours() < 12 ? "Good morning" : "Good evening"}!</h2>
    <p> It's Bubba. Let's get you logged in!</p>
  {error && <p className="text-red-500 mb-2">⚠️ {error}</p>}
  <form onSubmit={handleNext} className="space-y-4">
    {step === 0 && (
      <>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus // ✅ Add this
          className="border p-2 rounded w-full"
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
          className="border p-2 rounded w-full"
          autoFocus
        />
      </>
    )}

    <div className="flex gap-4">
      {step > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          ← Go Back
        </button>
      )}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {step === 1 ? "Let’s Go! →" : "Next →"}
      </button>
    </div>
  </form>
</div>

  );
};

export default LoginComponent;
