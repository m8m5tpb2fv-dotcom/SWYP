import splashLogo from "../assets/splash-logo.jpg";

// Shown while the Mini App authenticates (App.tsx's "loading" state) — a
// static screen here reads as a hang, so the logo gets a slow breathing
// scale and a rotating gradient ring behind it, plus bouncing dots, to make
// clear something is actively happening rather than frozen.
export default function SplashScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-black px-8">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-[120%] w-[120%] animate-spin-slow rounded-full opacity-70 blur-md"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, #60a5fa 15%, transparent 30%, #ec4899 60%, transparent 75%)",
          }}
        />
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
  );
}
