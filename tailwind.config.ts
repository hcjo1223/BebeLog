import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 베베로그 브랜드 틸(Teal). 600은 흰 글씨와 5:1 이상 대비를 확보한 기본 액션 색
        sprout: {
          50: "#ecfdf7",
          100: "#d1faec",
          200: "#a7f3d9",
          300: "#6ee7bf",
          400: "#34d3a0",
          500: "#10b981",
          600: "#0b7d67",
          700: "#0a6a58",
          800: "#085446",
          900: "#073f35",
        },
        // 다크 모드 표면 (Deep Navy)
        night: {
          700: "#334155",
          800: "#1e293b",
          900: "#111827",
        },
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 260ms cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 180ms ease-out",
        "toast-in": "toast-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
