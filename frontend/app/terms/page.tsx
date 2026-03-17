import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="landing" style={{ minHeight: "100vh", padding: "6rem 1rem 3rem" }}>
      <div className="container" style={{ maxWidth: "900px" }}>
        <h1 className="section-title" style={{ marginBottom: "1rem" }}>
          Terms of Service
        </h1>
        <p style={{ color: "var(--gray-500)", marginBottom: "1.5rem" }}>
          Last updated: March 17, 2026. By accessing or using ServiceGo, you agree to these Terms of Service.
        </p>

        <section style={{ display: "grid", gap: "1rem" }}>
          <h2>1. Use of the Platform</h2>
          <p>
            ServiceGo is a platform that helps customers discover and book home services from independent vendors. You must
            use the platform lawfully and provide accurate information when creating an account or placing a booking.
          </p>

          <h2>2. Bookings and Vendor Fulfillment</h2>
          <p>
            Vendors are independent service providers and are responsible for delivery of services. ServiceGo coordinates
            booking flow, communication, and support but does not guarantee exact vendor arrival time or service outcomes.
          </p>

          <h2>3. Pricing and Payments</h2>
          <p>
            Prices shown at checkout may include service fees, taxes, or add-ons. By confirming a booking, you authorize
            payment according to the selected method. Cancellation, reschedule, and refund eligibility are governed by the
            policy presented at checkout.
          </p>

          <h2>4. User Responsibilities</h2>
          <p>
            You agree to provide safe and lawful access to the service location, treat vendors respectfully, and avoid
            misuse of the platform. Fraudulent behavior, abuse, or repeated no-shows may result in suspension or
            termination of your account.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, ServiceGo is not liable for indirect, incidental, or consequential
            damages arising from platform use or vendor-provided services. Our total liability for any claim is limited to
            the amount paid for the specific booking in dispute.
          </p>

          <h2>6. Changes to These Terms</h2>
          <p>
            We may update these terms periodically. Continued use of the platform after updates become effective constitutes
            acceptance of the revised terms.
          </p>

          <h2>7. Contact</h2>
          <p>
            For terms-related questions, contact support through the channels listed in your ServiceGo account.
          </p>
        </section>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/" className="btn-book">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
