/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pwl: {
          dark: "#0a0a0f",
          card: "#14141f",
          border: "#1e1e2e",
          purple: "#a855f7",
          cyan: "#06b6d4",
          pink: "#ec4899",
          green: "#22c55e",
          orange: "#f97316",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
