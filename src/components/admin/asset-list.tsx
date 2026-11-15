"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { WorkAsset } from "@/lib/works/types";
import { pdfFirstPage } from "@/lib/works/pages";
import { cn } from "@/lib/cn";
import { uploadAsset, dropAsset } from "@/lib/admin/upload";
import { adminFieldClass } from "./styles";

type PendingAsset = WorkAsset & {
  uploading?: boolean;
  error?: string;
  /** The picture's own address answered "not found" — the file is missing. */
  broken?: boolean;
  /** The 64px preview failed while the file itself may still be fine. */
  previewError?: boolean;
};

/**
 * File picker + ordered list of the work's images and PDFs.
 *
 * Files are uploaded as soon as they are chosen, so the form only has to save
 * URLs and captions. The first image is the cover, which the list states
 * plainly instead of asking anyone to pick one.
 */
/**
 * Changes are made the functional way — `next(current)` — not from the
 * `assets` snapshot of this render. Two uploads in a row, or a caption typed
 * while a file is still uploading, would otherwise each start from the list
 * as it was and the later one would undo the earlier.
 */
export function AssetList({
  slug,
  assets,
  onChange,
}: {
  slug: string;
  assets: PendingAsset[];
  onChange: (update: (current: PendingAsset[]) => PendingAsset[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const folder = slug.trim() || "draft";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const chosen = Array.from(files);
    const placeholders = chosen.map(() => ({ src: "", type: "image" as const, uploading: true }));
    onChange((current) => [...current, ...placeholders]);

    const uploaded = await Promise.all(
      chosen.map(async (file) => {
        try {
          return await uploadAsset(file, folder);
        } catch (error) {
          return { error: error instanceof Error ? error.message : "ההעלאה נכשלה" };
        }
      }),
    );

    // Drop the placeholders and add whatever actually made it.
    const results: PendingAsset[] = [];
    const failed: string[] = [];
    for (const item of uploaded) {
      if ("error" in item) {
        failed.push(item.error);
      } else {
        results.push({
          src: item.src,
          type: item.type,
          width: item.width,
          height: item.height,
          pages: item.pages,
          path: item.path,
        });
      }
    }

    // Every failure is listed: choosing three files and losing two quietly
    // would leave the work missing pictures with nothing said.
    setUploadError(failed.length ? failed.join("\n") : null);

    onChange((current) => [...current.filter((a) => !a.uploading), ...results]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    onChange((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  /**
   * An image that will not load: first try a plain load of the file (the
   * preview route can stumble on a picture that is actually there), and only
   * if the file itself is missing say so — plainly, in place of an empty box.
   */
  const srcs = useRef<string[]>([]);
  srcs.current = assets.map((asset) => asset.src);
  function markFailed(index: number) {
    const src = srcs.current[index];
    onChange((current) =>
      current.map((asset, i) => (i === index ? { ...asset, previewError: true } : asset)),
    );
    if (!src) return;
    const probe = new window.Image();
    probe.onload = () =>
      onChange((current) =>
        current.map((asset, i) => (i === index ? { ...asset, previewError: false } : asset)),
      );
    probe.onerror = () =>
      onChange((current) => current.map((asset, i) => (i === index ? { ...asset, broken: true } : asset)));
    probe.src = src;
  }

  function setCaption(index: number, caption: string) {
    onChange((current) => current.map((asset, i) => (i === index ? { ...asset, caption } : asset)));
  }

  function remove(index: number) {
    onChange((current) => {
      const asset = current[index];
      if (asset) dropAsset(asset);
      return current.filter((_, i) => i !== index);
    });
  }

  const firstImageIndex = assets.findIndex((asset) => asset.type === "image");

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
        onChange={(event) => void handleFiles(event.target.files)}
        className="hidden"
        id="asset-input"
      />
      <label
        htmlFor="asset-input"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-accent hover:text-accent"
      >
        <span className="text-sm font-medium text-ink">בחירת קבצים</span>
        <span className="text-xs text-ink-faint">
          תמונות (JPG, PNG, WebP) עד 8MB · PDF עד 24MB — העמודים מומרים לתמונות אוטומטית
        </span>
      </label>

      {uploadError ? (
        <p role="alert" className="whitespace-pre-line text-sm text-accent">
          {uploadError}
        </p>
      ) : null}

      {assets.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {assets.map((asset, index) => {
            // A PDF shows its first rendered page as its picture, not a badge:
            // the admin can see what was saved without opening the file.
            const previewSrc = asset.type === "image" ? asset.src : pdfFirstPage(asset).src;
            return (
            <li
              key={(asset.src || "uploading") + index}
              className={cn(
                "flex items-center gap-3 rounded-sm border border-line bg-surface-base p-3",
                asset.uploading && "opacity-60",
              )}
            >
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-soft">
                {asset.uploading ? (
                  <span className="text-[0.65rem] text-ink-faint">מעלה…</span>
                ) : asset.broken ? (
                  <span className="text-[0.6rem] text-ink-faint">הקובץ חסר</span>
                ) : previewSrc ? (
                  <Image
                    src={previewSrc}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className={cn("object-cover object-top", asset.previewError && "hidden")}
                    onError={() => markFailed(index)}
                  />
                ) : (
                  <span className="flex flex-col items-center text-center text-[0.6rem] leading-tight tracking-[0.05em] text-ink-dim">
                    PDF
                    <span className="text-ink-faint">{asset.pages?.length ?? 0} עמודים</span>
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {index === firstImageIndex ? (
                  <span className="text-[0.62rem] tracking-[0.18em] text-accent">תמונת השער</span>
                ) : null}
                <input
                  value={asset.caption ?? ""}
                  onChange={(event) => setCaption(index, event.target.value)}
                  placeholder="כיתוב מתחת לתמונה (לא חובה)"
                  className={cn(adminFieldClass, "py-1.5 text-xs")}
                />
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="העברה למעלה"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="px-1.5 text-ink-dim disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="העברה למטה"
                  onClick={() => move(index, 1)}
                  disabled={index === assets.length - 1}
                  className="px-1.5 text-ink-dim disabled:opacity-25"
                >
                  ▼
                </button>
                <button
                  type="button"
                  aria-label="הסרת הקובץ"
                  onClick={() => remove(index)}
                  className="px-2 text-xs text-ink-faint transition-colors hover:text-accent"
                >
                  הסרה
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
