import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { fetchGifts, purchaseGift, giftStickerSrc, type Gift } from "../lib/gifts";

interface Props {
  recipientUserId: string;
  recipientLabel: string;
  videoId?: string;
  onClose: () => void;
}

type Phase = "loading" | "picking" | "paying" | "sent" | "error";

export default function GiftPickerSheet({ recipientUserId, recipientLabel, videoId, onClose }: Props) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadGifts = () => {
    setPhase("loading");
    setError(null);
    fetchGifts()
      .then((items) => {
        setGifts(items);
        setPhase("picking");
      })
      .catch((err) => {
        setError((err as Error).message);
        setPhase("error");
      });
  };

  useEffect(() => {
    loadGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The error phase covers two different failures that dead-ended into just
  // "Закрыть" before: the initial gift-list load, and a purchase attempt.
  // Gifts are already loaded by the time a purchase can fail, so retrying
  // that case just goes back to picking instead of re-fetching the list.
  const handleRetry = () => {
    if (gifts.length > 0) {
      setError(null);
      setPhase("picking");
    } else {
      loadGifts();
    }
  };

  const handlePick = async (gift: Gift) => {
    setPhase("paying");
    setError(null);
    try {
      const { invoiceUrl } = await purchaseGift(gift.id, recipientUserId, videoId);
      WebApp.openInvoice(invoiceUrl, (status) => {
        if (status === "paid") {
          setPhase("sent");
        } else if (status === "failed") {
          setError("Платёж не прошёл");
          setPhase("error");
        } else {
          // "cancelled" / "pending" — user backed out or it's still settling, no error to show
          setPhase("picking");
        }
      });
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[70%] animate-sheet-in flex-col overflow-y-auto rounded-t-2xl bg-[#161616] text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold">Подарок для {recipientLabel}</span>
          <button type="button" onClick={onClose} className="tap-scale text-sm text-white/50">
            Закрыть
          </button>
        </div>

        <div className="px-4 py-4">
          {phase === "loading" && <p className="py-6 text-center text-sm text-white/50">Загрузка…</p>}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-center text-sm text-red-400">{error ?? "Что-то пошло не так"}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="tap-scale rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Повторить
              </button>
            </div>
          )}
          {phase === "sent" && <p className="py-6 text-center text-sm text-white">🎁 Подарок отправлен!</p>}
          {phase === "paying" && <p className="py-6 text-center text-sm text-white/50">Открываем оплату…</p>}

          {phase === "picking" && (
            <div className="grid grid-cols-3 gap-3">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  type="button"
                  onClick={() => handlePick(gift)}
                  className="tap-scale flex flex-col items-center gap-1 rounded-xl bg-white/5 p-3"
                >
                  <img src={giftStickerSrc(gift)} alt="" className="h-14 w-14" />
                  <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
                    ⭐ {gift.starCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
