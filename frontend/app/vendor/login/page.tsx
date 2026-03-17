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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1rem",
        background:
          "radial-gradient(circle at 18% 18%, rgba(122,106,0,0.14), transparent 40%), radial-gradient(circle at 84% 12%, rgba(30,144,255,0.12), transparent 34%), var(--off-white)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
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
          Vendor Login
        </h1>
        <p
          style={{
            marginTop: "0.6rem",
            color: "var(--gray-500)",
            fontSize: "0.95rem",
          }}
        >
          Access your dashboard and manage assigned bookings.
        </p>

        <form onSubmit={login} style={{ marginTop: "1.4rem" }}>
          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Email
          </label>
          <input
            type="email"
            placeholder="vendor@example.com"
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
            placeholder="Enter password"
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
            {isSubmitting ? "Logging in..." : "Login"}
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
          type="button"
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
          New vendor?{" "}
          <span
            style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => router.push("/vendor/signup")}
          >
            Create account
          </span>
        </p>
      </div>
    </div>
  );
}
