"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function VendorSignup() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const signup = async (e: React.FormEvent) => {
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

		if (!data.user) {
			setErrorMessage("Signup failed. Please try again.");
			setIsSubmitting(false);
			return;
		}

		if (!data.session) {
			setErrorMessage(
				"Account created. Please verify your email, then login as Shop Owner to complete registration."
			);
			setIsSubmitting(false);
			return;
		}

		router.push(
			`/vendor/onboarding?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
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
						placeholder="Phone number"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						required
						className="auth-input auth-input--spaced"
					/>

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
						{isSubmitting ? "Creating account..." : "Create Vendor Account"}
					</button>
				</form>

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