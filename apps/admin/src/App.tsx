import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { getToken, clearToken } from "./lib/auth";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import VideosTab from "./components/VideosTab";
import ReportsTab from "./components/ReportsTab";
import UsersTab from "./components/UsersTab";

type Tab = "dashboard" | "videos" | "reports" | "users";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Дашборд" },
  { key: "videos", label: "Видео" },
  { key: "reports", label: "Жалобы" },
  { key: "users", label: "Пользователи" },
];

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    // No-op outside Telegram (window.Telegram.WebApp is a harmless stub from
    // telegram-web-app.js when not running inside the app) — safe to open the
    // admin panel as a plain browser tab or as a bot-launched Mini App alike.
    WebApp.ready();
    WebApp.expand();
    WebApp.requestFullscreen?.();
    const applyInsets = () => {
      const top = (WebApp.safeAreaInset?.top ?? 0) + (WebApp.contentSafeAreaInset?.top ?? 0);
      document.documentElement.style.setProperty("--tg-safe-top", `${top}px`);
    };
    applyInsets();
    WebApp.onEvent("safeAreaChanged", applyInsets);
    WebApp.onEvent("contentSafeAreaChanged", applyInsets);
    WebApp.onEvent("fullscreenChanged", applyInsets);
  }, []);

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="flex items-center justify-between border-b bg-white px-6 pb-4"
        style={{ paddingTop: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
      >
        <h1 className="text-lg font-semibold text-gray-900">SWYP Admin</h1>
        <button
          type="button"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
          className="text-sm text-gray-500"
        >
          Выйти
        </button>
      </header>

      <nav className="flex gap-1 border-b bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-3 text-sm font-medium ${
              tab === t.key ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "videos" && <VideosTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "users" && <UsersTab />}
      </main>
    </div>
  );
}
