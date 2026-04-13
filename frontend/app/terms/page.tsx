import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Read ServiceGo terms and conditions covering platform usage, pricing policy, warranty, liability, and customer responsibilities.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="landing legal-shell">
      <div className="container legal-wrap">
        <article className="legal-card">
          <h1 className="section-title">SERVICEGO TERMS AND CONDITIONS</h1>
          <p className="legal-intro">
            Last Updated: March 22, 2026
          </p>

          <p>
            These Terms and Conditions ("Terms") govern the use of services made available through ServiceGo (the
            "Platform"). By using the Platform, you agree to be bound by these Terms. ServiceGo is a brand owned and
            operated by ServiceGo Technologies ("ServiceGo", "we", "us", or "our").
          </p>

          <section className="legal-sections">
          <h2>1. THE SERVICEGO GUARANTEE &amp; SCOPE</h2>
          <p>
            Unlike standard marketplaces, ServiceGo provides a curated experience.
          </p>
          <p>
            <strong>Full Responsibility:</strong> ServiceGo assumes responsibility for the facilitation, quality, and
            safety of the services performed by independent service providers ("Pros").
          </p>
          <p>
            <strong>30-Day Service Warranty:</strong> We provide a 30-day warranty on all services booked through the
            Platform. If the specific issue addressed during the service recurs within 30 days, we will provide a
            re-service at no additional cost.
          </p>
          <p>
            <strong>Vetting Process:</strong> We perform comprehensive background checks on all Pros, including identity
            verification and criminal record checks where applicable.
          </p>

          <h2>2. SERVICES (THE PLATFORM)</h2>
          <p>
            (a) The Platform enables you to schedule home-based services (e.g., plumbing, electrical, carpentry) with
            Pros.
          </p>
          <p>
            (b) While Pros are independent contractors, ServiceGo acts as the quality-control layer. We facilitate
            payments and provide the customer support framework for all bookings.
          </p>

          <h2>3. Transparent Pricing Policy</h2>
          <p>
            To ensure there are no surprises, we follow a straightforward pricing model based on a professional physical
            inspection.
          </p>
          <p>
            <strong>Initial Check-up Fee:</strong> Every booking starts with a professional inspection. This nominal fee
            covers the technician&apos;s visit and a detailed diagnosis of the issue.
          </p>
          <p>
            <strong>Post-Inspection Quotes:</strong> If the professional identifies that additional work is required
            beyond the basic service after the check-up, the customer is responsible for paying the extra labor charges
            associated with that specific repair.
          </p>
          <p>
            <strong>Spare Parts &amp; Materials:</strong> The cost of any spare parts, wires, or consumables required to
            complete the repair is not included in the initial service fee.
          </p>
          <p>Customers can choose to provide the parts themselves.</p>
          <p>
            Alternatively, the professional can procure genuine parts for you, and the cost will be added to your final
            invoice separately.
          </p>

          <h2>4. LIABILITY AND PROTECTION</h2>
          <p>
            ServiceGo accepts liability for the following, subject to a maximum cap of INR 15,000 (or the total booking
            value, whichever is higher) per incident:
          </p>
          <p>
            <strong>Property Damage:</strong> Direct damage caused to your home or belongings by a Pro during the
            performance of the service.
          </p>
          <p>
            <strong>Personal Injury:</strong> Any injury sustained by the Customer due to the gross negligence of the Pro
            during the service visit.
          </p>
          <p>
            <strong>Performance Failure:</strong> Failure to complete the job or meet the quality standards specified on
            our Platform.
          </p>
          <p>
            <strong>Financial Disputes:</strong> Resolution of disagreements regarding pricing, provided the booking was
            made through the Platform.
          </p>

          <h2>5. ANTI-DISCRIMINATION POLICY</h2>
          <p>
            ServiceGo maintains a Zero-Tolerance Policy regarding discrimination.
          </p>
          <p>
            <strong>Prohibited Conduct:</strong> Discrimination against customers or Pros based on religion, caste, race,
            national origin, disability, sexual orientation, sex, marital status, gender identity, or age is strictly
            prohibited.
          </p>
          <p>
            <strong>Consequences:</strong> Any user (Customer or Pro) found violating this policy will be immediately and
            permanently banned from the ServiceGo Platform.
          </p>

          <h2>6. CUSTOMER RESPONSIBILITIES</h2>
          <p>
            (a) <strong>Safe Environment:</strong> You must provide a safe and clean environment for the Pro to work. Pros
            may refuse service if the environment is deemed hazardous or if the customer is abusive.
          </p>
          <p>
            (b) <strong>Accuracy of Info:</strong> You warrant that all information provided (address, nature of the
            problem) is accurate to ensure the Pro brings the correct tools and skills.
          </p>

          <h2>7. DATA PRIVACY &amp; USAGE</h2>
          <p>
            (a) We collect and process your personal data (Phone, Location, Service History) in accordance with our
            Privacy Policy to improve service efficiency.
          </p>
          <p>
            (b) We may share necessary details with our affiliates or law enforcement if required by Indian law.
          </p>

          <h2>8. DISPUTE RESOLUTION</h2>
          <p>(a) Governing Law: These terms are governed by the laws of India.</p>
          <p>
            (b) Arbitration: Any disputes shall be resolved through binding arbitration in New Delhi in accordance with
            the Arbitration and Conciliation Act, 1996.
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
