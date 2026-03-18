"use client";

import { Suspense, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { isVendorUser } from "@/lib/user-role";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback label="Loading login..." />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const isVendor = await isVendorUser(user.id);
      if (isVendor) {
        await supabase.auth.signOut();
        setErrorMessage("This email is registered as a vendor account. Please use Vendor Login.");
        setIsSubmitting(false);
        return;
      }
    }

    router.push(nextPath);
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
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow">
        <button onClick={() => router.push("/")} className="auth-back-link">
          {"<- Back to Home"}
        </button>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          {isBookingFlow
            ? "Login to continue your booking and move to the next step."
            : "Login to continue booking trusted home services."}
        </p>

        {isBookingFlow ? (
          <div className="auth-note auth-note--blue">
            You will resume the selected booking flow immediately after login.
          </div>
        ) : null}

        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => router.push(`/auth/login${authTabQuery}`)}
            className="auth-tab is-active"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => router.push(`/auth/signup${authTabQuery}`)}
            className="auth-tab"
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

        <form onSubmit={handleLogin} className="auth-form">
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
          onClick={handleGoogleLogin}
          className="auth-secondary-btn"
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <span
            onClick={() => router.push(`/auth/signup${authTabQuery}`)}
            className="auth-link"
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}

function AuthPageFallback({ label }: { label: string }) {
  return (
    <div className="auth-shell theme-centered-status">
      <p>{label}</p>
    </div>
  );
}