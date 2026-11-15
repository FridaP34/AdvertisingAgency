import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkDraft } from "@/lib/works/draft";
import type { WorkAsset } from "@/lib/works/types";
import { pdfFirstPage } from "@/lib/works/pages";
import type { WorkType } from "@/content/types";

/**
 * Server-side reads and writes for the admin area.
 *
 * Every call runs as the signed-in user, so Row Level Security decides what is
 * visible and writable — the admin code never needs to trust the browser.
 */

export type AdminWorkSummary = {
  id: string;
  slug: string;
  title: string;
  client: string;
  type: WorkType;
  published: boolean;
  order: number;
  cover: string | null;
};

type WorkRow = {
  id: string;
  slug: string;
  title: string;
  client: string;
  work_type: WorkType;
  published: boolean;
  display_order: number;
  works_assets:
    | { url: string; asset_type: string; width: number | null; height: number | null; display_order: number }[]
    | null;
};

type FullWorkRow = Omit<WorkRow, "works_assets"> & {
  category: string;
  summary: string | null;
  story: string | null;
  year: string | null;
  works_assets: AssetRow[] | null;
};

type AssetRow = {
  url: string;
  asset_type: "image" | "pdf";
  caption: string | null;
  width: number | null;
  height: number | null;
  display_order: number;
};

/** Throws an `Error` with `message` set to a Hebrew, user-facing text. */
function fail(message: string, detail?: string): never {
  if (detail) console.error(`[admin] ${message}:`, detail);
  throw new Error(message);
}

export async function listAllWorks(): Promise<AdminWorkSummary[]> {
  const supabase = await createSupabaseServerClient();
  // The list must follow the database, not a cached render: a work saved from
  // the form has to appear in it the moment the admin is sent back here.
  const { data, error } = await supabase
    .from("works")
    .select(
      "id, slug, title, client, work_type, published, display_order, " +
        "works_assets(url, asset_type, width, height, display_order)",
    )
    .order("display_order", { ascending: true });

  if (error) fail("טעינת העבודות נכשלה", error.message);

  return (data as unknown as WorkRow[]).map((row) => {
    const assets = [...(row.works_assets ?? [])].sort((a, b) => a.display_order - b.display_order);
    const image = assets.find((asset) => asset.asset_type === "image");
    // A work saved from a PDF has no image row; its thumbnail is the first
    // page rendered beside the file, so the list never shows it as empty.
    // Its page is used whether or not the stored page count was written — a
    // work saved before the count was kept still has its page beside the file.
    const pdf = assets.find((asset) => asset.asset_type === "pdf");
    const cover =
      image?.url ??
      (pdf
        ? pdfFirstPage({
            src: pdf.url,
            type: "pdf",
            width: pdf.width ?? undefined,
            pages: Array.from({ length: pdf.height ?? 0 }, () => ({ width: 0, height: 0 })),
          }).src
        : null);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      client: row.client,
      type: row.work_type,
      published: row.published,
      order: row.display_order,
      cover,
    };
  });
}

export async function getWorkForEdit(id: string): Promise<WorkDraft | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      "id, slug, title, client, work_type, published, display_order, category, summary, story, year, " +
        "works_assets(url, asset_type, caption, width, height, display_order)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) fail("טעינת העבודה נכשלה", error.message);
  if (!data) return null;

  const row = data as unknown as FullWorkRow;

  const assets: WorkAsset[] = [...(row.works_assets ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((asset) => {
      if (asset.asset_type === "pdf") {
        // The stored columns keep a PDF's page count, not a picture's size.
        // The form only needs to know the pages exist, so it shows them; a
        // save writes the count back from `pages.length`.
        const unknown = { width: 0, height: 0 };
        return {
          src: asset.url,
          type: "pdf" as const,
          caption: asset.caption ?? undefined,
          pages: Array.from({ length: asset.height ?? 0 }, () => unknown),
        };
      }
      return {
        src: asset.url,
        type: "image" as const,
        caption: asset.caption ?? undefined,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      };
    });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    client: row.client,
    category: row.category,
    type: row.work_type,
    summary: row.summary ?? "",
    story: row.story ?? "",
    year: row.year ?? "",
    published: row.published,
    order: row.display_order,
    assets,
  };
}
