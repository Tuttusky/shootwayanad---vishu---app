"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Props = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "placeholder"
> & {
  /** Animated hint text (loops: type → pause → delete). */
  typewriterPhrase: string;
};

/**
 * Textarea with looping typewriter-style hint; native placeholder is not used.
 * When empty, animated hint shows behind transparent text; caret stays on-brand.
 */
export function TalentsTypewriterTextarea({
  typewriterPhrase,
  className = "",
  id,
  onChange,
  ...rest
}: Props) {
  const genId = useId();
  const tid = id ?? `talents-tw-${genId}`;
  const [display, setDisplay] = useState("");
  const [showAnim, setShowAnim] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!showAnim) {
      cancelledRef.current = true;
      return;
    }
    cancelledRef.current = false;
    const phrase = typewriterPhrase;

    async function loop() {
      while (!cancelledRef.current) {
        for (let i = 0; i <= phrase.length; i++) {
          if (cancelledRef.current) return;
          setDisplay(phrase.slice(0, i));
          await new Promise((r) => setTimeout(r, 42));
        }
        await new Promise((r) => setTimeout(r, 1800));
        for (let i = phrase.length; i >= 0; i--) {
          if (cancelledRef.current) return;
          setDisplay(phrase.slice(0, i));
          await new Promise((r) => setTimeout(r, 26));
        }
        await new Promise((r) => setTimeout(r, 450));
      }
    }

    loop();
    return () => {
      cancelledRef.current = true;
    };
  }, [showAnim, typewriterPhrase]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const empty = e.target.value.length === 0;
      setShowAnim(empty);
      onChange?.(e);
    },
    [onChange]
  );

  return (
    <div className="relative min-h-[4.5rem]">
      {showAnim ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-start pt-0 text-sm font-medium leading-relaxed text-on-surface/40"
          aria-hidden
        >
          <span>
            {display}
            <span
              className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-on-background/80 align-middle"
              aria-hidden
            />
          </span>
        </div>
      ) : null}
      <textarea
        id={tid}
        aria-label={typewriterPhrase}
        className={`relative z-10 min-h-[4.5rem] w-full resize-y border-none bg-transparent p-0 text-sm font-medium outline-none focus:ring-0 ${
          showAnim
            ? "text-transparent caret-on-background selection:bg-on-background/15 selection:text-on-surface"
            : "text-on-surface caret-on-background"
        } ${className}`}
        placeholder=""
        onChange={handleChange}
        {...rest}
      />
    </div>
  );
}
