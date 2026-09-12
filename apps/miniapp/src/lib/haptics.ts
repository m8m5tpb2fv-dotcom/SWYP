import WebApp from "@twa-dev/sdk";

// Telegram's own bridge script defines HapticFeedback as safe no-ops on
// platforms/older clients that don't actually support it, so these calls
// essentially never throw in practice — the try/catch is just cheap
// insurance against a client that doesn't have the bridge at all (e.g. the
// Mini App opened outside Telegram during development).
function safeHaptic(fn: () => void) {
  try {
    fn();
  } catch {
    // no-op — haptics are a nice-to-have, never worth surfacing an error for.
  }
}

// Reserved for the handful of actions worth a physical nudge (per the
// product spec: Like, Follow, screen navigation) — deliberately not wired
// into every tap, which would just read as buzzy noise.
export const hapticLight = () => safeHaptic(() => WebApp.HapticFeedback.impactOccurred("light"));
export const hapticSelection = () => safeHaptic(() => WebApp.HapticFeedback.selectionChanged());
export const hapticSuccess = () => safeHaptic(() => WebApp.HapticFeedback.notificationOccurred("success"));
