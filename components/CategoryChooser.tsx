"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_HOOK, SITE_TAGLINE, SITE_TITLE } from "@/lib/site-marketing";

const CARDS = [
  {
    id: "female",
    emoji: "👩",
    title: "Female",
    label: "Ages 19–30",
    href: "/form?category=female",
  },
  {
    id: "kid",
    emoji: "👶",
    title: "Kid",
    label: "Ages 5–18",
    href: "/form/kids",
  },
  {
    id: "male",
    emoji: "👨",
    title: "Male",
    label: "Ages 19–30",
    href: "/form?category=male",
  },
  {
    id: "mature_women",
    emoji: "👩‍🦳",
    title: "Mature Women",
    label: "Ages 30–55",
    href: "/form?category=mature_women",
  },
  {
    id: "mature_men",
    emoji: "👨‍🦳",
    title: "Mature Men",
    label: "Ages 30–55",
    href: "/form?category=mature_men",
  },
] as const;

export function CategoryChooser() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  const handleSelect = (card: (typeof CARDS)[number]) => {
    if (exiting) return;
    setSelectedId(card.id);
    setExiting(true);
    window.setTimeout(() => {
      router.push(card.href);
    }, 420);
  };

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,235,59,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full border border-primary-container/10" />
      <div className="pointer-events-none absolute -left-16 bottom-1/4 h-96 w-96 rounded-full border border-primary-container/5" />

      <nav className="relative z-20 border-b border-on-background/30 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <span className="material-symbols-outlined text-on-background">menu</span>
          <h1 className="font-headline text-sm font-bold uppercase tracking-widest text-on-background">
            Vishu Shoot 2026
          </h1>
          <div className="w-7 shrink-0" aria-hidden />
        </div>
      </nav>

      <main className="animate-category-enter relative z-10 mx-auto max-w-lg px-4 pb-10 pt-8">
        <header className="mb-8 text-center">
          <p className="mb-3 font-headline text-[12px] font-semibold leading-snug text-on-background md:text-[13px]">
            <span aria-hidden>🔥 </span>
            {SITE_HOOK}
          </p>
          <h2 className="font-headline text-xl font-extrabold leading-tight tracking-tight text-on-background sm:text-2xl md:text-3xl">
            <span aria-hidden className="mr-1.5 inline-block">
              🎬
            </span>
            {SITE_TITLE}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-on-background/85 md:text-[14px]">
            {SITE_TAGLINE}
          </p>
          <p className="mx-auto mt-5 max-w-sm text-[10px] font-bold uppercase tracking-[0.3em] text-on-background/55">
            Choose your category
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {CARDS.map((card, i) => {
            const isSel = selectedId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                style={{ animationDelay: `${80 + i * 55}ms` }}
                onClick={() => handleSelect(card)}
                className={[
                  "category-card-enter group relative flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300",
                  "border-outline bg-surface-container-low text-on-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
                  "hover:scale-[1.02] hover:border-primary-container/40 hover:shadow-[0_12px_40px_rgba(75,46,131,0.18)]",
                  "active:scale-[0.99]",
                  isSel
                    ? "scale-[1.02] border-primary-container shadow-[0_0_0_1px_rgba(75,46,131,0.35),0_16px_48px_rgba(75,46,131,0.2)]"
                    : "",
                  exiting && !isSel ? "opacity-40 blur-[0.5px]" : "",
                  exiting && isSel ? "opacity-100" : "",
                ].join(" ")}
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container text-3xl ring-1 ring-outline transition-transform duration-300 group-hover:scale-105"
                  aria-hidden
                >
                  {card.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-headline text-base font-bold text-on-surface">
                    {card.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium text-on-surface-variant">
                    {card.label}
                  </span>
                </span>
                <span className="material-symbols-outlined shrink-0 text-on-surface/30 transition-colors group-hover:text-primary-container">
                  chevron_right
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
