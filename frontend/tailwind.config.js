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
        ink: "#0a0e12",
        panel: "#111820",
        rail: "#0d1218",
        line: "#243042",
        mist: "#94a3b8",
        brass: "#d4a24a",
        sea: "#4ad4c0",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 18px 50px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
