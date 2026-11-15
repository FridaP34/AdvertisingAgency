"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Supabase client for Client Components (the admin area's interactive parts).
 *
 * Only the public anon key is used. Every admin table is protected by Row
 * Level Security, so this key on its own cannot read or write anything.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "חסרים משתני הסביבה NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
