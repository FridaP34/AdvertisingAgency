"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forgetRemoteWorks } from "@/lib/works";
import type { WorkDraft } from "@/lib/works/draft";
import type { WorkType } from "@/content/types";

/**
 * Creates or updates a work together with its ordered assets.
 *
 * Assets are replaced as a set (delete, then insert in order). The images
 * themselves live in Storage and are uploaded by the browser before this runs,
 * so a save is one small transaction rather than a re-upload.
 */

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const TYPES: WorkType[] = ["single-ad", "teaser", "branding", "brochure"];
const SLUG_RE = /^[a-z0-9א-ת-]+$/;

export async function saveWork(draft: WorkDraft): Promise<SaveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "פגה ההתחברות. יש להתחבר שוב." };

  // Every text field is read defensively: a draft that arrives without one
  // (an older browser tab, a direct call) gets a clear message rather than a
  // crash that leaves the manager staring at a blank page.
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const title = text(draft?.title).trim();
  const slug = text(draft?.slug).trim().toLowerCase();
  const client = text(draft?.client).trim();
  const category = text(draft?.category).trim();

  if (title.length < 2) return { ok: false, error: "נא למלא כותרת" };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "הכתובת יכולה להכיל אותיות, ספרות ומקפים בלבד" };
  }
  if (category.length < 2) return { ok: false, error: "נא למלא תחום" };
  if (!TYPES.includes(draft.type)) return { ok: false, error: "סוג עבודה לא תקין" };

  const row = {
    slug,
    title,
    client,
    category,
    work_type: draft.type,
    // `summary` is a not-null column: an empty description is saved as "".
    summary: text(draft.summary).trim(),
    story: text(draft.story).trim() || null,
    year: text(draft.year).trim() || null,
    published: draft.published,
    display_order: Number.isFinite(draft.order) ? draft.order : 100,
  };

  const assets = Array.isArray(draft.assets) ? draft.assets : [];
  let id = draft.id;

  if (id) {
    // The place in the list belongs to the list: it is set by dragging there
    // and numbered on save. Editing a work must not move it, so its order is
    // left as the database has it rather than taken from the form.
    const { display_order: _order, ...changes } = row;
    // `select("id")` is what tells a matched update from one that matched no
    // row — a work deleted meanwhile would otherwise report a false success.
    const { data: updated, error } = await supabase.from("works").update(changes).eq("id", id).select("id");
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "הכתובת הזו כבר תפוסה בעבודה אחרת" : "השמירה נכשלה",
      };
    }
    if (!updated || updated.length === 0) {
      return { ok: false, error: "העבודה לא נמצאה — ייתכן שנמחקה בינתיים. חזרו לרשימה ונסו שוב." };
    }
  } else {
    const { data, error } = await supabase.from("works").insert(row).select("id").single();
    if (error || !data) {
      return {
        ok: false,
        error: error?.code === "23505" ? "הכתובת הזו כבר תפוסה בעבודה אחרת" : "יצירת העבודה נכשלה",
      };
    }
    id = data.id as string;
  }

  // A save with a file that never finished uploading would point at an empty
  // address; the picture would then be missing on the site with no warning.
  if (assets.some((asset) => !asset || !asset.src)) {
    return { ok: false, error: "יש קובץ שלא נטען כראוי. יש להסיר אותו מהרשימה ולבחור אותו שוב." };
  }

  // Keep the current rows in hand before replacing the set: they are the
  // safety net if the new set fails to save.
  const { data: existing, error: readError } = await supabase
    .from("works_assets")
    .select("work_id, url, asset_type, caption, width, height, display_order")
    .eq("work_id", id)
    .order("display_order", { ascending: true });
  if (readError) return { ok: false, error: "שמירת הקבצים נכשלה" };
  const previous = existing ?? [];

  // A safe guard for the replace-as-a-set write below: if the form arrived
  // with no assets while the database still holds some, the form was opened
  // without its images (a failed read, a stale tab). Saving then would wipe
  // every picture of the work — refuse instead and ask for a reload.
  if (assets.length === 0 && previous.length > 0) {
    return {
      ok: false,
      error:
        "התמונות של העבודה לא נטענו לטופס, ולכן השמירה עלולה למחוק אותן. רעננו את העמוד ונסו שוב; אם זה חוזר — פנו לתמיכה.",
    };
  }

  const { error: clearError } = await supabase.from("works_assets").delete().eq("work_id", id);
  if (clearError) return { ok: false, error: "שמירת הקבצים נכשלה" };

  if (assets.length > 0) {
    const { error: assetsError } = await supabase.from("works_assets").insert(
      assets.map((asset, index) => ({
        work_id: id,
        url: asset.src,
        asset_type: asset.type,
        caption: text(asset?.caption).trim() || null,
        // For a PDF, `height` is the page count (the public reader's way to
        // know how many pages there are), and `width` is the first page's
        // width — enough for the reader to hold the page's shape before the
        // picture loads. A file's own byte size is never stored here.
        width: asset.width ?? null,
        height: asset.type === "pdf" ? (asset.pages?.length ?? null) : (asset.height ?? null),
        display_order: (index + 1) * 10,
      })),
    );
    if (assetsError) {
      // The set was cleared and the new one did not arrive: put the old
      // pictures back rather than leave the work empty.
      if (previous.length > 0) await supabase.from("works_assets").insert(previous);
      return { ok: false, error: "שמירת הקבצים נכשלה" };
    }
  }

  // Drop the kept list and bump the generation *before* the pages are
  // re-rendered below. The bump is what makes a page rendered again pick up
  // the edit: a page refreshed while the old reads were still kept would be
  // filled with the work as it was before the edit, and then stay that way
  // until the next edit.
  forgetRemoteWorks();

  // `"layout"` re-renders every page under the root layout — the gallery,
  // every work page (the address may have changed) and the home page — not
  // only the one address named here. Editing the details of a work alone left
  // its old text on the site; this is what refreshes it at once.
  revalidatePath("/", "layout");

  return { ok: true, id };
}
