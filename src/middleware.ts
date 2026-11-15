import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/** Keeps a refreshed session cookie readable for a month. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Keeps the admin's session cookie fresh. Runs only on `/admin/*`, so the
 * public site's pages are not made private by a session read.
 */
export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();

  const response = NextResponse.next({ request: { headers: request.headers } });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          const writable = { ...options, maxAge: COOKIE_MAX_AGE };
          request.cookies.set({ name, value, ...writable });
          response.cookies.set({ name, value, ...writable });
        });
      },
    },
  });

  // Only the cookie refresh matters here; the page's own guard decides access.
  return supabase.auth.getUser().then(() => response);
}

export const config = {
  matcher: ["/admin/:path*"],
};
