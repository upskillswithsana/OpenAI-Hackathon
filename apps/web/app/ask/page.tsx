"use client";

import Link from "next/link";
import { useState } from "react";

import { AmbassadorCard } from "@/components/ambassador-card";
import { useSession } from "@/components/session-provider";
import { ApiError, askQuestion } from "@/lib/api";
import type { AskResponse } from "@/lib/types";

const STARTER_QUESTIONS = [
  "How difficult is the MSITM program at McCombs?",
  "What housing options exist near campus for grad students?",
  "Which clubs are good for consulting and networking?",
];

export default function AskPage() {
  const { session } = useSession();
  const [question, setQuestion] = useState(STARTER_QUESTIONS[0]);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!session?.token) {
      setError("Select a demo user first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await askQuestion(session.token, question);
      setResponse(result);
    } catch (value) {
      const message = value instanceof ApiError ? value.message : "Unable to answer right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card space-y-6">
        <div>
          <div className="section-kicker">AI campus assistant</div>
          <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">Ask a campus question</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            The answer is grounded in the seeded UT knowledge base and paired with the best-fit
            ambassadors for follow-up mentorship.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-left text-sm text-[var(--ink)] transition hover:border-[var(--accent)]"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            className="min-h-48 w-full rounded-[24px] border border-[var(--line)] bg-white/80 p-5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] transition focus:ring-2"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about programs, campus life, housing, internships, or clubs."
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={loading}
            className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-60"
          >
            {loading ? "Generating answer..." : "Ask Ambassador Connect"}
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <article className="surface-card min-h-72">
          <div className="section-kicker">Answer + evidence</div>
          {error ? (
            <p className="mt-6 rounded-2xl bg-[#ffe7e5] px-4 py-3 text-sm text-[#8d2c30]">{error}</p>
          ) : null}

          {response ? (
            <>
              <p className="mt-6 text-lg leading-8 text-[var(--ink)]">{response.answer}</p>
              <div className="mt-8 space-y-3">
                {response.citations.map((citation) => (
                  <div
                    key={`${citation.title}-${citation.snippet}`}
                    className="rounded-[22px] border border-[var(--line)] bg-white/75 p-4"
                  >
                    <div className="text-sm font-semibold text-[var(--ink)]">{citation.title}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {citation.snippet}
                    </div>
                    {citation.source ? (
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {citation.source}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 text-base leading-7 text-[var(--muted)]">
              Submit a question to see grounded campus guidance and ambassador recommendations.
            </p>
          )}
        </article>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-kicker">Suggested ambassadors</div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Match quality is based on program, interests, and topic overlap.
              </p>
            </div>
            <Link
              href="/ambassadors"
              className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Open full directory
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {response?.suggested_ambassadors.length ? (
              response.suggested_ambassadors.map((ambassador) => (
                <AmbassadorCard key={ambassador.user_id} ambassador={ambassador} />
              ))
            ) : (
              <div className="surface-card md:col-span-2">
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Suggested ambassadors will appear here once the AI has enough context.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


