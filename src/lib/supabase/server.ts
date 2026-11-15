import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * The cookies are read-only in Server Components, so the `setAll` callback is
 * wrapped: when Next.js refuses to write (RSC render), the refreshed session is
 * persisted by `middleware.ts` instead. Server Actions and Route Handlers can
 * write cookies and take that path normally.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — the middleware handles it.
        }
      },
    },
  });
}
