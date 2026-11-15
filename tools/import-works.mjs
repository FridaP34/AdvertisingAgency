/**
 * One-time import: uploads the existing work assets from `public/works` to
 * Supabase Storage and inserts the seeded works into the database.
 *
 *   npm run import:works
 *
 * The seed file is TypeScript, so it is loaded through the TypeScript
 * compiler API (`typescript` is already a dev dependency) — no extra tooling.
 *
 * Requires (in .env.local or the shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← from Project Settings → API. Server only,
 *                                 never expose it to the browser.
 *
 * Runs without the app and needs the service role key because it bypasses RLS.
 * Re-running is safe: existing slugs are updated, not duplicated.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();

async function loadEnv() {
  // Minimal .env.local reader — no dependency on dotenv.
  try {
    const raw = await readFile(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local — fall back to the shell environment.
  }
}

const MIME = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

function mimeOf(file) {
  return MIME[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

/**
 * Compiles a TypeScript module to ESM in memory and evaluates it.
 * The seed file only has type imports and plain literals, so a transpile with
 * no module resolution is enough — nothing else needs to be imported at runtime.
 */
async function loadSeed() {
  const file = path.join(root, "src/lib/works/data.ts");
  const source = await readFile(file, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(dataUrl);
}

async function main() {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { works } = await loadSeed();
  if (!Array.isArray(works) || works.length === 0) {
    console.error("src/lib/works/data.ts לא מכיל עבודות לייבוא.");
    process.exit(1);
  }

  let uploaded = 0;

  for (const work of works) {
    const { data: row, error: workError } = await supabase
      .from("works")
      .upsert(
        {
          slug: work.slug,
          title: work.title,
          client: work.client,
          category: work.category,
          work_type: work.type,
          summary: work.summary,
          story: work.story ?? null,
          year: work.year ?? null,
          published: work.published,
          display_order: work.order,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (workError || !row) {
      console.error(`✗ ${work.slug}:`, workError?.message);
      continue;
    }

    const assets = [];

    for (const [index, asset] of work.assets.entries()) {
      const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
      const fileBuffer = await readFile(publicPath);
      const storagePath = asset.src.replace(/^\/works\//, "");

      const { error: uploadError } = await supabase.storage
        .from("works")
        .upload(storagePath, fileBuffer, {
          contentType: mimeOf(asset.src),
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) {
        console.error(`  ✗ העלאה ${storagePath}:`, uploadError.message);
        continue;
      }

      uploaded += 1;
      const { data: publicUrl } = supabase.storage.from("works").getPublicUrl(storagePath);

      assets.push({
        work_id: row.id,
        url: publicUrl.publicUrl,
        asset_type: asset.type,
        caption: asset.caption ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        display_order: (index + 1) * 10,
      });
    }

    const { error: clearError } = await supabase
      .from("works_assets")
      .delete()
      .eq("work_id", row.id);
    if (clearError) console.error(`  ✗ ניקוי קבצים ${work.slug}:`, clearError.message);

    if (assets.length > 0) {
      const { error: insertError } = await supabase.from("works_assets").insert(assets);
      if (insertError) console.error(`  ✗ שמירת קבצים ${work.slug}:`, insertError.message);
    }

    console.log(`✓ ${work.slug} (${assets.length} קבצים)`);
  }

  console.log(`\nהושלם: ${works.length} עבודות, ${uploaded} קבצים.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
