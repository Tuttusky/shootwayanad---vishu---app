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
 * When `maxLength` is set, shows a character count and clamps pasted text for safety.
 */
export function TalentsTypewriterTextarea({
  typewriterPhrase,
  className = "",
  id,
  onChange,
  value,
  defaultValue,
  maxLength,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: Props) {
  const genId = useId();
  const tid = id ?? `talents-tw-${genId}`;
  const counterId = `${tid}-char-count`;
  const [display, setDisplay] = useState("");
  const [showAnim, setShowAnim] = useState(true);
  const cancelledRef = useRef(false);

  const limit =
    maxLength != null ? Number(maxLength) : undefined;
  const hasLimit = limit != null && !Number.isNaN(limit) && limit > 0;

  const [charCount, setCharCount] = useState(() => {
    if (typeof value === "string") return value.length;
    if (typeof defaultValue === "string") return defaultValue.length;
    return 0;
  });

  useEffect(() => {
    if (typeof value === "string") setCharCount(value.length);
  }, [value]);

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
      let next = e.target.value;
      if (hasLimit && next.length > limit!) {
        next = next.slice(0, limit!);
        e.target.value = next;
      }
      const empty = next.length === 0;
      setShowAnim(empty);
      setCharCount(next.length);
      onChange?.(e);
    },
    [onChange, hasLimit, limit]
  );

  const describedBy =
    [ariaDescribedBy, hasLimit ? counterId : ""].filter(Boolean).join(" ") ||
    undefined;

  const nearLimit = hasLimit && charCount >= limit! - 50;

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
        aria-describedby={describedBy}
        className={`relative z-10 min-h-[4.5rem] w-full resize-y border-none bg-transparent p-0 text-sm font-medium outline-none focus:ring-0 ${
          showAnim
            ? "text-transparent caret-on-background selection:bg-on-background/15 selection:text-on-surface"
            : "text-on-surface caret-on-background"
        } ${className}`}
        placeholder=""
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        {...rest}
      />
      {hasLimit ? (
        <p
          id={counterId}
          className={`mt-1.5 text-right text-[10px] font-medium tabular-nums ${
            nearLimit ? "text-amber-400/95" : "text-on-surface/50"
          }`}
          aria-live="polite"
        >
          {charCount} / {limit}
        </p>
      ) : null}
    </div>
  );
}
