/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "like-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "15%": { transform: "scale(1.2)", opacity: "1" },
          "30%": { transform: "scale(1)", opacity: "1" },
          "75%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.05)", opacity: "0" },
        },
        // Splash screen letter-by-letter loader (SplashScreen.tsx): each of
        // S/W/Y/P runs this SAME keyframe, timed so only the first quarter
        // (0-25%) ever does anything — idle -> sharpen+glow -> settle ->
        // back to idle. Every letter gets a animation-delay of its own
        // index * (duration/4), which shifts that quarter-window to a
        // different point in the shared cycle, so the four letters tile
        // into one continuous S->W->Y->P sweep with no gap or overlap.
        // --glow-color (set per letter via inline style) drives the
        // drop-shadow color, which follows the PNG's actual letterform
        // instead of a rectangular box the way box-shadow would.
        "letter-pulse": {
          "0%, 100%": {
            opacity: "0.32",
            transform: "scale(0.94)",
            filter: "blur(5px) brightness(0.7) drop-shadow(0 0 0px var(--glow-color))",
          },
          "8%": {
            opacity: "1",
            transform: "scale(1.06)",
            filter: "blur(0px) brightness(1.15) drop-shadow(0 0 22px var(--glow-color))",
          },
          "20%": {
            opacity: "1",
            transform: "scale(1)",
            filter: "blur(0px) brightness(1) drop-shadow(0 0 6px var(--glow-color))",
          },
          "25%": {
            opacity: "0.32",
            transform: "scale(0.94)",
            filter: "blur(5px) brightness(0.7) drop-shadow(0 0 0px var(--glow-color))",
          },
        },
        // A light band sweeping left-to-right, masked to the letter's own
        // shape (see the maskImage style in SplashScreen.tsx) so it reads
        // as the letter itself "loading" rather than a generic shimmer box.
        // Same timing convention as letter-pulse.
        "letter-sweep": {
          "0%, 100%": { backgroundPosition: "-120% 0" },
          "18%": { backgroundPosition: "220% 0" },
          "25%": { backgroundPosition: "220% 0" },
        },
      },
      animation: {
        "like-pop": "like-pop 850ms ease-out forwards",
        "letter-pulse": "letter-pulse 2s cubic-bezier(0.4,0,0.2,1) infinite",
        "letter-sweep": "letter-sweep 2s cubic-bezier(0.4,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};
