"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { isValidIndianMobile, sanitizeIndianPhoneInput } from "@/lib/phone";

export default function VendorSignup() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [isVerificationPending, setIsVerificationPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const isPhoneValid = isValidIndianMobile(phone);

	const emailRedirectTo =
		typeof window !== "undefined"
			? `${window.location.origin}/vendor/entry`
			: undefined;

	const openMailbox = (provider: "gmail" | "outlook") => {
		const url =
			provider === "gmail"
				? "https://mail.google.com/mail/u/0/#inbox"
				: "https://outlook.live.com/mail/0/inbox";
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const resendVerificationEmail = async () => {
		if (!email) {
			setErrorMessage("Email is required to resend verification link.");
			return;
		}

		setErrorMessage(null);
		setInfoMessage(null);
		setIsResending(true);

		const { error } = await supabase.auth.resend({
			type: "signup",
			email,
			options: {
				emailRedirectTo,
			},
		});

		if (error) {
			setErrorMessage(error.message);
			setIsResending(false);
			return;
		}

		setInfoMessage("Verification email sent again. Please check your inbox and spam folder.");
		setIsResending(false);
	};

	const signup = async (e: React.FormEvent) => {
		e.preventDefault();

		setErrorMessage(null);
		setInfoMessage(null);

		if (!isPhoneValid) {
			setErrorMessage("Enter a valid 10-digit mobile number.");
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(true);

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo,
				data: {
					full_name: name,
					phone: sanitizeIndianPhoneInput(phone),
					role: "vendor",
				},
			},
		});

		if (error) {
			setErrorMessage(error.message);
			setIsSubmitting(false);
			return;
		}

		if (!data.user) {
			setErrorMessage("Signup failed. Please try again.");
			setIsSubmitting(false);
			return;
		}

		if (!data.session) {
			setIsVerificationPending(true);
			setInfoMessage("Account created. Verification link sent to your email.");
			setIsSubmitting(false);
			return;
		}

		router.push(
			`/vendor/onboarding?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(sanitizeIndianPhoneInput(phone))}`
		);
	};

	return (
		<div className="auth-shell auth-shell--alt">
			<div className="auth-card">
				<button
					onClick={() => router.push("/")}
					className="auth-back-link"
				>
					{"<- Back to Home"}
				</button>

				<h1 className="auth-title">Vendor Signup</h1>
				<p className="auth-subtitle">
					Create your vendor account and start receiving bookings.
				</p>

				{isVerificationPending ? (
					<section className="auth-verify-card" aria-live="polite">
						<div className="auth-verify-badge" aria-hidden="true">✓</div>
						<h2>Check your inbox</h2>
						<p>
							We sent a verification link to <strong>{email}</strong>. Verify your email to activate your vendor account.
						</p>
						<ul className="auth-verify-steps">
							<li>Open your mailbox and find the message from ServiceGo.</li>
							<li>Click the verification button in that email.</li>
							<li>Return and login as Shop Owner to continue onboarding.</li>
						</ul>

						<div className="auth-verify-actions">
							<button type="button" className="auth-secondary-btn" onClick={() => openMailbox("gmail")}>Open Gmail</button>
							<button type="button" className="auth-secondary-btn" onClick={() => openMailbox("outlook")}>Open Outlook</button>
							<button
								type="button"
								className="auth-primary-btn"
								onClick={resendVerificationEmail}
								disabled={isResending}
							>
								{isResending ? "Sending..." : "Resend Verification Email"}
							</button>
							<button type="button" className="auth-secondary-btn" onClick={() => router.push("/vendor/login")}>Go to Vendor Login</button>
						</div>
					</section>
				) : (
				<form onSubmit={signup} className="auth-form">
					<label className="auth-label">
						Full Name
					</label>
					<input
						placeholder="Your name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="auth-input auth-input--spaced"
					/>

					<label className="auth-label">
						Phone
					</label>
					<input
						type="tel"
						inputMode="numeric"
						autoComplete="tel-national"
						pattern="[0-9]*"
						maxLength={10}
						placeholder="Phone number"
						value={phone}
						onChange={(e) => setPhone(sanitizeIndianPhoneInput(e.target.value))}
						required
						className="auth-input auth-input--spaced"
					/>
					{phone && !isPhoneValid ? (
						<p className="auth-feedback auth-feedback--error">Enter a valid 10-digit mobile number.</p>
					) : null}

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
						placeholder="Create password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="auth-input"
					/>

					{errorMessage ? <p className="auth-feedback auth-feedback--error">{errorMessage}</p> : null}
					{infoMessage ? <p className="auth-feedback auth-feedback--success">{infoMessage}</p> : null}

					<button
						type="submit"
						disabled={isSubmitting || !isPhoneValid}
						className="auth-primary-btn"
						style={{ opacity: isSubmitting ? 0.8 : 1 }}
					>
						{isSubmitting ? "Creating account..." : "Create Vendor Account"}
					</button>
				</form>
				)}

				<p className="auth-footer">
					Already have a vendor account?{" "}
					<span
						className="auth-link"
						onClick={() => router.push("/vendor/login")}
					>
						Login
					</span>
				</p>
			</div>
		</div>
	);
}