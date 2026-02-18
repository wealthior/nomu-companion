import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nomu: {
          50: "#fff8f0",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        ocean: {
          50: "#f0faff",
          100: "#dff3ff",
          200: "#b8e8ff",
          300: "#78d5ff",
          400: "#36bfff",
          500: "#06a3f0",
          600: "#0082cd",
          700: "#0068a6",
          800: "#005789",
          900: "#064871",
          950: "#042d4b",
        },
        dark: {
          bg: "#060a12",
          card: "#0c1220",
          surface: "#111a2e",
          border: "#1a2744",
          text: "#e8ecf4",
          muted: "#6b7fa3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #f97316 0%, #fb923c 25%, #06a3f0 75%, #0082cd 100%)",
        "nomu-gradient": "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #fb923c 100%)",
        "deep-ocean": "linear-gradient(180deg, #060a12 0%, #0c1a2e 50%, #0a1628 100%)",
        "card-shine": "linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(6,163,240,0.05) 100%)",
        "glow-orange": "radial-gradient(ellipse at center, rgba(249,115,22,0.15) 0%, transparent 70%)",
        "glow-blue": "radial-gradient(ellipse at center, rgba(6,163,240,0.1) 0%, transparent 70%)",
      },
      boxShadow: {
        "nomu": "0 0 20px rgba(249, 115, 22, 0.2), 0 0 60px rgba(249, 115, 22, 0.05)",
        "ocean": "0 0 20px rgba(6, 163, 240, 0.15), 0 0 60px rgba(6, 163, 240, 0.05)",
        "nomu-lg": "0 0 40px rgba(249, 115, 22, 0.25), 0 0 80px rgba(249, 115, 22, 0.1)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "wave": "wave 8s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        wave: {
          "0%, 100%": { transform: "translateX(0) translateY(0)" },
          "25%": { transform: "translateX(5px) translateY(-3px)" },
          "50%": { transform: "translateX(0) translateY(-5px)" },
          "75%": { transform: "translateX(-5px) translateY(-3px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
