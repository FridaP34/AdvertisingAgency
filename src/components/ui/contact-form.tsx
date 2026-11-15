"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Status = "idle" | "sending" | "sent" | "error";

const fieldClass =
  "w-full rounded-sm border border-line bg-surface-base px-4 py-3 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors duration-300 hover:border-line-strong " +
  "focus:border-accent focus:outline-none";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "שליחה נכשלה");
      }

      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שליחה נכשלה");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-sm border border-accent/40 bg-accent-glow px-8 py-12 text-center">
        <p className="text-lg font-bold text-white">ההודעה נשלחה. תודה!</p>
        <p className="mt-2 text-sm text-ink-dim">נחזור אליכם בהקדם.</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-accent underline-offset-4 hover:underline"
        >
          שליחת הודעה נוספת
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.18em] text-ink-faint">שם</span>
          <input name="name" required autoComplete="name" className={fieldClass} placeholder="השם שלכם" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.18em] text-ink-faint">טלפון</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            className={cn(fieldClass, "text-start")}
            placeholder="050-0000000"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-ink-faint">דואר אלקטרוני</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className={cn(fieldClass, "text-start")}
          placeholder="name@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-ink-faint">הודעה</span>
        <textarea name="message" required rows={5} className={cn(fieldClass, "resize-y")} placeholder="על מה תרצו לדבר?" />
      </label>

      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0" tabIndex={-1}>
        <label>
          אתר
          <input name="website" type="text" autoComplete="off" tabIndex={-1} />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-2 inline-flex items-center justify-center rounded-sm border border-transparent bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] px-8 py-3.5 text-sm font-medium text-[#140a0c] transition-opacity duration-300 hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? "שולח…" : "שליחת הודעה"}
      </button>
    </form>
  );
}
