"use client";

import SignUp from "@/components/auth/SignUp";
import Login from "@/components/auth/Login";

import { useState } from "react";

const AuthenticationPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-4">
          {isSignUp ? "Sign Up" : "Login"}
        </h1>
        {isSignUp ? <SignUp /> : <Login />}
        <button
          onClick={toggleAuthMode}
          className="mt-4 text-blue-500 hover:underline focus:outline-none"
        >
          {isSignUp
            ? "Already have an account? Login"
            : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default AuthenticationPage;