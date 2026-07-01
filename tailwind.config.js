/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0C0E",
        panel: "#16181C",
        panelborder: "#2A2D33",
        amber: {
          DEFAULT: "#E8A33D",
          bright: "#FFC15E",
        },
        ink: "#E7E5E0",
        muted: "#8A8D93",
        danger: "#C24A3B",
        online: "#6FA97A",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
