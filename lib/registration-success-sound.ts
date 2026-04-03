const SUCCESS_SOUND_PATH =
  "/universfield-new-notification-051-494246.mp3";

/**
 * Plays after a successful registration submit (user gesture allows audio on most browsers).
 */
export function playRegistrationSuccessSound(): void {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(SUCCESS_SOUND_PATH);
    audio.volume = 0.9;
    void audio.play().catch(() => {
      /* Autoplay policy or missing file — ignore */
    });
  } catch {
    /* ignore */
  }
}
