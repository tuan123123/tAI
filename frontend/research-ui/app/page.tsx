"use client";

import { useState } from "react";
import Image from "next/image";


type AgentOutput = {
  topic: string;
  summary: string;
  sources: string[];
  tools_used: string[];
  image_b64?: string | null; 
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState<AgentOutput | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setOutput(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const res = await fetch(`${API_BASE}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = (await res.json()) as AgentOutput;
      setOutput(data);
    } catch (error) {
      console.error("Failed to fetch research:", error);

      setOutput({
        topic: "Error",
        summary:
          "Something went wrong while contacting the research agent. Please make sure the backend is running.",
        sources: [],
        tools_used: [],
        image_b64: null,
      });
    } finally {
      setLoading(false);
    }
  }

  const imageSrc =
    output?.image_b64 ? `data:image/png;base64,${output.image_b64}` : null;

  return (
    <main className="min-h-screen px-4 py-10">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-120px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute right-[-140px] bottom-[-140px] h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs">AI Research Agent</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Research Agent UI
          </h1>
        </header>

        {/* Input card */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="text-sm font-medium text-white/80">
              Your input
            </label>

            <textarea
              className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none placeholder:text-white/40 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20"
              rows={5}
              placeholder='Ask for research... or ask "show me a picture of ..."'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={500}
            />

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Submit"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOutput(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Clear
              </button>

              <div className="ml-auto text-xs text-white/50">
                {query.trim().length}/500
              </div>
            </div>
          </form>
        </section>

        {/* Output card */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80">Output</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60">
              {output ? "Ready" : "Waiting"}
            </span>
          </div>

          {!output ? (
            <p className="text-sm text-white/60">Submit a query to see results.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Topic
                </div>
                <div className="mt-1 text-white/90">{output.topic}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Summary
                </div>
                <div className="mt-1 whitespace-pre-wrap text-white/90">
                  {output.summary}
                </div>
              </div>

              {/* Image block */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Image
                  </div>
                  <span className="text-xs text-white/50">
                    {imageSrc ? "Generated" : "None"}
                  </span>
                </div>

                {!imageSrc ? (
                  <p className="text-sm text-white/60">
                    Ask for an image (e.g., “Generate a picture of a medieval
                    library”).
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
                      <Image
                        src={imageSrc}
                        alt="Generated"
                        width={1024}
                        height={1024}
                        className="block h-auto w-full"
                        unoptimized
                      />
                    </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Sources
                  </div>

                  {output.sources.length === 0 ? (
                    <p className="mt-2 text-sm text-white/60">
                      No sources returned.
                    </p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
                      {output.sources.map((s, i) => (
                        <li key={i}>
                          <a
                            href={s}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-indigo-200 hover:text-indigo-100"
                          >
                            {s}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Tools used
                  </div>

                  {output.tools_used.length === 0 ? (
                    <p className="mt-2 text-sm text-white/60">
                      No tools used.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {output.tools_used.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
