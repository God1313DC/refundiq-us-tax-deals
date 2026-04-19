import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f4ec",
        foreground: "#142430",
        card: "#fffdf8",
        border: "#ddcfbd",
        primary: "#0d766d",
        secondary: "#173445",
        accent: "#d97706",
        danger: "#b91c1c",
        muted: "#60707a"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(20, 36, 48, 0.08)"
      },
      borderRadius: {
        xl2: "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
