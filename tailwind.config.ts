import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#f2ecea", // body copy
          dim: "#9c9295", // secondary copy
          faint: "#6f6669", // captions
        },
        surface: {
          base: "#0b0b0c",
          soft: "#111113",
          raised: "#161114",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.09)",
          strong: "rgba(255,255,255,0.18)",
        },
        accent: {
          DEFAULT: "#c7867a", // rose copper — the single accent
          deep: "#8e5448",
          glow: "rgba(199,134,122,0.16)",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        serif: ["var(--font-frank-ruhl)", "Georgia", "serif"],
      },
      maxWidth: {
        page: "1440px",
        prose: "62ch",
        gallery: "1120px",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in": "fade-in 1.2s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
