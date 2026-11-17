import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in admin, or a redirect to the login page.
 *
 * The middleware only keeps the session cookie fresh; this is the check that
 * actually decides access to a server-rendered admin page. It is called from
 * `src/app/admin/(protected)/layout.tsx`, so every protected admin page is
 * guarded at once, and from the admin pages as well — a layout alone does not
 * run again on every navigation, but the page does, so the page re-checks.
 *
 * Only pages inside `admin/(protected)/` may call it. The login page lives in
 * `admin/(public)/login/` and must not: a guard that redirects to
 * `/admin/login` from `/admin/login` itself is an endless redirect.
 */
export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return user;
}
