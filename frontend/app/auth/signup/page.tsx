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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1rem",
        background:
          "radial-gradient(circle at 82% 18%, rgba(122,106,0,0.14), transparent 40%), radial-gradient(circle at 14% 12%, rgba(30,144,255,0.12), transparent 34%), var(--off-white)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--white)",
          borderRadius: "18px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--gray-200)",
          padding: "1.5rem",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--gray-500)",
            fontSize: "0.9rem",
            padding: 0,
            marginBottom: "1rem",
          }}
        >
          {"<- Back to Home"}
        </button>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            lineHeight: 1.1,
            color: "var(--gray-800)",
            margin: 0,
          }}
        >
          Create Account
        </h1>
        <p
          style={{
            marginTop: "0.6rem",
            color: "var(--gray-500)",
            fontSize: "0.95rem",
          }}
        >
          {isBookingFlow
            ? "Create your account to continue this booking flow."
            : "Join ServiceGo and start booking trusted professionals."}
        </p>

        {isBookingFlow ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.9rem 1rem",
              borderRadius: "14px",
              background: "var(--gold-bg)",
              color: "var(--gold-dark)",
              fontSize: "0.9rem",
            }}
          >
            After signup, you will continue to location capture, pricing, and vendor assignment.
          </div>
        ) : null}

        <div
          style={{
            marginTop: "1rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.4rem",
            background: "var(--gray-100)",
            padding: "0.3rem",
            borderRadius: "999px",
          }}
        >
          <button
            type="button"
            onClick={() => router.push(`/auth/login${authTabQuery}`)}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "0.58rem 0.7rem",
              fontWeight: 600,
              background: "transparent",
              color: "var(--gray-600)",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => router.push(`/auth/signup${authTabQuery}`)}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "0.58rem 0.7rem",
              fontWeight: 700,
              background: "var(--white)",
              color: "var(--gray-800)",
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => router.push("/vendor/login")}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "0.58rem 0.7rem",
              fontWeight: 600,
              background: "transparent",
              color: "var(--gray-600)",
            }}
          >
            Shop Owner
          </button>
        </div>

        <form onSubmit={handleSignup} style={{ marginTop: "1.4rem" }}>
          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              marginBottom: "0.9rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              outline: "none",
              background: "var(--gray-50)",
            }}
          />

          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Password
          </label>
          <input
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              outline: "none",
              background: "var(--gray-50)",
            }}
          />

          {errorMessage ? (
            <p style={{ color: "#b42318", marginTop: "0.8rem", fontSize: "0.88rem" }}>
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.86rem 1rem",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
              color: "var(--white)",
              fontWeight: 700,
              boxShadow: "var(--shadow-gold)",
              opacity: isSubmitting ? 0.8 : 1,
            }}
          >
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            margin: "1rem 0",
            color: "var(--gray-400)",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
          OR
          <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            padding: "0.78rem 1rem",
            borderRadius: "999px",
            border: "1px solid var(--gray-300)",
            background: "var(--white)",
            color: "var(--gray-700)",
            fontWeight: 600,
          }}
        >
          Continue with Google
        </button>

        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.9rem",
            color: "var(--gray-500)",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <span
            style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 82% 18%, rgba(122,106,0,0.14), transparent 40%), radial-gradient(circle at 14% 12%, rgba(30,144,255,0.12), transparent 34%), var(--off-white)",
        color: "var(--gray-700)",
      }}
    >
      <p>Loading signup...</p>
    </div>
  );
}