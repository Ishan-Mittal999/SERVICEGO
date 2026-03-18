"use client";

import { Suspense, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nextPath = searchParams.get("next") || "/";
  const preservedParams = searchParams.toString();
  const authTabQuery = preservedParams ? `?${preservedParams}` : "";
  const isBookingFlow = nextPath.startsWith("/booking/");

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.push(nextPath);
      return;
    }

    router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${nextPath}`,
      },
    });
  };

  return (
    <div className="auth-shell auth-shell--alt">
      <div className="auth-card auth-card--narrow">
        <button onClick={() => router.push("/")} className="auth-back-link">
          {"<- Back to Home"}
        </button>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">
          {isBookingFlow
            ? "Create your account to continue this booking flow."
            : "Join ServiceGo and start booking trusted professionals."}
        </p>

        {isBookingFlow ? (
          <div className="auth-note auth-note--gold">
            After signup, you will continue to location capture, pricing, and vendor assignment.
          </div>
        ) : null}

        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => router.push(`/auth/login${authTabQuery}`)}
            className="auth-tab"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => router.push(`/auth/signup${authTabQuery}`)}
            className="auth-tab is-active"
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => router.push("/vendor/login")}
            className="auth-tab"
          >
            Shop Owner
          </button>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          <label className="auth-label">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
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
            placeholder="Create password"
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
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          OR
          <span />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="auth-secondary-btn"
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          Already have an account?{" "}
          <span
            className="auth-link"
            onClick={() => router.push(`/auth/login${authTabQuery}`)}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

function SignupPageFallback() {
  return (
    <div className="auth-shell auth-shell--alt theme-centered-status">
      <p>Loading signup...</p>
    </div>
  );
}