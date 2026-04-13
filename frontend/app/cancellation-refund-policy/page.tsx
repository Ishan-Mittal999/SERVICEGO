import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy",
  description:
    "View ServiceGo cancellation, rescheduling, and refund terms for home service bookings, including timelines and eligibility rules.",
  alternates: {
    canonical: "/cancellation-refund-policy",
  },
};

export default function CancellationRefundPolicyPage() {
  return (
    <main className="landing legal-shell">
      <div className="container legal-wrap">
        <article className="legal-card">
          <h1 className="section-title">Cancellation and Refund Policy</h1>
          <p className="legal-intro">
            Last updated: March 22, 2026. This policy governs cancellation, rescheduling, and refund handling for services
            booked through ServiceGo.
          </p>

          <section className="legal-sections">
            <h2>1. Applicability and Amendment</h2>
            <p>
              ServiceGo ("the Company"), through its mobile application and website ("Platform"), facilitates the
              provision of home maintenance services, including plumbing, electrical work, carpentry, and other handyman
              services. This policy applies to all users ("Customers") availing services from our network of verified
              experts ("Service Professionals").
            </p>
            <p>
              By booking a service on ServiceGo, you agree to be bound by this policy. If you do not agree, please do not
              proceed with the booking.
            </p>
            <p>
              ServiceGo reserves the right to modify this policy at any time. Continued use of the Platform after changes
              are posted constitutes acceptance of the new terms.
            </p>

            <h2>2. Terms of Cancellation</h2>
            <p>
              <strong>2.1 No-Cost Cancellation:</strong> You may cancel or reschedule a booking free of charge up to 30
              minutes prior to the scheduled time slot. Rescheduling is subject to the availability of Service
              Professionals on the same or following day.
            </p>
            <p>
              <strong>2.2 Late Cancellation Fee:</strong> If a cancellation or rescheduling request is made within 30
              minutes of the scheduled slot, or after a Service Professional has already been dispatched or arrived at the
              location, a cancellation fee of 100% of the base service fee (or a minimum convenience fee) may be charged
              at the Company&apos;s discretion.
            </p>
            <p>
              <strong>2.3 Cash on Delivery (CoD) Users:</strong> For customers opting for cash payments, if a late
              cancellation occurs (as defined in 2.2) and the fee is not paid immediately, the cancellation charge will be
              added to the bill of your next booking on the ServiceGo Platform.
            </p>
            <p>
              <strong>2.4 Company-Initiated Cancellation:</strong> ServiceGo reserves the right to cancel a booking
              without penalty to the Company if:
            </p>
            <ul className="legal-list">
              <li>The provided address is incomplete or unreachable.</li>
              <li>The Customer is unresponsive for more than 15 minutes after the Service Professional arrives.</li>
              <li>
                There is a sudden shortage of available Service Professionals in your hyperlocal area. In such cases, a
                full refund (if prepaid) or priority rescheduling will be offered.
              </li>
            </ul>

            <h2>3. Terms of Refund</h2>
            <p>
              <strong>3.1 General Rule:</strong> All fees paid for completed services are generally non-refundable.
              Refunds are only considered under specific "Deficiency of Service" criteria.
            </p>
            <p>
              <strong>3.2 Refund Eligibility:</strong> A refund request must be raised through the ServiceGo app within 3
              hours of the service completion slot. Eligibility includes:
            </p>
            <ul className="legal-list">
              <li>
                <strong>No-Show:</strong> The Service Professional did not arrive.
              </li>
              <li>
                <strong>Significant Delay:</strong> The professional arrived more than 30 minutes late without prior
                communication, affecting the feasibility of the task.
              </li>
              <li>
                <strong>Service Deficiency:</strong> Demonstrated error or poor workmanship as determined by ServiceGo&apos;s
                internal audit (photos or videos may be required as evidence).
              </li>
            </ul>
            <p>
              <strong>3.3 Exclusions:</strong> Refunds are not applicable for "change of mind" after the professional has
              arrived, or for parts or materials purchased separately by the professional on your behalf.
            </p>
            <p>
              <strong>3.4 Processing:</strong> Approved refunds will be credited to the original payment source or your
              ServiceGo Wallet within 5-7 business days.
            </p>

            <h2>4. ServiceGo Support</h2>
            <p>
              If you have a dispute regarding a cancellation fee or a service quality issue, please reach out to our
              support team via the Help section in the ServiceGo app or email our Grievance Officer.
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
