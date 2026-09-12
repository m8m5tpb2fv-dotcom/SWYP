import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { BadgeCheck } from "lucide-react";
import { updateMyProfile } from "../lib/users";
import { purchaseVerification, VERIFIED_BADGE_PRICE_STARS } from "../lib/monetization";

interface Props {
  initialNickname: string | null;
  onDone: (patch: { nickname: string | null; isVerified: boolean }) => void;
}

// Shown exactly once, right after the very first login for a Telegram
// account (App.tsx gates this on the auth response's isNewUser) — a
// returning user never sees this again. Nickname is optional (can also be
// set later from Edit Profile); skipping just continues with none set.
export default function RegistrationScreen({ initialNickname, onDone }: Props) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const { invoiceUrl } = await purchaseVerification();
      WebApp.openInvoice(invoiceUrl, (status) => {
        setVerifying(false);
        if (status === "paid") {
          setVerified(true);
        } else if (status === "failed") {
          setVerifyError("Платёж не прошёл");
        }
      });
    } catch (err) {
      setVerifying(false);
      setVerifyError((err as Error).message);
    }
  };

  const handleContinue = async () => {
    if (saving) return;
    const trimmed = nickname.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      setError("Ник должен быть не короче 3 символов");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = trimmed ? await updateMyProfile({ nickname: trimmed }) : { nickname: null };
      onDone({ nickname: result.nickname, isVerified: verified });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex animate-screen-in flex-col items-center justify-center gap-6 bg-black px-6 text-white">
      <div className="w-full max-w-xs space-y-2 text-center">
        <h1 className="text-lg font-semibold">Добро пожаловать в SWYP</h1>
        <p className="text-sm text-white/60">Придумай ник — его всегда можно поменять в профиле</p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ваш ник"
          maxLength={20}
          className="w-full rounded-lg bg-white/10 px-3 py-2.5 text-base placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="w-full max-w-xs space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <BadgeCheck size={20} strokeWidth={2.5} className="text-[#2AABEE]" />
          <p className="text-sm font-semibold">Подтверждённый аккаунт</p>
        </div>
        <p className="text-xs text-white/60">Синяя галочка навсегда — {VERIFIED_BADGE_PRICE_STARS}⭐</p>
        {verified ? (
          <p className="text-center text-sm font-semibold text-[#2AABEE]">✅ Аккаунт подтверждён</p>
        ) : (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="tap-scale w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {verifying ? "Открываем оплату…" : `Получить за ${VERIFIED_BADGE_PRICE_STARS}⭐`}
          </button>
        )}
        {verifyError && <p className="text-center text-xs text-red-400">{verifyError}</p>}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={saving}
        className="tap-scale w-full max-w-xs rounded-full bg-blue-500 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? "Сохранение…" : "Продолжить"}
      </button>
    </div>
  );
}
