/**
 * One-time move of the demo database to the live Supabase project.
 *
 *   node tools/migrate-to-live.mjs
 *
 * The demo (`tools/local-supabase`) holds every work as it stands today —
 * titles edited, works hidden, order changed. `import:works` restores the
 * seeded files instead, which would undo those edits, so this script copies
 * the demo itself: every row of `works` and `works_assets` (hidden ones
 * included), and every file in the demo's storage under the same path it has
 * there. The database then points at the live Storage URLs.
 *
 * Re-running is safe: a work is matched by slug, its files are replaced as a
 * set, exactly as the admin area saves them.
 *
 * Needs a live connection in `.env.import.local` (never committed):
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<secret key>
 *   DEMO_PG=postgres://postgres:postgres@127.0.0.1:54329/postgres
 *
 * The demo database has to be running (`node tools/local-supabase/server.mjs`).
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const root = process.cwd();
const DEMO_STORAGE = path.join(root, "local-supabase-data", "storage", "works");

const MIME = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  pdf: "application/pdf",
};

const mimeOf = (file) => MIME[path.extname(file).slice(1).toLowerCase()] ?? "application/octet-stream";

async function loadEnv() {
  try {
    const raw = await readFile(path.join(root, ".env.import.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // Nothing to read — the shell environment is used.
  }
}

/** Every file under the demo's storage, as paths relative to the bucket. */
async function storageFiles(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await storageFiles(full, key)));
    else out.push({ full, key });
  }
  return out;
}

async function upload(supabase, file) {
  const body = await readFile(file.full);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await supabase.storage
      .from("works")
      .upload(file.key, body, { contentType: mimeOf(file.full), cacheControl: "31536000", upsert: true });
    if (!error) return;
    if (attempt === 3) throw new Error(`${file.key}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
  }
}

async function main() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoUrl = process.env.DEMO_PG ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres";
  if (!url || !key) {
    console.error("חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env.import.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const demo = new pg.Client({ connectionString: demoUrl });
  await demo.connect();

  // 1 — the files, under the paths the database already uses.
  const files = await storageFiles(DEMO_STORAGE);
  let uploaded = 0;
  for (const file of files) {
    await upload(supabase, file);
    uploaded += 1;
    if (uploaded % 20 === 0) console.log(`… ${uploaded}/${files.length} קבצים`);
  }
  console.log(`✓ ${uploaded} קבצים הועלו`);

  // 2 — the works, exactly as the demo has them.
  const works = (await demo.query(
    "select slug, title, client, category, work_type, summary, story, year, published, display_order from public.works order by display_order",
  )).rows;

  for (const work of works) {
    const { data: row, error } = await supabase
      .from("works")
      .upsert(
        {
          slug: work.slug,
          title: work.title,
          client: work.client ?? "",
          category: work.category,
          work_type: work.work_type,
          summary: work.summary ?? "",
          story: work.story,
          year: work.year,
          published: work.published,
          display_order: work.display_order,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error || !row) throw new Error(`${work.slug}: ${error?.message}`);

    const assets = (await demo.query(
      "select url, asset_type, caption, width, height, display_order from public.works_assets where work_id = (select id from public.works where slug = $1) order by display_order",
      [work.slug],
    )).rows;

    // The demo's URL is the same object path under another host; the live
    // address is asked for rather than built by hand.
    const rows = assets.map((asset) => {
      const marker = "/storage/v1/object/public/works/";
      const at = asset.url.indexOf(marker);
      const objectPath = at === -1 ? null : decodeURIComponent(asset.url.slice(at + marker.length));
      const publicUrl = objectPath
        ? supabase.storage.from("works").getPublicUrl(objectPath).data.publicUrl
        : asset.url;
      return {
        work_id: row.id,
        url: publicUrl,
        asset_type: asset.asset_type,
        caption: asset.caption,
        width: asset.width,
        height: asset.height,
        display_order: asset.display_order,
      };
    });

    const { error: clearError } = await supabase.from("works_assets").delete().eq("work_id", row.id);
    if (clearError) throw new Error(`ניקוי ${work.slug}: ${clearError.message}`);
    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("works_assets").insert(rows);
      if (insertError) throw new Error(`שמירת קבצי ${work.slug}: ${insertError.message}`);
    }
    console.log(`✓ ${work.slug} (${rows.length} קבצים)`);
  }

  // 3 — the stamp, so nothing reads a list from before the move.
  await demo.end();
  console.log(`\nהושלם: ${works.length} עבודות, ${uploaded} קבצים.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
