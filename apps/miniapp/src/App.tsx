import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { authenticateWithTelegram, type AuthUser } from "./lib/auth";
import Feed from "./components/Feed";
import UploadScreen from "./components/UploadScreen";
import ProfileScreen from "./components/ProfileScreen";
import SearchScreen from "./components/SearchScreen";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error"; message: string };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

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
    <div className="relative h-full w-full bg-black">
      <Feed key={feedKey} currentUserId={auth.user.id} onOpenProfile={setViewingUserId} />

      {!uploadOpen && !viewingUserId && !searchOpen && (
        <>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white shadow-lg backdrop-blur"
          >
            🔍
          </button>
          <button
            type="button"
            onClick={() => setViewingUserId(auth.user.id)}
            className="absolute bottom-6 left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white shadow-lg backdrop-blur"
          >
            👤
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="absolute bottom-6 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-2xl text-white shadow-lg"
          >
            ＋
          </button>
        </>
      )}

      {uploadOpen && (
        <UploadScreen
          onClose={() => setUploadOpen(false)}
          onPublished={() => {
            setUploadOpen(false);
            setFeedKey((k) => k + 1);
          }}
        />
      )}

      {searchOpen && <SearchScreen onClose={() => setSearchOpen(false)} onOpenProfile={setViewingUserId} />}

      {viewingUserId && <ProfileScreen userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
    </div>
  );
}
