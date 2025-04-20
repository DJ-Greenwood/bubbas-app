import { useState } from "react";
import { auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import '../../../public/assets/css/globals.css';

const Login = () => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in successfully");
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
    <div className="login-convo">
      <h2>🐶 Bubba's Login Chat</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleNext}>
        {step === 0 && (
          <>
            <p>Hi there! I'm Bubba 🐾 Can I have your email, please?</p>
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
            <p>Thanks! Now, what’s the secret password to our clubhouse?</p>
            <input
              type="password"
              placeholder="Your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Let Me In 🐾</button>
          </>
        )}
      </form>
    </div>
  );
};

export default Login;
