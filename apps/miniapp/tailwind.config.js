/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.045)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 3.5s linear infinite",
        "pulse-scale": "pulse-scale 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
