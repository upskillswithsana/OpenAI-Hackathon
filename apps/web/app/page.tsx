import Link from "next/link";

const FEATURE_CARDS = [
  {
    title: "AI campus intelligence",
    description:
      "Ask grounded questions about housing, clubs, internships, program rigor, and campus resources.",
  },
  {
    title: "Ambassador fit, not random outreach",
    description:
      "Surface ambassadors by program, interests, and international background so mentorship starts with context.",
  },
  {
    title: "Booking that turns curiosity into action",
    description:
      "Move from answer to mentorship in the same flow, with structured availability and request approval.",
  },
];

const METRICS = [
  { label: "Demo roles", value: "Student / Ambassador / Admin" },
  { label: "Meeting lengths", value: "30 min or 60 min" },
  { label: "Calendar states", value: "Green, Yellow, Grey" },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="surface-card relative overflow-hidden">
          <div className="section-kicker">UT Austin mentorship system</div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-[var(--ink)] sm:text-6xl">
            AI answers the first question. Ambassadors handle the real one.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            UT AmbassadorAI gives prospective and current students a faster way into campus life:
            grounded answers, matched mentors, and bookable guidance in one product loop.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ask"
              className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
            >
              Ask the campus AI
            </Link>
            <Link
              href="/ambassadors"
              className="rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            >
              Browse ambassadors
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {METRICS.map((item) => (
              <div key={item.label} className="metric-pill">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {item.label}
                </div>
                <div className="mt-2 text-base font-semibold text-[var(--ink)]">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="surface-card flex flex-col justify-between gap-6 bg-[var(--paper-strong)]">
          <div>
            <div className="section-kicker">Recommended demo path</div>
            <ol className="mt-6 space-y-4 text-sm leading-6 text-[var(--muted)]">
              <li>1. Ask about MSITM, housing, clubs, or internships.</li>
              <li>2. Review the ambassadors suggested with the answer.</li>
              <li>3. Book a slot and switch into the ambassador role to confirm it.</li>
              <li>4. Switch into admin to upload a fresh campus note and ask again.</li>
            </ol>
          </div>
          <div className="rounded-[24px] bg-[var(--ink)] p-5 text-white">
            <div className="text-xs uppercase tracking-[0.22em] text-white/60">Hackathon angle</div>
            <p className="mt-3 text-lg font-medium leading-7">
              This is built as a hybrid AI + human mentorship loop, not a standalone chatbot.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {FEATURE_CARDS.map((card) => (
          <article key={card.title} className="surface-card">
            <div className="section-kicker">Core feature</div>
            <h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">{card.title}</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">{card.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

