import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#050506", 900: "#0b0b0e", 800: "#131318", 700: "#1c1c24", 600: "#2a2a35" },
        accent: { DEFAULT: "#e50914", soft: "#ff3d4a", gold: "#d4af37" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: { shimmer: "shimmer 4.5s linear infinite" },
    },
  },
  plugins: [],
};

export default config;
