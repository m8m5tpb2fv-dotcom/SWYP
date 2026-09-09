import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { authenticateWithTelegram, type AuthUser } from "./lib/auth";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error"; message: string };

// Placeholder shell. The vertical swipe feed (ТЗ раздел 3/5) lands as its own step.
export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    if (!WebApp.initData) {
      setAuth({ status: "error", message: "Открой это приложение через Telegram" });
      return;
    }

    authenticateWithTelegram(WebApp.initData)
      .then((user) => setAuth({ status: "authenticated", user }))
      .catch((err) => setAuth({ status: "error", message: (err as Error).message }));
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white">
      {auth.status === "loading" && <p className="text-sm text-white/60">Авторизация…</p>}
      {auth.status === "error" && <p className="text-sm text-red-400">{auth.message}</p>}
      {auth.status === "authenticated" && (
        <>
          <p className="text-lg font-medium">
            Привет, {auth.user.firstName ?? auth.user.username ?? "друг"}!
          </p>
          <p className="mt-2 text-sm text-white/60">Feed placeholder</p>
        </>
      )}
    </div>
  );
}
