import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f0",
          100: "#d6ecdb",
          500: "#2f9e56",
          600: "#248347",
          700: "#1c6638",
        },
      },
    },
  },
  plugins: [],
};

export default config;
