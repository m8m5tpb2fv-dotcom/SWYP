import { useState } from "react";
import { updateMyBio } from "../lib/users";

interface Props {
  initialBio: string | null;
  onClose: () => void;
  onSaved: (bio: string | null) => void;
}

const BIO_MAX_LENGTH = 150;

export default function EditProfileSheet({ initialBio, onClose, onSaved }: Props) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await updateMyBio(bio);
      onSaved(result.bio);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex flex-col rounded-t-2xl bg-white text-black">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Редактировать профиль</span>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Отмена
          </button>
        </div>

        <div className="px-4 py-4">
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
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="mt-3 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
