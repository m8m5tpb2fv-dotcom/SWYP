import { useEffect } from "react";
import WebApp from "@twa-dev/sdk";

// Placeholder shell. The vertical swipe feed (ТЗ раздел 3/5) lands as its own step.
export default function App() {
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white">
      <p className="text-lg font-medium">Shorts Mini App</p>
      <p className="mt-2 text-sm text-white/60">Feed placeholder</p>
    </div>
  );
}
