import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { authenticateWithTelegram, type AuthUser } from "./lib/auth";
import { fetchVideoById, type FeedItem } from "./lib/feed";
import Feed from "./components/Feed";
import UploadScreen from "./components/UploadScreen";
import ProfileScreen from "./components/ProfileScreen";
import SearchScreen from "./components/SearchScreen";
import SplashScreen from "./components/SplashScreen";

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
  const [sharedVideo, setSharedVideo] = useState<FeedItem | null>(null);
  const [sharedVideoResolved, setSharedVideoResolved] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    // expand() only maximizes within the normal viewport (Bot API <8.0 behavior).
    // requestFullscreen() (Bot API 8.0+) extends under the status bar too — this
    // is what the "Fullscreen" launch mode in BotFather/Bot Settings expects the
    // app itself to request; older clients just ignore the call.
    WebApp.requestFullscreen?.();

    // In fullscreen mode Telegram draws its own translucent chrome (a collapse
    // chevron + "..." menu, plus the device status bar) floating over the top
    // of the page — content/buttons placed at y=0 render underneath it and
    // are visually clipped and untappable. safeAreaInset covers the device's
    // own notch/status bar; contentSafeAreaInset covers Telegram's own
    // floating header on top of that — both are needed, and both can change
    // (e.g. rotation, entering/leaving fullscreen), so keep them live via
    // --tg-safe-top for every screen's top bar to pad against.
    const applyInsets = () => {
      const top = (WebApp.safeAreaInset?.top ?? 0) + (WebApp.contentSafeAreaInset?.top ?? 0);
      document.documentElement.style.setProperty("--tg-safe-top", `${top}px`);
    };
    applyInsets();
    WebApp.onEvent("safeAreaChanged", applyInsets);
    WebApp.onEvent("contentSafeAreaChanged", applyInsets);
    WebApp.onEvent("fullscreenChanged", applyInsets);

    if (!WebApp.initData) {
      setAuth({ status: "error", message: "Открой это приложение через Telegram" });
      return;
    }

    authenticateWithTelegram(WebApp.initData)
      .then((user) => setAuth({ status: "authenticated", user }))
      .catch((err) => setAuth({ status: "error", message: (err as Error).message }));
  }, []);

  // Resolve a share deep link's start_param (t.me/<bot>/<app>?startapp=video_<id>,
  // set by useVideoInteractions' handleShare) before Feed ever mounts, so the
  // shared video can be pinned to the front of the first feed page instead of
  // blocking behind a separate single-video screen — the recipient lands on it
  // and can keep swiping immediately. Falls back to the normal feed if the
  // video was deleted/unpublished since it was shared, or the param doesn't match.
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const startParam = WebApp.initDataUnsafe.start_param;
    const match = startParam?.match(/^video_(.+)$/);
    if (!match) {
      setSharedVideoResolved(true);
      return;
    }
    fetchVideoById(match[1])
      .then(setSharedVideo)
      .catch(() => {})
      .finally(() => setSharedVideoResolved(true));
  }, [auth.status]);

  if (auth.status === "loading" || (auth.status === "authenticated" && !sharedVideoResolved)) {
    return <SplashScreen />;
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
        initialVideo={sharedVideo}
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
