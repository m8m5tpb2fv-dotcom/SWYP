import { useState } from "react";
import { updateMyProfile } from "../lib/users";

interface Props {
  initialBio: string | null;
  initialNickname: string | null;
  // null = subscriptions currently off for this creator.
  initialSubscriptionPriceStars: number | null;
  onClose: () => void;
  onSaved: (patch: { bio: string | null; nickname: string | null; subscriptionPriceStars: number | null }) => void;
}

const BIO_MAX_LENGTH = 150;

export default function EditProfileSheet({
  initialBio,
  initialNickname,
  initialSubscriptionPriceStars,
  onClose,
  onSaved,
}: Props) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(initialSubscriptionPriceStars !== null);
  const [subscriptionPriceStars, setSubscriptionPriceStars] = useState(
    initialSubscriptionPriceStars ? String(initialSubscriptionPriceStars) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (pending) return;
    const trimmedNickname = nickname.trim();
    if (trimmedNickname && trimmedNickname.length < 3) {
      setError("Ник должен быть не короче 3 символов");
      return;
    }
    if (subscriptionEnabled && !(Number(subscriptionPriceStars) >= 1)) {
      setError("Укажите цену подписки в звёздах");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await updateMyProfile({
        bio,
        nickname: trimmedNickname || null,
        subscriptionPriceStars: subscriptionEnabled ? Number(subscriptionPriceStars) : null,
      });
      onSaved(result);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="relative flex animate-sheet-in flex-col rounded-t-2xl bg-white text-black">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Редактировать профиль</span>
          <button type="button" onClick={onClose} className="tap-scale text-sm text-gray-500">
            Отмена
          </button>
        </div>

        <div className="px-4 py-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">Ник</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="Ваш ник"
            className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
          />

          <label className="mb-1 block text-xs font-medium text-gray-500">О себе</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="Расскажите о себе"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 p-3 text-base outline-none focus:border-blue-400"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>

          <label className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
            <span className="text-sm">Премиум-подписка на мой аккаунт</span>
            <input
              type="checkbox"
              checked={subscriptionEnabled}
              onChange={(e) => setSubscriptionEnabled(e.target.checked)}
              className="h-5 w-5 accent-blue-500"
            />
          </label>
          {subscriptionEnabled && (
            <input
              value={subscriptionPriceStars}
              onChange={(e) => setSubscriptionPriceStars(e.target.value.replace(/\D/g, ""))}
              placeholder="Цена за 30 дней, в звёздах"
              inputMode="numeric"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
            />
          )}

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="tap-scale mt-3 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
