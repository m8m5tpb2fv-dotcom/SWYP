import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { authenticateWithTelegram, type AuthUser } from "./lib/auth";
import Feed from "./components/Feed";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error"; message: string };

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

  if (auth.status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Авторизация…</p>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-sm text-red-400">{auth.message}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black">
      <Feed currentUserId={auth.user.id} />
    </div>
  );
}
