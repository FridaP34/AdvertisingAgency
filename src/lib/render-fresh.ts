import { connection } from "next/server";

/**
 * Makes the page being rendered a fresh render for this request.
 *
 * Why this is needed: in development, Next can finish rendering a page's html
 * before the list read inside it has answered, and answer a later request with
 * that html — the list inside it current, the text around it from before the
 * save. That is exactly "the edit shows in the admin area but not on the site",
 * and it is what was seen here: the list read on every request carried the new
 * title, the page sent did not.
 *
 * `connection()` is Next's own signal that everything after this point is
 * per-request: nothing rendered past it is prepared ahead and reused, so the
 * page is rendered with the list read during that very render. A save in the
 * admin area already marks the routes it changed for re-rendering, so the next
 * view renders rather than serves the copy before it.
 */
export async function renderFresh(): Promise<void> {
  await connection();
}
