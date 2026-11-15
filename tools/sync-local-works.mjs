/**
 * Local demo only: brings the local stand-in database in line with the work
 * assets just rebuilt from `SampleAds/`.
 *
 *   node tools/sync-local-works.mjs            # preview the changes
 *   node tools/sync-local-works.mjs --apply    # write them
 *
 * The preview lists, per work, what would change — new works, new or removed
 * images, updated titles and text — and writes nothing. With `--apply`:
 *
 *   * a work whose slug is missing is added;
 *   * a work whose images changed has its image rows rebuilt (text untouched);
 *   * a work that disappeared from `SampleAds/` is hidden, never deleted, so
 *     an accidental file move loses nothing from the admin area.
 *
 * It reads `src/lib/works/generated.ts` (not `data.ts`) and copies images from
 * `public/works/` into the local storage folder. Never point this at a real
 * Supabase project, and never use `npm run import:works` on this demo — that
 * re-imports everything and overwrites edits made in the admin area.
 */

import { readFile, mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import ts from "typescript";

const root = process.cwd();
const DB_URL = process.env.LOCAL_DB_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres";
const FILES = path.join(root, "local-supabase-data", "storage", "works");
const SEED = path.join(root, "src", "lib", "works", "generated.ts");
const PUBLIC_URL = "http://localhost:54321/storage/v1/object/public/works";
const APPLY = process.argv.includes("--apply");

/** Loads `generated.ts` through the TypeScript compiler — it is not plain JS. */
async function loadSeed() {
  const source = await readFile(SEED, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return mod.generatedWorks;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Copies a work's image and PDF files into local storage and returns their rows. */
async function imageRows(work) {
  const rows = [];
  for (const [index, asset] of work.assets.entries()) {
    const rel = asset.src.replace(/^\/works\//, "");
    const from = path.join(root, "public", "works", rel);
    const to = path.join(FILES, rel);
    if (!(await exists(from))) {
      console.warn(`  ? missing file ${rel}`);
      continue;
    }
    if (APPLY) {
      await mkdir(path.dirname(to), { recursive: true });
      await copyFile(from, to);
    }
    rows.push({
      url: `${PUBLIC_URL}/${rel}`,
      asset_type: asset.type,
      caption: asset.caption ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      display_order: (index + 1) * 10,
    });
  }
  return rows;
}

async function main() {
  const works = await loadSeed();
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();

  const added = [];
  const rebuilt = [];
  const renamed = [];
  const missing = [];

  try {
    const existing = await db.query(
      "select id, slug, title, client, category, work_type, summary, story, year, published " +
        "from works order by display_order",
    );
    const bySlug = new Map(existing.rows.map((row) => [row.slug, row]));
    const max = await db.query("select coalesce(max(display_order), 0) as top from works");
    let order = Number(max.rows[0].top);

    for (const work of works) {
      const rows = await imageRows(work);
      const current = bySlug.get(work.slug);

      if (!current) {
        added.push(work);
        if (!APPLY) continue;

        order += 10;
        const inserted = await db.query(
          `insert into works (slug, title, client, category, work_type, summary, story, year, published, display_order)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
          [
            work.slug,
            work.title,
            work.client,
            work.category,
            work.type,
            work.summary ?? null,
            work.story ?? null,
            work.year ?? null,
            work.published,
            order,
          ],
        );
        const id = inserted.rows[0].id;
        for (const row of rows) {
          await db.query(
            `insert into works_assets (work_id, url, asset_type, caption, width, height, display_order)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [id, row.url, row.asset_type, row.caption, row.width, row.height, row.display_order],
          );
        }
        continue;
      }

      // Images changed → the stored list must follow the new pieces exactly.
      const stored = await db.query(
        "select url from works_assets where work_id = $1 order by display_order",
        [current.id],
      );
      const before = stored.rows.map((r) => r.url).join("\n");
      const after = rows.map((r) => r.url).join("\n");
      const newUrls = rows.filter((r) => !before.includes(r.url));
      const goneUrls = stored.rows.filter((r) => !after.includes(r.url));

      if (before !== after) {
        rebuilt.push({ work, added: newUrls.length, removed: goneUrls.length });
        if (APPLY) {
          await db.query("delete from works_assets where work_id = $1", [current.id]);
          for (const row of rows) {
            await db.query(
              `insert into works_assets (work_id, url, asset_type, caption, width, height, display_order)
               values ($1,$2,$3,$4,$5,$6,$7)`,
              [current.id, row.url, row.asset_type, row.caption, row.width, row.height, row.display_order],
            );
          }
        }
      }

      // Text changes are listed only — the admin area is the place to edit them.
      const textChanged =
        current.title !== work.title ||
        current.category !== work.category ||
        current.client !== work.client ||
        current.work_type !== work.type;
      if (textChanged) renamed.push({ current, work });
    }

    // Works no longer in SampleAds/: hide, don't delete.
    const seedSlugs = new Set(works.map((w) => w.slug));
    for (const row of existing.rows) {
      if (seedSlugs.has(row.slug) || !row.published) continue;
      missing.push(row);
      if (APPLY) {
        await db.query("update works set published = false where id = $1", [row.id]);
      }
    }

    console.log(`\n${APPLY ? "Applied" : "Preview"}:`);
    console.log(`  ${added.length} new: ${added.map((w) => w.slug).join(", ") || "—"}`);
    for (const item of rebuilt) {
      console.log(`  ↻ ${item.work.slug}: images rebuilt (+${item.added} / −${item.removed})`);
    }
    for (const { current, work } of renamed) {
      const diffs = [];
      if (current.title !== work.title) diffs.push(`title "${current.title}" → "${work.title}"`);
      if (current.category !== work.category) diffs.push(`category "${current.category}" → "${work.category}"`);
      if (current.client !== work.client) diffs.push(`client "${current.client}" → "${work.client}"`);
      if (current.work_type !== work.type) diffs.push(`type ${current.work_type} → ${work.type}`);
      console.log(`  ! ${current.slug}: ${diffs.join("; ")}`);
    }
    console.log(`  ${missing.length} hidden: ${missing.map((r) => r.slug).join(", ") || "—"}`);
    if (!APPLY) console.log("\nNothing written — run with --apply to save.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
