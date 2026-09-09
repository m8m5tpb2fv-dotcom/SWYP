import { useState } from "react";
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

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
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
