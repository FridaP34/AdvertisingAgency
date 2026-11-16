import { ImageResponse } from "next/og";

// iOS ignores SVG icons and adds its own rounded mask, so this renders the
// same mark as `icon.svg` (rose disc, dark square-cut מ) as a 180×180 PNG.
// System fonts only — a custom font would be an extra request for one letter.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c7867a",
          color: "#141110",
          fontSize: 118,
          fontWeight: 900,
          fontFamily: "Arial, Helvetica, sans-serif",
          paddingBottom: 6,
        }}
      >
        מ
      </div>
    ),
    size,
  );
}
