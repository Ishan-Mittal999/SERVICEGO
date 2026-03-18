import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="landing legal-shell">
      <div className="container legal-wrap">
        <article className="legal-card">
          <h1 className="section-title">Privacy Policy</h1>
          <p className="legal-intro">
            Last updated: March 17, 2026. This Privacy Policy explains how ServiceGo collects, uses, and protects your
            personal information.
          </p>

          <section className="legal-sections">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly, including your name, email, phone number, addresses, booking
            details, and support messages. We also collect limited technical data such as device, browser, and usage logs.
          </p>

          <h2>2. How We Use Information</h2>
          <p>
            We use your data to create and manage accounts, process bookings and payments, communicate booking updates,
            improve service quality, detect fraud, and comply with legal obligations.
          </p>

          <h2>3. Sharing of Information</h2>
          <p>
            We share necessary booking details with assigned vendors and trusted service providers (for example, payment and
            infrastructure partners) to operate the platform. We do not sell personal information to third parties.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            We retain personal information for as long as needed to provide services, maintain records, resolve disputes,
            and meet legal requirements. Retention periods may vary depending on account activity and applicable law.
          </p>

          <h2>5. Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational safeguards to protect your data. No method of
            transmission or storage is fully secure, so absolute security cannot be guaranteed.
          </p>

          <h2>6. Your Choices and Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict use of your
            personal information. You can submit privacy requests through support channels available in your account.
          </p>

          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use of ServiceGo after policy updates means you
            accept the revised policy.
          </p>
          </section>

          <div className="legal-actions">
            <Link href="/" className="btn-book">
              Back to Home
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
