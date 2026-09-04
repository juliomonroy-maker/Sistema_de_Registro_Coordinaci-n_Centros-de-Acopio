import type { Config } from "tailwindcss";

// Sistema monocromo oscuro de SCCA: un solo ground negro, superficies en grises
// muy oscuros separadas por líneas finas, tinta blanca en tres niveles.
// Rojo (danger) y ámbar (warn) solo para errores y pendientes; no hay acento de marca.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: { DEFAULT: "#121212", 2: "#181818", 3: "#222222" },
        line: { DEFAULT: "#262626", 2: "#363636" },
        ink: { DEFAULT: "#f4f4f4", 2: "#b9b9b9", 3: "#8a8a8a" },
        danger: { DEFAULT: "#f87171", bg: "rgba(248,113,113,0.12)" },
        warn: { DEFAULT: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
      },
      borderColor: { DEFAULT: "#262626" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      boxShadow: {
        pop: "0 8px 24px -8px rgba(0,0,0,0.7), 0 2px 6px -2px rgba(0,0,0,0.6)",
      },
      transitionTimingFunction: { out: "cubic-bezier(0.16, 1, 0.3, 1)" },
    },
  },
  plugins: [],
};

export default config;
