import { Search, Plus } from "lucide-react";

interface Props {
  onSearch: () => void;
  onUpload: () => void;
}

// Fixed corner buttons (top-left/top-right), padded against --tg-safe-top the
// same way every other screen's top bar is (see App.tsx) so they don't sit
// under Telegram's fullscreen chrome. Pulled out of VideoActionBar so they
// stay reachable even with an empty feed (no video means no action bar, but
// search/upload should never disappear).
export default function TopNav({ onSearch, onUpload }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onSearch}
        className="pointer-events-auto absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl"
        style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
      >
        <Search size={18} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onUpload}
        className="pointer-events-auto absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg"
        style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </>
  );
}
