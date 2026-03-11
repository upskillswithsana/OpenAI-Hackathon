"use client";

import { useState } from "react";

import { useSession } from "@/components/session-provider";
import { ApiError, uploadKnowledge } from "@/lib/api";

export default function AdminPage() {
  const { session } = useSession();
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("UT Demo Upload");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!session?.token) {
      return;
    }
    const formData = new FormData();
    formData.append("title", title);
    formData.append("source", source);
    if (content) {
      formData.append("content", content);
    }
    if (file) {
      formData.append("file", file);
    }

    try {
      const result = await uploadKnowledge(session.token, formData);
      setMessage(`Uploaded ${result.title} (${result.chunk_count} chunks).`);
      setError(null);
      setTitle("");
      setContent("");
      setFile(null);
    } catch (value) {
      const detail = value instanceof ApiError ? value.message : "Upload failed.";
      setError(detail);
    }
  }

  if (session?.user.role !== "admin") {
    return (
      <div className="surface-card text-sm leading-6 text-[var(--muted)]">
        Switch to the admin demo user to upload knowledge documents for the RAG pipeline.
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="surface-card">
        <div className="section-kicker">Knowledge ingestion</div>
        <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">Upload campus knowledge</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          This MVP accepts plain text or markdown and ingests it synchronously into the document and
          vector stores.
        </p>
      </section>

      <section className="surface-card space-y-5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Document title"
          className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
        />
        <input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Source label"
          className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste markdown or plain text here..."
          className="min-h-56 w-full rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
        />
        <input
          type="file"
          accept=".md,.markdown,.txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--muted)]"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--ink)]"
        >
          Upload to knowledge base
        </button>

        {message ? <p className="text-sm text-[#1f6a38]">{message}</p> : null}
        {error ? <p className="text-sm text-[#8d2c30]">{error}</p> : null}
      </section>
    </div>
  );
}
