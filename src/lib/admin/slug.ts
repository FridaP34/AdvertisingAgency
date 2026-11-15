/**
 * The site address of a work, made from its title.
 *
 * A title is written in Hebrew, so the letters are transliterated rather than
 * dropped: "שיקמה — קמפיין מיתוג" becomes "shyqmh-qmpyyn-mytvg". The result is
 * stable, readable in a URL, and the admin can still edit it by hand.
 *
 * Letters with more than one common spelling use a short one (ק → q), and the
 * final letters share the form of their regular letter (ם → m), so the same
 * word always produces the same address.
 */

const LETTERS: Record<string, string> = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "ch", ט: "t",
  י: "y", כ: "k", ך: "k", ל: "l", מ: "m", ם: "m", נ: "n", ן: "n", ס: "s",
  ע: "a", פ: "p", ף: "p", צ: "tz", ץ: "tz", ק: "q", ר: "r", ש: "sh", ת: "t",
};

/** Turns a title into an address: letters, digits and single hyphens. */
export function slugFromTitle(title: string): string {
  const latin = Array.from(title.normalize("NFKD"))
    .map((letter) => {
      if (/[א-ת]/.test(letter)) return LETTERS[letter] ?? "";
      // Latin letters lose their accents; anything else is dropped.
      return /[a-zA-Z0-9]/.test(letter) ? letter : " ";
    })
    .join("")
    .toLowerCase();

  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/**
 * The address to offer for a work titled `title` when the taken ones are
 * `taken`: the transliterated title, and — if that is in use — the first free
 * number after it: "shyqmh-2", "shyqmh-3". A plain title is offered as is.
 */
export function uniqueSlug(title: string, taken: string[]): string {
  const base = slugFromTitle(title);
  if (!base) return "";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return base;
}
