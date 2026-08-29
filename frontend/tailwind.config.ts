import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0A1628",
          "navy-light": "#142236",
          gold: "#C9A84C",
          "gold-light": "#E8D5A3",
          "gold-dark": "#A8873A",
          cream: "#F8F6F1",
          slate: "#4A5568",
        },
        status: {
          draft: "#6B7280",
          sent: "#2563EB",
          viewed: "#7C3AED",
          paid: "#059669",
          overdue: "#DC2626",
          cancelled: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        // Deliberately limited radius - no rounded-xl/2xl allowed
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
        input: "inset 0 1px 2px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
