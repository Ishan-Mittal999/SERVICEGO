"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e: any) => {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created! Check your email.");
    router.push("/auth/login");
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div style={{ padding: "4rem", textAlign: "center" }}>
      <h2>Create Account</h2>

      <form onSubmit={handleSignup} style={{ marginTop: "2rem" }}>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br /><br />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br /><br />

        <button type="submit">Sign Up</button>
      </form>

      <hr style={{ margin: "2rem 0" }} />

      <button onClick={handleGoogleLogin}>
        Continue with Google
      </button>

      <p style={{ marginTop: "1rem" }}>
        Already have an account?{" "}
        <span
          style={{ color: "blue", cursor: "pointer" }}
          onClick={() => router.push("/auth/login")}
        >
          Login
        </span>
      </p>
    </div>
  );
}