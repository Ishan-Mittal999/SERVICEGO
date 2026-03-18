"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function VendorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/vendor/entry");
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/vendor/entry`,
      },
    });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <button onClick={() => router.push("/")} className="auth-back-link">
          {"<- Back to Home"}
        </button>

        <h1 className="auth-title">Vendor Login</h1>
        <p className="auth-subtitle">
          Access your dashboard and manage assigned bookings.
        </p>

        <form onSubmit={login} className="auth-form">
          <label className="auth-label">
            Email
          </label>
          <input
            type="email"
            placeholder="vendor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
          />

          {errorMessage ? (
            <p style={{ color: "#b42318", marginTop: "0.8rem", fontSize: "0.88rem" }}>
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-primary-btn"
            style={{ opacity: isSubmitting ? 0.8 : 1 }}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          OR
          <span />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="auth-secondary-btn"
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          New vendor?{" "}
          <span
            className="auth-link"
            onClick={() => router.push("/vendor/signup")}
          >
            Create account
          </span>
        </p>
      </div>
    </div>
  );
}
