/**
 * Brings the stand-in's stored files back in line with the database.
 *
 * Two kinds of pictures can be missing from `local-supabase-data/storage/works`:
 *
 *   • Works that came from the starting folder (`/works/<slug>/…`, a path the
 *     site itself serves), which never had their file copied into the bucket.
 *   • Files that were deleted with an earlier work, or lost with a folder.
 *
 * Both are taken from a copy that still has them — the project's own
 * `public/works` first, then the untouched backup of the starting folder —
 * and stored as ordinary objects, so every ad the database lists has a file.
 *
 * Nothing in the database is changed: the run only reports and copies files.
 *
 *   node tools/sync-standin-storage.mjs            → report only
 *   node tools/sync-standin-storage.mjs --write    → copy the missing files
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const DB_URL = process.env.LOCAL_DB_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres";
const FILES = path.resolve("local-supabase-data/storage/works");
const PUBLIC_PREFIX = "/storage/v1/object/public/works/";

const SOURCES = [
  path.resolve("public/works"),
  path.resolve("../MindyWebsite-backup-unused-20261110-1347/public-works"),
];

const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });

/** The name an asset's URL points at inside the bucket. */
function objectName(url) {
  const trimmed = url.trim();
  // A stored address is not always a bare path — the editor and older works
  // kept a full URL, sometimes without the port — so the bucket's prefix is
  // looked for wherever it starts.
  const at = trimmed.indexOf(PUBLIC_PREFIX);
  if (at !== -1) return decodeURIComponent(trimmed.slice(at + PUBLIC_PREFIX.length));
  if (trimmed.startsWith("/works/")) return decodeURIComponent(trimmed.slice("/works/".length));
  return null;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const { rows } = await pool.query(
  `select w.slug, w.title, a.url from public.works w
     join public.works_assets a on a.work_id = w.id
    order by w.slug, a.display_order`,
);

const missing = [];
for (const row of rows) {
  const name = objectName(row.url);
  if (!name) {
    missing.push({ ...row, name: row.url, reason: "כתובת לא מוכרת" });
    continue;
  }
  if (!(await exists(path.join(FILES, name)))) missing.push({ ...row, name, reason: "הקובץ חסר" });
}

console.log(`assets in the database: ${rows.length}, missing files: ${missing.length}`);

let copied = 0;
const unfound = [];
for (const item of missing) {
  const source = SOURCES.map((dir) => path.join(dir, item.name));
  const found = [];
  for (const file of source) if (await exists(file)) found.push(file);

  console.log(`${found.length ? "found" : "NOT FOUND"}  ${item.name}${found.length ? "" : `  (${item.slug})`}`);

  if (!found.length) {
    unfound.push(item);
    continue;
  }
  if (!WRITE) continue;

  const target = path.join(FILES, item.name);
  await mkdir(path.dirname(target), { recursive: true });
  // The project's own copy wins; the backup only fills in what it lacks.
  await writeFile(target, await readFile(found[0]));
  copied += 1;
}

await pool.end();

if (WRITE) console.log(`copied: ${copied}`);
if (unfound.length) {
  console.log("\nstill without a file — the picture itself is not on this computer:");
  for (const item of unfound) console.log(`  ${item.slug} → ${item.name} (${item.title})`);
}
