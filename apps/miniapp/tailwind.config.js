/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        // A "back out" curve — its control points overshoot past 1 mid-transition,
        // so animating *to* scale-100 with this easing naturally springs slightly
        // past 100% before settling, with no separate overshoot keyframe needed.
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        // Generic small pop — the like button's own heart icon and its count
        // reuse this on a like (not the big double-tap heart, which already
        // has its own like-pop below).
        pop: {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.28)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Bottom sheets' pure-CSS mount-in (Report/EditProfile/EditVideo/Gift —
        // CommentsSheet uses useSheetTransition instead since it also needs a
        // symmetric close animation these one-shot keyframes can't drive).
        "sheet-in": {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Full-screen overlays (Profile/Search/Upload) mount-in.
        "screen-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
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
        pop: "pop 320ms cubic-bezier(0.34,1.56,0.64,1) both",
        "fade-in": "fade-in 200ms ease-out both",
        // No forwards/both fill-mode here (unlike pop/fade-in above): a
        // "both" fill-mode freezes the element at the LAST keyframe's
        // transform (translateY(0)) forever after the animation ends —
        // and per spec, any transform value other than the literal keyword
        // `none` establishes a new containing block for fixed-position
        // descendants, even an identity one like translateY(0). Sheets and
        // screens using this hold text inputs (Comments, Search, Upload,
        // Edit Profile/Video); a lingering transform on their ancestor was
        // exactly what broke the iOS keyboard/video-swipe fix (which relies
        // on html/body position:fixed) a second time. Ending fill-mode at
        // the default ("none") lets the element drop back to its actual
        // base style (transform: none) the instant the animation finishes —
        // invisible, since translateY(0)/scale(1) render pixel-identical to
        // no transform at all.
        "sheet-in": "sheet-in 240ms cubic-bezier(0.22,1,0.36,1)",
        "screen-in": "screen-in 260ms cubic-bezier(0.22,1,0.36,1)",
        "like-pop": "like-pop 850ms ease-out forwards",
        "letter-pulse": "letter-pulse 2s cubic-bezier(0.4,0,0.2,1) infinite",
        "letter-sweep": "letter-sweep 2s cubic-bezier(0.4,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};
