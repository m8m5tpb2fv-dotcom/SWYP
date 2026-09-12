import letterS from "../assets/letters/S.png";
import letterW from "../assets/letters/W.png";
import letterY from "../assets/letters/Y.png";
import letterP from "../assets/letters/P.png";

// Each letter is cut straight out of the real logo artwork (see
// scratchpad note in the commit) — same shapes, same font, just isolated
// with a transparent background — never a generic text substitute.
const LETTERS = [
  { src: letterS, glow: "#4fa8fe" }, // blue
  { src: letterW, glow: "#8b5cf6" }, // blue-purple
  { src: letterY, glow: "#c026d3" }, // purple-magenta
  { src: letterP, glow: "#ec4899" }, // pink
];

const LETTER_SLOT_MS = 500; // must match letter-pulse/-sweep's 2s duration / 4 letters

// Shown while the Mini App authenticates (App.tsx's "loading" state).
// Deliberately just the wordmark on black: S -> W -> Y -> P light up one
// at a time (sharpen, glow in that letter's brand color, a mask-clipped
// shine sweeps through it) and hand off to the next, looping — no
// spinner, no dots, no separate art. filter/opacity/transform/
// background-position are the only animated properties, all compositor-
// only on iOS/Android WebViews, so this stays smooth without touching
// layout.
export default function SplashScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="flex items-center">
        {LETTERS.map((letter, i) => (
          <div key={i} className="relative" style={{ ["--glow-color" as string]: letter.glow }}>
            <img
              src={letter.src}
              alt=""
              className="h-12 w-auto animate-letter-pulse will-change-[filter,transform,opacity]"
              style={{ animationDelay: `${i * LETTER_SLOT_MS}ms` }}
            />
            <div
              className="pointer-events-none absolute inset-0 animate-letter-sweep will-change-[background-position]"
              style={{
                backgroundImage: "linear-gradient(100deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%)",
                backgroundSize: "60% 100%",
                backgroundRepeat: "no-repeat",
                maskImage: `url(${letter.src})`,
                WebkitMaskImage: `url(${letter.src})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                animationDelay: `${i * LETTER_SLOT_MS}ms`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
