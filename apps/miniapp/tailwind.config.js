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
        "like-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "15%": { transform: "scale(1.2)", opacity: "1" },
          "30%": { transform: "scale(1)", opacity: "1" },
          "75%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.05)", opacity: "0" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 3.5s linear infinite",
        "pulse-scale": "pulse-scale 2.2s ease-in-out infinite",
        "like-pop": "like-pop 850ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
