import { useState } from "react";
import { reportVideo, type ReportReason } from "../lib/reports";

interface Props {
  videoId: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "adult", label: "18+" },
  { value: "violence", label: "Насилие" },
  { value: "fraud", label: "Мошенничество" },
  { value: "spam", label: "Спам" },
  { value: "copyright", label: "Авторские права" },
  { value: "abuse", label: "Оскорбления" },
  { value: "other", label: "Другое" },
];

export default function ReportSheet({ videoId, onClose }: Props) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReport = async (reason: ReportReason) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await reportVideo(videoId, reason);
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setPending(false);
      setError((err as Error).message);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex flex-col rounded-t-2xl bg-white text-black">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Пожаловаться</span>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Отмена
          </button>
        </div>
        {sent ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Спасибо, жалоба отправлена</p>
        ) : (
          <div className="py-2">
            {error && <p className="px-4 pb-2 text-xs text-red-500">{error}</p>}
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleReport(r.value)}
                disabled={pending}
                className="block w-full px-4 py-3 text-left text-sm disabled:opacity-50"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
