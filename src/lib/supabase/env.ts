/**
 * Supabase connection settings.
 *
 * Read once, here, so every client (server, browser, middleware) fails the
 * same way when the environment is incomplete — with a clear message instead
 * of an opaque `TypeError` deep inside the SDK.
 */

export type SupabaseEnv = { url: string; anonKey: string };

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "חסרים משתני הסביבה NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "יש להעתיק את .env.example ל-.env.local ולמלא אותם.",
    );
  }

  return { url, anonKey };
}

/** `true` when the two public variables are present. Never throws. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
