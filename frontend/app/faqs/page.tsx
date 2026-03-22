import Link from "next/link";

const FAQ_ITEMS = [
  {
    question: "What is ServiceGo?",
    answer:
      "ServiceGo is a high-trust service marketplace that connects you with vetted professionals and takes full responsibility for the quality and safety of every job.",
  },
  {
    question: "How is the final price determined?",
    answer:
      "The app shows a base inspection fee, while the final quote for additional labor and spare parts is provided by the Pro after a physical check-up.",
  },
  {
    question: "What does your 30-day warranty cover?",
    answer:
      "We offer a 30-day warranty where we will fix any recurring issues from the original service at no extra labor cost to you.",
  },
  {
    question: "How do you ensure my safety?",
    answer:
      "Every Pro undergoes a rigorous background check, and we maintain a zero-tolerance policy against any form of discrimination or misconduct.",
  },
  {
    question: "What happens if my property is damaged?",
    answer:
      "ServiceGo accepts full liability for property damage or personal injury caused by a Pro during a booking made through our platform.",
  },
  {
    question: "Can I provide my own spare parts?",
    answer:
      "Yes, you can provide your own parts or have the Pro procure genuine materials for you, which will be added to your final bill.",
  },
  {
    question: "Why should I pay through the app?",
    answer:
      "Paying through the app is mandatory to validate your 30-day warranty, insurance coverage, and access to our dispute resolution team.",
  },
  {
    question: "What if I am unhappy with the service?",
    answer:
      "You can report any issues within 48 hours via the app, and we will take full responsibility for resolving the dispute or providing a re-service.",
  },
];

export default function FaqsPage() {
  return (
    <main className="landing legal-shell">
      <div className="container legal-wrap">
        <article className="legal-card">
          <h1 className="section-title">Frequently Asked Questions</h1>
          <p className="legal-intro">
            Quick answers about ServiceGo bookings, pricing, warranty, and customer protection.
          </p>

          <section className="legal-sections">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} style={{ marginBottom: 20 }}>
                <h2>{item.question}</h2>
                <p>{item.answer}</p>
              </div>
            ))}
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