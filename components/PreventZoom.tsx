"use client";

import { useEffect } from "react";

/**
 * Blocks pinch-zoom and double-tap zoom on iOS Safari & all mobile browsers.
 * iOS 10+ ignores viewport user-scalable=no, so JS listeners are required.
 */
export function PreventZoom() {
  useEffect(() => {
    const blockPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const blockGestureStart = (e: Event) => {
      e.preventDefault();
    };

    const blockDoubleTapZoom = (() => {
      let lastTap = 0;
      return (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          e.preventDefault();
        }
        lastTap = now;
      };
    })();

    document.addEventListener("touchmove", blockPinch, { passive: false });
    document.addEventListener("touchstart", blockDoubleTapZoom, {
      passive: false,
    });
    // Safari-specific gesture events
    document.addEventListener("gesturestart", blockGestureStart);
    document.addEventListener("gesturechange", blockGestureStart);
    document.addEventListener("gestureend", blockGestureStart);

    return () => {
      document.removeEventListener("touchmove", blockPinch);
      document.removeEventListener("touchstart", blockDoubleTapZoom);
      document.removeEventListener("gesturestart", blockGestureStart);
      document.removeEventListener("gesturechange", blockGestureStart);
      document.removeEventListener("gestureend", blockGestureStart);
    };
  }, []);

  return null;
}
