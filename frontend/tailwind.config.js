/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        kinetic: {
          DEFAULT: "var(--kinetic)",
          foreground: "var(--kinetic-foreground)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          accent: "var(--sidebar-accent)",
          border: "var(--sidebar-border)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        elevated: "var(--shadow-elevated)",
        paper: "var(--shadow-paper)",
        glow: "var(--shadow-glow)",
      },
      maxWidth: {
        content: "1400px",
      },
      transitionTimingFunction: {
        kinetic: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        reveal: "reveal-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fade: "reveal-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float-slow 6s ease-in-out infinite",
        dash: "dash-flow 3s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        orbit: "orbit 20s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-200" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        orbit: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 oklch(0.55 0.22 270 / 0.5)" },
          "50%": { boxShadow: "0 0 0 10px oklch(0.55 0.22 270 / 0)" },
        },
      },
    },
  },
  plugins: [],
};
