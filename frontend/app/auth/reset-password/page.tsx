"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback label="Loading reset form..." />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "vendor" ? "vendor" : "customer";
  const loginPath = role === "vendor" ? "/vendor/login" : "/auth/login";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Password updated successfully. Redirecting to login...");
    setIsSubmitting(false);

    setTimeout(() => {
      router.push(loginPath);
    }, 1200);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow">
        <button onClick={() => router.push(loginPath)} className="auth-back-link" type="button">
          {"<- Back to Login"}
        </button>

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">
          Set a new password for your {role === "vendor" ? "vendor" : "customer"} account.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="auth-input"
          />

          {errorMessage ? <p className="auth-feedback auth-feedback--error">{errorMessage}</p> : null}
          {successMessage ? <p className="auth-feedback auth-feedback--success">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-primary-btn"
            style={{ opacity: isSubmitting ? 0.8 : 1 }}
          >
            {isSubmitting ? "Updating password..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResetFallback({ label }: { label: string }) {
  return (
    <div className="auth-shell theme-centered-status">
      <p>{label}</p>
    </div>
  );
}
