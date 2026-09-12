import splashLogo from "../assets/splash-logo.jpg";
import splashBg from "../assets/splash-bg.jpg";

// Shown while the Mini App authenticates (App.tsx's "loading" state). Static
// here would read as a hang, so the logo breathes (slow scale) and the dots
// bounce — but the whole point of splashBg is that it's the SAME artwork,
// just blurred and scaled to fill the screen, so the sharp card in front
// reads as one continuous scene (a glow it casts on its surroundings)
// instead of a rectangle pasted over plain black.
export default function SplashScreen() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="absolute inset-0 animate-ambient-drift bg-cover bg-center"
        style={{ backgroundImage: `url(${splashBg})` }}
      />
      {/* Vignette so the dots/card stay legible against whatever's brightest
          in the ambient layer, without flattening its color back to black. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)" }}
      />

      <div className="relative flex flex-col items-center gap-8 px-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-[135%] w-[135%] animate-pulse-scale rounded-full bg-white/25 blur-3xl" />
          <img
            src={splashLogo}
            alt="SWYP"
            className="relative w-full max-w-xs animate-pulse-scale rounded-2xl shadow-2xl"
          />
        </div>

        <div className="flex gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}
