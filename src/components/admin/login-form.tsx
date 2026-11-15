"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { adminFieldClass } from "./styles";

/** Supabase's messages are in English; these are the ones a user can hit. */
function translate(message: string): string {
  if (/invalid login credentials/i.test(message)) return "שם משתמש או סיסמה שגויים";
  if (/email not confirmed/i.test(message)) return "המשתמש עדיין לא אושר";
  if (/rate limit|too many/i.test(message)) return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות";
  return "ההתחברות נכשלה. נסו שוב";
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(translate(authError.message));
      setSending(false);
      return;
    }

    // Refresh so the server sees the new session cookie before rendering.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-ink-faint">דואר אלקטרוני</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          dir="ltr"
          autoFocus
          className={adminFieldClass}
          placeholder="name@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-ink-faint">סיסמה</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={adminFieldClass}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="mt-2 rounded-sm bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] px-8 py-3 text-sm font-medium text-[#140a0c] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {sending ? "מתחבר…" : "כניסה"}
      </button>
    </form>
  );
}
