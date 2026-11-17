"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forgetRemoteWorks } from "@/lib/works";

/**
 * Server Actions for the admin area.
 *
 * Each one re-checks the session on the server — the middleware guard alone is
 * not treated as the security boundary, and Row Level Security backs it up at
 * the database level.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return supabase;
}

/** Persists the whole order shown in the admin list. */
export async function reorderWorks(ids: string[]): Promise<ActionResult> {
  const supabase = await requireUser();

  // One row per call, ten rows at a time: a network round trip per item keeps
  // the keys small, and the counts here stay well within Postgres limits.
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("works")
        .update({ display_order: (index + 1) * 10 })
        .eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, error: "שמירת הסדר נכשלה" };

  forgetRemoteWorks();
  revalidatePath("/admin");
  revalidatePath("/works");
  revalidatePath("/");
  return { ok: true };
}

export async function setWorkPublished(id: string, published: boolean): Promise<ActionResult> {
  const supabase = await requireUser();
  const { error } = await supabase.from("works").update({ published }).eq("id", id);
  if (error) return { ok: false, error: "עדכון המצב נכשל" };

  forgetRemoteWorks();
  revalidatePath("/admin");
  revalidatePath("/works");
  revalidatePath("/");
  return { ok: true };
}

const STORAGE_MARKER = "/storage/v1/object/public/works/";

/** "…/works/<slug>/<file>" → "<slug>/<file>"; anything else is left out. */
function storagePath(url: string): string {
  const cut = url.indexOf(STORAGE_MARKER);
  return cut === -1 ? "" : decodeURIComponent(url.slice(cut + STORAGE_MARKER.length));
}

/** Removes files from the `works` bucket, skipping anything not under it. */
async function deleteWorkFiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  paths: string[],
) {
  const safe = paths.filter((path) => path && !path.startsWith("/") && !path.includes(".."));
  if (safe.length === 0) return;

  const { error } = await supabase.storage.from("works").remove(safe);
  if (error) console.error("[admin] removing deleted work's files failed:", error.message);
}

/**
 * Deletes a work together with its files.
 *
 * The files' paths are read first, while the rows still say where they are,
 * then the row goes (its asset rows follow it), then Storage is cleared. A
 * failure to clear Storage is logged, not shown: the work is already gone.
 */
export async function deleteWork(id: string): Promise<ActionResult> {
  const supabase = await requireUser();

  const { data: assets } = await supabase.from("works_assets").select("url").eq("work_id", id);
  const { error } = await supabase.from("works").delete().eq("id", id);
  if (error) return { ok: false, error: "המחיקה נכשלה" };

  if (assets && assets.length > 0) {
    await deleteWorkFiles(
      supabase,
      assets.map((asset: { url: string }) => storagePath(asset.url)),
    );
  }

  forgetRemoteWorks();
  revalidatePath("/admin");
  revalidatePath("/works");
  revalidatePath("/");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
