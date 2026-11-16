import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in admin, or a redirect to the login page.
 *
 * The middleware only keeps the session cookie fresh; this is the check that
 * actually decides access to a server-rendered admin page. It is called from
 * `src/app/admin/layout.tsx`, so every page under `/admin` is guarded at once,
 * and from `admin/page.tsx` as well — a layout alone does not run again on
 * every navigation, but the page does, so the page re-checks.
 */
export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return user;
}
