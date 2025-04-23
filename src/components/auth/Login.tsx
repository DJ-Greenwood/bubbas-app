import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import '../../../public/assets/css/globals.css';

const LoginComponent = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ User logged in successfully");
      router.push("/profile"); // ✅ Redirect to profile after login
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

  return (
    <div className="login-convo max-w-md mx-auto bg-white p-6 rounded shadow-md mt-10">
      <h2 className="flex items-center gap-3 mb-2">
        <img
          src="/assets/images/emotions/default.jpg"
          alt="Bubba the AI"
          className="w-16 h-16 object-cover rounded"
        /> Bubba's Login Chat</h2>
      {error && <p className="text-red-500 mb-2">⚠️ {error}</p>}
      <form onSubmit={handleNext} className="space-y-4">
        {step === 0 && (
          <>
            <p>Hi there! I'm Bubba 🐾 Can I have your email, please?</p>
            <input
              type="email"
              placeholder="Your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Next →
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <p>Thanks! Now, what’s the secret password to our clubhouse?</p>
            <input
              type="password"
              placeholder="Your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Let Me In 🐾
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default LoginComponent;
