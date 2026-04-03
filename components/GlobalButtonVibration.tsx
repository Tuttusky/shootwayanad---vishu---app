"use client";

import { useEffect } from "react";
import { safeVibrate } from "@/lib/registration-images";

/** Short tap for any primary control (supported on mobile / some devices). */
const TAP_MS = 24;

/**
 * Delegates haptics: `pointerdown` on buttons, submit inputs, role=button, and
 * labels that wrap radio/checkbox (chip-style controls).
 */
export function GlobalButtonVibration() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-no-vibrate]")) return;

      if (
        el.closest("button") ||
        el.closest('input[type="submit"]') ||
        el.closest('input[type="button"]') ||
        el.closest('input[type="reset"]') ||
        el.closest('[role="button"]')
      ) {
        safeVibrate(TAP_MS);
        return;
      }

      const lab = el.closest("label");
      if (lab?.querySelector('input[type="radio"], input[type="checkbox"]')) {
        safeVibrate(TAP_MS);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
  }, []);

  return null;
}
