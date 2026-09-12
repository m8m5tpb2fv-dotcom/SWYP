/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
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
        // Slow drift+zoom on the splash screen's ambient background — same
        // artwork as the logo card, just blurred, so a little life keeps it
        // from reading as a static backdrop while staying subtle enough not
        // to compete with the card in front.
        "ambient-drift": {
          "0%, 100%": { transform: "scale(1.08) translate(0, 0)" },
          "50%": { transform: "scale(1.16) translate(-1.5%, -1.5%)" },
        },
      },
      animation: {
        "pulse-scale": "pulse-scale 2.2s ease-in-out infinite",
        "like-pop": "like-pop 850ms ease-out forwards",
        "ambient-drift": "ambient-drift 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
