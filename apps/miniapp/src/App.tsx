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
    // expand() only maximizes within the normal viewport (Bot API <8.0 behavior).
    // requestFullscreen() (Bot API 8.0+) extends under the status bar too — this
    // is what the "Fullscreen" launch mode in BotFather/Bot Settings expects the
    // app itself to request; older clients just ignore the call.
    WebApp.requestFullscreen?.();

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
      <Feed
        key={feedKey}
        currentUserId={auth.user.id}
        onOpenProfile={setViewingUserId}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenOwnProfile={() => setViewingUserId(auth.user.id)}
      />

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

      {viewingUserId && (
        <ProfileScreen userId={viewingUserId} currentUserId={auth.user.id} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}
