/**
 * Stand-in artwork for works, generated as an inline SVG data URI.
 *
 * Real photography will replace this once assets are processed; until then
 * every card renders calmly instead of showing a broken image. Keeping it
 * inline means zero network requests and no layout shift.
 */

const palette: [string, string][] = [
  ["#2b1b21", "#141112"],
  ["#2a2019", "#12100e"],
  ["#1f2024", "#101113"],
  ["#241a1f", "#131012"],
  ["#22201b", "#111009"],
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function placeholderCover(seed: string, label: string): string {
  const [from, to] = palette[hash(seed) % palette.length];
  const angle = 140 + (hash(seed) % 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="0.62" stop-color="${to}"/>
      <stop offset="1" stop-color="#c7867a" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="1400" fill="url(#g)"/>
  <text x="500" y="700" fill="#f2ecea" fill-opacity="0.14" font-family="sans-serif"
    font-size="54" font-weight="700" text-anchor="middle" direction="rtl">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
