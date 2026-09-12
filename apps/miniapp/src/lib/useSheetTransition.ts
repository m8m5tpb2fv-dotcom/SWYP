import { useEffect, useRef, useState } from "react";

// Shared enter/exit animation state for the app's bottom sheets (Comments,
// Report, Edit Profile, Edit Video, Gift Picker) — none of them previously
// animated in/out at all, they just popped into and out of existence on
// mount/unmount. This only adds timing/visibility state; every sheet keeps
// its own markup and classes exactly as they are, just reading `visible`
// to toggle a transform/opacity class instead of rendering unconditionally.
//
// `requestClose` starts the exit transition and calls the real onClose
// after `durationMs`, so the panel visibly slides away before it actually
// unmounts instead of vanishing instantly.
export function useSheetTransition(onClose: () => void, durationMs = 220) {
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    window.setTimeout(onClose, durationMs);
  };

  return { visible, requestClose };
}
