import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: "#0B1020",
          900: "#0B1020",
          800: "#121A30",
          700: "#1A2440",
          600: "#243050",
        },
        parchment: {
          DEFAULT: "#F4EAD7",
          100: "#FBF6EA",
          200: "#F4EAD7",
          300: "#E8D9BC",
          400: "#D8C39B",
          500: "#BFA67A",
        },
        gold: {
          DEFAULT: "#C9A227",
          300: "#E3C766",
          400: "#D6B445",
          500: "#C9A227",
          600: "#A8861F",
          700: "#86691A",
        },
        ember: "#C96A4B",
        violet: {
          dust: "#8A7CA8",
          deep: "#4A3F63",
        },
        silver: {
          moon: "#A9B4C4",
          mist: "#7E8CA3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        wideish: "0.08em",
      },
      boxShadow: {
        card: "0 1px 0 rgba(201,162,39,0.12) inset, 0 12px 40px -18px rgba(0,0,0,0.7)",
        glow: "0 0 40px -12px rgba(201,162,39,0.35)",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
