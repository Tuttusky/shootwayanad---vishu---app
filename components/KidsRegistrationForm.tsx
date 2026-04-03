"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { photosToPayload } from "@/lib/registration-images";
import { TalentsTypewriterTextarea } from "@/components/TalentsTypewriterTextarea";

export function KidsRegistrationForm() {
  const [waGroupThankYou, setWaGroupThankYou] = useState(false);
  const [waGroupNoSelected, setWaGroupNoSelected] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAlreadyInWaGroup, setSuccessAlreadyInWaGroup] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ageFieldError, setAgeFieldError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AGE_MSG = "Ages 5–18 only. Ages above 18 are not supported.";

  function validateAgeInput(raw: string, mode: "input" | "blur") {
    const t = raw.replace(/\D/g, "").slice(0, 2);
    if (!t) {
      setAgeFieldError(null);
      return;
    }
    const n = parseInt(t, 10);
    if (Number.isNaN(n)) {
      setAgeFieldError(null);
      return;
    }
    if (t.length === 2) {
      setAgeFieldError(n < 5 || n > 18 ? AGE_MSG : null);
      return;
    }
    if (mode === "blur" && t.length === 1) {
      setAgeFieldError(null);
    }
  }

  /** After kids registration when not already in WA group — community group. */
  const KIDS_POST_REGISTER_WA_URL =
    "https://chat.whatsapp.com/CgPZMyZbwp93mNJhUAQCJU";
  /** When parent said Yes (already in WA group): official number only, no group link. */
  const WA_DIRECT_OFFICIAL_NUMBER = "https://wa.me/918848772371";

  const stopSubmitProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startSubmitProgress = () => {
    stopSubmitProgress();
    setSubmitProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setSubmitProgress((p) => {
        if (p >= 92) return 92;
        return Math.min(92, p + Math.max(1, Math.round((92 - p) * 0.07)));
      });
    }, 45);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setAgeFieldError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const fullName = String(fd.get("fullName") ?? "").trim();
    const age = String(fd.get("age") ?? "").trim();
    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 5 || ageNum > 18) {
      setAgeFieldError(AGE_MSG);
      setSubmitError(
        "This form supports ages 5–18 only (maximum 18). Ages above 18 are not supported."
      );
      return;
    }

    const location = String(fd.get("location") ?? "").trim();
    const talents = String(fd.get("talents") ?? "").trim();
    const gender = String(fd.get("gender") ?? "");
    const category = "Content Creation";
    const waDigits = String(fd.get("whatsapp") ?? "").replace(/\D/g, "");
    let whatsapp = "";
    if (waDigits.length === 10) whatsapp = `91${waDigits}`;
    else if (waDigits.startsWith("91") && waDigits.length >= 12) whatsapp = waDigits;
    else whatsapp = waDigits;

    const alreadyInWAGroup: "yes" | "no" =
      fd.get("already_in_wa_group") === "yes" ? "yes" : "no";
    const instagram = String(fd.get("instagram") ?? "").trim();

    if (photos.length === 0) {
      setSubmitError("Please upload at least one photo.");
      return;
    }

    setSubmitting(true);
    startSubmitProgress();

    try {
      const photoList = await photosToPayload(photos);
      const payload = {
        fullName,
        age,
        height: "—",
        location,
        talents,
        gender,
        category,
        whatsapp,
        alreadyInWAGroup,
        instagram,
        videoPresentation: "no",
        actingInterest: "no",
        dancer: "no",
        professionalModel: "no",
        minimumCosting: "",
        photos: photoList,
        ageCategory: "kid",
        registrationForm: "kids",
      };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed: { ok?: boolean; error?: string } = {};
      try {
        parsed = text ? (JSON.parse(text) as { ok?: boolean; error?: string }) : {};
      } catch {
        throw new Error(
          "Server returned an invalid response. Check Apps Script deployment and try again."
        );
      }

      if (!res.ok || parsed.ok !== true) {
        throw new Error(
          parsed.error || `Registration failed (${res.status}). Try again.`
        );
      }

      stopSubmitProgress();
      setSubmitProgress(100);
      await new Promise((r) => setTimeout(r, 420));

      /* Kid landing (/form/kids): same WA Yes/No success rules as main form categories. */
      setSuccessAlreadyInWaGroup(alreadyInWAGroup === "yes");
      setShowSuccess(true);
      setSubmitting(false);

      const redirectDelayMs = alreadyInWAGroup === "yes" ? 2600 : 1500;
      setTimeout(() => {
        setShowSuccess(false);
        window.location.href =
          alreadyInWAGroup === "yes"
            ? WA_DIRECT_OFFICIAL_NUMBER
            : KIDS_POST_REGISTER_WA_URL;
      }, redirectDelayMs);
    } catch (err) {
      stopSubmitProgress();
      setSubmitProgress(0);
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body selection:bg-primary-container/25 selection:text-on-surface min-h-screen overflow-x-hidden">
      <nav className="fixed top-0 z-50 w-full border-b border-on-background/30 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link
            href="/"
            role="button"
            className="material-symbols-outlined text-2xl text-on-background"
            aria-label="Back to categories"
          >
            arrow_back
          </Link>
          <h1 className="font-headline text-sm font-bold uppercase tracking-widest text-on-background">
            Kids — Vishu 2026
          </h1>
          <div className="w-8 shrink-0" aria-hidden />
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-md min-h-screen px-4 pb-28 pt-20">
        <header className="mb-6 text-on-background">
          <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-widest text-on-background/85">
            Ages 5–18 · Maximum age 18
          </span>
          <h2 className="font-headline text-2xl font-extrabold leading-tight tracking-tight">
            Kid registration{" "}
            <span className="italic text-on-background/95">(parent / guardian)</span>
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-on-background/70">
            Use parent or guardian WhatsApp for contact. Photos should include the
            participating child.
          </p>
        </header>

        {submitError ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-[12px] text-red-300">
            {submitError}
          </p>
        ) : null}

        <form
          className="space-y-4"
          id="kidsRegistrationForm"
          onSubmit={handleSubmit}
        >
          <section className="rounded-2xl border border-outline bg-surface-container-low p-3 text-on-surface">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-3 w-1 rounded-full bg-primary-container" />
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">
                Child details
              </h3>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-4 rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">
                  Full name *
                </label>
                <input
                  name="fullName"
                  required
                  className="w-full border-none bg-transparent p-0 text-sm font-medium text-on-surface outline-none focus:ring-0 placeholder:text-on-surface/40"
                  placeholder="FULL NAME"
                  type="text"
                  autoComplete="name"
                />
              </div>
              <div className="col-span-2 rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">
                  Age *
                </label>
                <input
                  name="age"
                  required
                  aria-invalid={ageFieldError ? true : undefined}
                  className="w-full border-none bg-transparent p-0 text-sm font-medium text-on-surface outline-none focus:ring-0 placeholder:text-on-surface/40"
                  inputMode="numeric"
                  maxLength={2}
                  pattern="\d*"
                  placeholder="5–18"
                  type="text"
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 2);
                    validateAgeInput(e.currentTarget.value, "input");
                  }}
                  onBlur={(e) => validateAgeInput(e.currentTarget.value, "blur")}
                />
                {ageFieldError ? (
                  <p className="mt-1 text-[9px] font-medium leading-snug text-red-400">
                    {ageFieldError}
                  </p>
                ) : null}
              </div>
              <div className="col-span-6 rounded-xl border border-outline bg-surface-container p-2.5">
                <p className="mb-2 text-[9px] font-medium leading-none text-white">
                  Child: Female or Male *
                </p>
                <div className="flex max-w-xs gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      className="peer hidden"
                      name="gender"
                      required
                      type="radio"
                      value="female"
                    />
                    <div className="w-full rounded-lg border border-outline py-2 text-center text-[11px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">
                      Female
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      className="peer hidden"
                      name="gender"
                      type="radio"
                      value="male"
                    />
                    <div className="w-full rounded-lg border border-outline py-2 text-center text-[11px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">
                      Male
                    </div>
                  </label>
                </div>
              </div>
              <div className="col-span-6 rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">
                  City / location *
                </label>
                <input
                  name="location"
                  required
                  className="w-full border-none bg-transparent p-0 text-sm font-medium text-on-surface outline-none focus:ring-0 placeholder:text-on-surface/40"
                  placeholder="City"
                  type="text"
                />
              </div>

              <div className="col-span-6 rounded-xl border border-green-500/30 bg-green-500/[0.07] p-3">
                {waGroupThankYou ? (
                  <div className="py-1">
                    <input type="hidden" name="already_in_wa_group" value="yes" />
                    <p className="text-center text-[13px] font-medium leading-relaxed text-green-400">
                      Thank you for being part of our community.{" "}
                      <span aria-hidden="true">😊</span>
                    </p>
                  </div>
                ) : waGroupNoSelected ? (
                  <div className="py-1">
                    <input type="hidden" name="already_in_wa_group" value="no" />
                    <p className="text-center text-[13px] font-semibold leading-relaxed text-green-300">
                      👉 Join Our Creative Creator Community
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-2.5 text-[10px] font-medium leading-snug text-green-400">
                      Already in Shoot Wayanad WhatsApp group? *
                    </p>
                    <div className="flex max-w-[220px] gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          className="peer hidden"
                          name="already_in_wa_group"
                          required
                          type="radio"
                          value="yes"
                          onChange={() => {
                            setWaGroupNoSelected(false);
                            setWaGroupThankYou(true);
                          }}
                        />
                        <div className="w-full rounded-lg border border-green-500/35 py-2 text-center text-[11px] font-bold text-green-300 peer-checked:border-green-500 peer-checked:bg-green-600 peer-checked:text-white">
                          Yes
                        </div>
                      </label>
                      <label className="flex-1 cursor-pointer">
                        <input
                          className="peer hidden"
                          name="already_in_wa_group"
                          type="radio"
                          value="no"
                          onChange={() => {
                            setWaGroupThankYou(false);
                            setWaGroupNoSelected(true);
                          }}
                        />
                        <div className="w-full rounded-lg border border-green-500/35 py-2 text-center text-[11px] font-bold text-green-300 peer-checked:border-green-500 peer-checked:bg-green-600 peer-checked:text-white">
                          No
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl border border-outline bg-surface-container-low p-3 text-on-surface"
            aria-labelledby="kids-category-talents-title"
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-3 w-1 shrink-0 rounded-full bg-primary-container" />
              <h3
                id="kids-category-talents-title"
                className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90"
              >
                Category
              </h3>
            </div>
            <p className="mb-3 px-0.5 text-[9px] font-medium leading-snug text-white">
              Content Creation <span className="text-white/55">(kids track)</span>
            </p>
            <p className="mb-1.5 px-0.5 text-[8px] font-bold uppercase tracking-tighter text-on-background">
              What is YoUr Talents *
            </p>
            <div className="rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
              <TalentsTypewriterTextarea
                id="kids-talents"
                name="talents"
                required
                rows={3}
                maxLength={800}
                typewriterPhrase="Tell us about the child's talents — dance, sports, art…"
                autoComplete="off"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline bg-surface-container-low p-3 text-on-surface">
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-1 shrink-0 rounded-full bg-secondary-container" />
                <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">
                  Share YoUr details
                </h3>
              </div>
              <p className="mt-1.5 pl-3 text-[9px] font-medium leading-snug text-white/95">
                Parent or guardian WhatsApp, optional Instagram, and photos of the child
              </p>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">
                  Parent WhatsApp *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-on-surface/40">+91</span>
                  <input
                    name="whatsapp"
                    required
                    className="w-full border-none bg-transparent p-0 text-sm font-medium text-on-surface outline-none focus:ring-0 placeholder:text-on-surface/40"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Number"
                    type="tel"
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 12);
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">
                  Instagram (optional)
                </label>
                <input
                  name="instagram"
                  className="w-full border-none bg-transparent p-0 text-sm font-medium text-on-surface outline-none focus:ring-0 placeholder:text-on-surface/40"
                  placeholder="@username"
                  type="text"
                />
              </div>
            </div>

            <div className="relative flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-outline bg-surface-container p-4 transition-colors hover:border-primary-container/40">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/10 transition-transform group-hover:scale-105">
                  <span
                    className="material-symbols-outlined text-lg text-on-background"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    cloud_upload
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold leading-snug tracking-tight text-on-surface">
                    Photos of the child <span className="text-on-background">*</span>
                  </p>
                  <p className="mt-0.5 text-[8px] text-white/90">
                    PNG or JPG · Auto-compressed
                  </p>
                </div>
              </div>
              <input
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                aria-label="Upload photos"
                onChange={handlePhotoUpload}
              />
            </div>

            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-outline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 opacity-0 backdrop-blur-md transition-opacity hover:bg-error group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </form>
      </main>

      <footer className="fixed bottom-0 left-0 z-50 w-full border-t border-outline bg-surface-container-low/95 px-4 pb-6 pt-3 backdrop-blur-2xl">
        <button
          disabled={submitting}
          form="kidsRegistrationForm"
          type="submit"
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-headline font-extrabold text-on-primary-container shadow-[0_8px_24px_rgba(75,46,131,0.35)] transition-all duration-300 hover:bg-surface-tint active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Complete Registration"}
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </footer>

      <div
        className={`fixed inset-0 z-[95] flex flex-col items-center justify-center transition-opacity duration-300 ${
          submitting && !showSuccess
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!submitting || showSuccess}
        aria-live="polite"
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" />
        <div className="relative z-10 mx-6 w-full max-w-[min(100%,20rem)] rounded-2xl border border-outline bg-surface-container-low p-8 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-md">
          <p className="text-center font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">
            Submitting
          </p>
          <p className="mt-6 text-center font-headline text-5xl font-extrabold tabular-nums text-on-background">
            {submitProgress}
            <span className="text-2xl font-bold text-on-background/70">%</span>
          </p>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-r from-surface-tint to-primary-container transition-[width] duration-200 ease-out"
              style={{ width: `${submitProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-opacity duration-500 ${
          showSuccess ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-green-500/20 blur-[80px]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500 bg-green-500/10">
            <span
              className="material-symbols-outlined !text-5xl text-green-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
          </div>
        </div>
        <h2 className="mt-6 font-headline text-xl font-bold text-on-background">
          {successAlreadyInWaGroup ? "Thank you for registration" : "Registration successful"}
        </h2>
        {!successAlreadyInWaGroup ? (
          <p className="mt-2 px-10 text-center font-body text-[12px] text-on-background/80">
            Redirecting…
          </p>
        ) : null}
      </div>
    </div>
  );
}
