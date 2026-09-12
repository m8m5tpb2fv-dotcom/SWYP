import { useEffect, useRef, useState } from "react";

// Shared enter/exit animation state for the app's bottom sheets (currently
// just CommentsSheet — the only one with a text input, and thus the only
// one that needs a symmetric close animation driven from JS rather than a
// one-shot CSS keyframe; see tailwind.config.js's sheet-in/screen-in for
// why the other sheets deliberately don't use this). This only adds
// timing/visibility state; the sheet keeps its own markup and classes
// exactly as they are, just reading `visible`/`settled` to toggle a
// transform class instead of rendering unconditionally.
//
// `settled` matters as much as `visible`: any CSS `transform` value other
// than the literal `none` — even a resting translateY(0) — establishes a
// new containing block for fixed-position descendants, which broke the
// iOS keyboard/video-swipe fix (html/body position:fixed) for as long as
// the sheet's translate-y-0 class stayed applied, i.e. the whole time it
// was open. `settled` flips true shortly after the enter transition ends
// so the caller can drop the transform class entirely while the sheet is
// just sitting there open (and the keyboard fix needs to actually work),
// and flips back false the instant a close is requested so the exit
// transform re-applies in time to animate.
//
// `requestClose` starts the exit transition and calls the real onClose
// after `durationMs`, so the panel visibly slides away before it actually
// unmounts instead of vanishing instantly.
export function useSheetTransition(onClose: () => void, durationMs = 220) {
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const settleTimer = window.setTimeout(() => setSettled(true), durationMs);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
    };
  }, [durationMs]);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setSettled(false);
    setVisible(false);
    window.setTimeout(onClose, durationMs);
  };

  return { visible, settled, requestClose };
}
