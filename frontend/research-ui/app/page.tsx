"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { NextApiRequest, NextApiResponse } from "next";

type AgentOutput = {
  topic: string;
  summary: string;
  sources: string[];
  tools_used: string[];
  image_b64?: string | null;
};

type HistoryItem = {
  id: string;
  query: string;
  output: AgentOutput;
  createdAt: number;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
  );
}

function Toast({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="text-sm font-semibold text-white/90">{title}</div>
            {message ? (
              <div className="mt-1 text-sm text-white/70">{message}</div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const cardIn = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const [API_BASE, setApiBase] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/config", { cache: "no-store" });
        const d = await r.json();
        setApiBase(d?.apiBaseUrl ?? "");
        console.log("CONFIG apiBaseUrl =", d?.apiBaseUrl);
      } catch (e) {
        console.error("Failed to load /api/config", e);
        setApiBase("");
      }
    })();
  }, []);

  const [query, setQuery] = useState("");
  const [output, setOutput] = useState<AgentOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const [activeTab, setActiveTab] = useState<"summary" | "sources" | "tools">(
    "summary",
  );
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    msg?: string;
  }>({
    open: false,
    title: "",
    msg: "",
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const imageSrc = useMemo(() => {
    if (!output?.image_b64) return null;
    return `data:image/png;base64,${output.image_b64}`;
  }, [output?.image_b64]);

  const examples = useMemo(
    () => [
      "Summarize the latest breakthroughs in solid-state batteries",
      "Compare Stripe vs Adyen for a SaaS business",
      "Explain CRISPR gene editing like I'm 12",
      "Generate a picture of a futuristic Tokyo street at night",
      "Give a balanced overview of EV battery recycling",
      "Create a short research brief on GLP-1 medications",
    ],
    [],
  );

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setOutput(null);
    setActiveTab("summary");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      if (!API_BASE) {
        throw new Error("API base URL is not set (check /api/config).");
      }

      const res = await fetch(`${API_BASE}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as AgentOutput;
      setOutput(data);

      setHistory((prev) =>
        [
          {
            id: crypto.randomUUID(),
            query: q,
            output: data,
            createdAt: Date.now(),
          },
          ...prev,
        ].slice(0, 20),
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setToast({ open: true, title: "Stopped", msg: "Request cancelled." });
        setOutput({
          topic: "Cancelled",
          summary: "The request was cancelled.",
          sources: [],
          tools_used: [],
          image_b64: null,
        });
      } else {
        setOutput({
          topic: "Error",
          summary:
            "Could not reach the research agent.\n\n• Is the backend running?\n• Is NEXT_PUBLIC_API_BASE_URL correct?\n• Any CORS/network issues?",
          sources: [],
          tools_used: [],
          image_b64: null,
        });
        setToast({
          open: true,
          title: "Request failed",
          msg: "Check backend/API base URL.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    abortRef.current?.abort();
    setQuery("");
    setOutput(null);
    setActiveTab("summary");
  }

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ open: true, title: "Copied", msg: okMsg });
    } catch {
      setToast({
        open: true,
        title: "Copy failed",
        msg: "Clipboard permission denied.",
      });
    }
  }

  const canSubmit = !loading && query.trim().length > 0;

  return (
    <main className="min-h-screen text-white">
      {/* VIBRANT animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#06060a]" />
        <motion.div
          className="absolute -top-48 left-1/2 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 blur-3xl"
          animate={{ y: [0, 18, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-56 -left-48 h-[620px] w-[620px] rounded-full bg-gradient-to-tr from-emerald-400/20 via-teal-400/15 to-indigo-500/20 blur-3xl"
          animate={{ y: [0, -14, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.45) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-xl">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  loading ? "bg-amber-400" : "bg-emerald-400",
                )}
              />
              <span>{loading ? "Working…" : "Online"}</span>
              <span className="mx-1 text-white/30">•</span>
              <span className="text-white/60"></span>
            </div>

            <h1 className="mt-4 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
              tAI
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Deep-dive summaries, citations, tools used, and optional image.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-lg shadow-black/30 backdrop-blur-xl hover:bg-white/10"
            >
              {showHistory ? "Hide history" : "Show history"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={clearAll}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-lg shadow-black/30 backdrop-blur-xl hover:bg-white/10"
            >
              Reset
            </motion.button>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-6 md:grid-cols-[360px_1fr]">
          {/* Sidebar */}
          <AnimatePresence>
            {showHistory ? (
              <motion.aside
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white/85">
                    Recent
                  </h2>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-white/60">
                    {history.length}/20
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                      No history yet. Run a query and it’ll appear here.
                    </div>
                  ) : (
                    history.map((h) => (
                      <motion.button
                        key={h.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setQuery(h.query);
                          setOutput(h.output);
                          setActiveTab("summary");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:bg-white/5"
                      >
                        <div className="line-clamp-2 text-sm text-white/85">
                          {h.query}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-white/50">
                          <span className="truncate">
                            {h.output.topic || "Untitled"}
                          </span>
                          <span>{formatTime(h.createdAt)}</span>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                    Suggested prompts
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {examples.slice(0, 4).map((ex) => (
                      <motion.button
                        key={ex}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setQuery(ex);
                          textareaRef.current?.focus();
                          setToast({
                            open: true,
                            title: "Loaded",
                            msg: "Prompt inserted.",
                          });
                        }}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75 hover:bg-white/10"
                      >
                        {ex.length > 28 ? ex.slice(0, 28) + "…" : ex}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          {/* Main */}
          <div className="space-y-6">
            {/* Input card */}
            <motion.section
              variants={cardIn}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.35 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white/90">
                      Ask anything
                    </div>
                    <div className="text-xs text-white/60">
                      Try “compare…”, “summarize…”, or “generate a picture…”
                    </div>
                  </div>
                  <div className="text-xs text-white/50">
                    {query.trim().length}/500
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    className="min-h-[140px] w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-fuchsia-300/60 focus:ring-2 focus:ring-fuchsia-400/20"
                    placeholder='e.g. "Give me a research brief on small modular reactors"'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={500}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <motion.button
                    whileHover={{ scale: canSubmit ? 1.03 : 1 }}
                    whileTap={{ scale: canSubmit ? 0.98 : 1 }}
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-lg transition",
                      canSubmit
                        ? "bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-white shadow-fuchsia-500/20 hover:brightness-110"
                        : "cursor-not-allowed bg-white/10 text-white/40",
                    )}
                  >
                    {loading ? <Spinner /> : null}
                    {loading ? "Thinking…" : "Run research"}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: loading ? 1.03 : 1 }}
                    whileTap={{ scale: loading ? 0.98 : 1 }}
                    type="button"
                    disabled={!loading}
                    onClick={() => abortRef.current?.abort()}
                    className={cn(
                      "rounded-2xl border px-4 py-2 text-sm transition",
                      loading
                        ? "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                        : "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
                    )}
                  >
                    Stop
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={clearAll}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
                  >
                    Clear
                  </motion.button>

                  <div className="sm:ml-auto text-xs text-white/55">
                    {API_BASE ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
                        API configured
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1">
                        Missing NEXT_PUBLIC_API_BASE_URL
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </motion.section>

            {/* Output card */}
            <motion.section
              variants={cardIn}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white/90">
                    Output
                  </h2>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      loading
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-100/80"
                        : output
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100/80"
                          : "border-white/10 bg-white/5 text-white/60",
                    )}
                  >
                    {loading ? "Working" : output ? "Ready" : "Waiting"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: output?.summary ? 1.03 : 1 }}
                    whileTap={{ scale: output?.summary ? 0.98 : 1 }}
                    type="button"
                    disabled={!output?.summary}
                    onClick={() =>
                      output?.summary &&
                      copyText(output.summary, "Summary copied.")
                    }
                    className={cn(
                      "rounded-2xl border px-3 py-1.5 text-xs transition",
                      output?.summary
                        ? "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                        : "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
                    )}
                  >
                    Copy summary
                  </motion.button>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { id: "summary", label: "Summary" },
                  { id: "sources", label: "Sources" },
                  { id: "tools", label: "Tools" },
                ].map((t) => (
                  <motion.button
                    key={t.id}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() =>
                      setActiveTab(t.id as "summary" | "sources" | "tools")
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      activeTab === t.id
                        ? "border-fuchsia-300/30 bg-fuchsia-500/15 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                    )}
                  >
                    {t.label}
                    {t.id === "sources" && output?.sources?.length ? (
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                        {output.sources.length}
                      </span>
                    ) : null}
                    {t.id === "tools" && output?.tools_used?.length ? (
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                        {output.tools_used.length}
                      </span>
                    ) : null}
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                {/* Text */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                      Topic
                    </div>
                    <div className="mt-1 text-white/90">
                      {loading ? "…" : output?.topic || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                      {activeTab === "summary"
                        ? "Summary"
                        : activeTab === "sources"
                          ? "Sources"
                          : "Tools used"}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${activeTab}-${loading ? "loading" : "ready"}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="mt-2"
                      >
                        {loading ? (
                          <div className="space-y-2">
                            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-11/12 animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-10/12 animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-9/12 animate-pulse rounded bg-white/10" />
                          </div>
                        ) : !output ? (
                          <p className="text-sm text-white/65">
                            Submit a query to see results.
                          </p>
                        ) : activeTab === "summary" ? (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                            {output.summary || "—"}
                          </div>
                        ) : activeTab === "sources" ? (
                          output.sources.length === 0 ? (
                            <p className="text-sm text-white/65">
                              No sources returned.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {output.sources.map((s, i) => (
                                <li
                                  key={i}
                                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                                >
                                  <a
                                    href={s}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="break-all text-cyan-200 hover:text-cyan-100"
                                  >
                                    {s}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : output.tools_used.length === 0 ? (
                          <p className="text-sm text-white/65">
                            No tools used.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
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
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Image panel */}
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                        Image
                      </div>
                      <span className="text-xs text-white/50">
                        {loading ? "…" : imageSrc ? "Generated" : "None"}
                      </span>
                    </div>

                    {!imageSrc ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                        Ask for an image, e.g.{" "}
                        <span className="text-white/80">
                          “Generate a picture of a medieval library”
                        </span>
                        .
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 22,
                        }}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                      >
                        <Image
                          src={imageSrc}
                          alt="Generated"
                          width={1024}
                          height={1024}
                          className="block h-auto w-full"
                          unoptimized
                        />
                      </motion.div>
                    )}

                    {imageSrc ? (
                      <div className="mt-3 grid gap-2">
                        <motion.a
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-white/85 hover:bg-white/10"
                          href={imageSrc}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open image
                        </motion.a>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/30 backdrop-blur-xl">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                      Quick actions
                    </div>
                    <div className="mt-3 grid gap-2">
                      <motion.button
                        whileHover={{ scale: output ? 1.02 : 1 }}
                        whileTap={{ scale: output ? 0.98 : 1 }}
                        disabled={!output}
                        onClick={() => {
                          if (!output) return;
                          const text =
                            `Topic: ${output.topic}\n\n` +
                            `${output.summary}\n\n` +
                            (output.sources.length
                              ? `Sources:\n- ${output.sources.join("\n- ")}\n\n`
                              : "") +
                            (output.tools_used.length
                              ? `Tools:\n- ${output.tools_used.join("\n- ")}`
                              : "");
                          copyText(text, "Full report copied.");
                        }}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs transition",
                          output
                            ? "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                            : "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
                        )}
                      >
                        Copy full report
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        title={toast.title}
        message={toast.msg}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </main>
  );
}
