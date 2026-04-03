"use client";

import { useEffect, useRef, useState } from "react";
import { photosToPayload } from "@/lib/registration-images";
import { TalentsTypewriterTextarea } from "@/components/TalentsTypewriterTextarea";

const CATEGORY_OPTIONS_ALL = [
  { value: "Saree Drape", label: "Saree Drape" },
  { value: "Dancer", label: "Dancer" },
  { value: "MakeUp", label: "MakeUp" },
  { value: "Content Creation", label: "Content Creation" },
  { value: "BTS Shoot", label: "BTS Shoot" },
] as const;

/** Hidden for Male registrants */
const CATEGORY_HIDDEN_FOR_MALE = new Set(["Saree Drape", "MakeUp"]);

const AGE_CATEGORY_HINT: Record<string, string> = {
  female: "Ages 19–30",
  male: "Ages 19–30",
  mature_women: "Ages 30–55",
  mature_men: "Ages 30–55",
};

const VALID_MAIN_AGE_CATEGORIES = new Set([
  "female",
  "male",
  "mature_women",
  "mature_men",
]);

export function RegistrationForm({
  initialAgeCategory = "",
}: {
  initialAgeCategory?: string;
}) {
  const [genderSelected, setGenderSelected] = useState<string>("");
  /** After user picks Yes on "already in WA group", show thank-you and hide Yes/No. */
  const [waGroupThankYou, setWaGroupThankYou] = useState(false);
  /** User selected No on WA group — show creator community line. */
  const [waGroupNoSelected, setWaGroupNoSelected] = useState(false);
  const [showCosting, setShowCosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCommunityPopup, setShowCommunityPopup] = useState(false);
  /** After submit: user said Yes on "already in WA group" — thank-you copy + redirect to official number only. */
  const [successAlreadyInWaGroup, setSuccessAlreadyInWaGroup] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const WHATSAPP_COMMUNITY_URL =
    "https://chat.whatsapp.com/F4RSbejqSdzKWi2MJRhvcb?mode=hqctcla";
  const OFFICIAL_CONTACT_WA_URL =
    "https://wa.me/918848772371?text=Hi%2C%20I%27m%20registered%20as%20a%20model%20for%20Vishu%20Shoot%202026";
  /** When user is already in the WA group (Yes): no group links — open chat to this number only. */
  const WA_DIRECT_OFFICIAL_NUMBER = "https://wa.me/918848772371";

  /** Post–main-form success redirect by landing category (kids use KidsRegistrationForm). */
  const POST_REGISTER_WA_BY_AGE_CATEGORY: Record<string, string> = {
    male: "https://chat.whatsapp.com/BT7UYplJLCH9UZvVApngOj",
    mature_women: "https://chat.whatsapp.com/Ip688fKfmccHU4Cb5XcmaR",
    mature_men: "https://chat.whatsapp.com/HvhcNJXavuD8sXInLjEU4E",
  };

  function postRegisterRedirectUrl(ageCat: string): string {
    if (ageCat && POST_REGISTER_WA_BY_AGE_CATEGORY[ageCat]) {
      return POST_REGISTER_WA_BY_AGE_CATEGORY[ageCat];
    }
    return OFFICIAL_CONTACT_WA_URL;
  }

  const ageCategoryPayload = VALID_MAIN_AGE_CATEGORIES.has(initialAgeCategory)
    ? initialAgeCategory
    : "";

  useEffect(() => {
    if (!initialAgeCategory) return;
    const map: Record<string, "female" | "male"> = {
      female: "female",
      male: "male",
      mature_women: "female",
      mature_men: "male",
    };
    const g = map[initialAgeCategory];
    if (g) setGenderSelected(g);
  }, [initialAgeCategory]);

  const categoryOptionsVisible =
    genderSelected === "male"
      ? CATEGORY_OPTIONS_ALL.filter((o) => !CATEGORY_HIDDEN_FOR_MALE.has(o.value))
      : [...CATEGORY_OPTIONS_ALL];

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
      const newFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newFiles]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const fullName = String(fd.get("fullName") ?? "").trim();
    const age = String(fd.get("age") ?? "").trim();
    const height = String(fd.get("height") ?? "").trim();
    const location = String(fd.get("location") ?? "").trim();
    const gender = String(fd.get("gender") ?? "");
    const category = String(fd.get("category") ?? "");
    if (
      gender === "male" &&
      (category === "Saree Drape" || category === "MakeUp")
    ) {
      setSubmitError("Please choose a valid category for Male.");
      return;
    }
    const waDigits = String(fd.get("whatsapp") ?? "").replace(/\D/g, "");
    let whatsapp = "";
    if (waDigits.length === 10) {
      whatsapp = `91${waDigits}`;
    } else if (waDigits.startsWith("91") && waDigits.length >= 12) {
      whatsapp = waDigits;
    } else {
      whatsapp = waDigits;
    }
    /** Matches form / hidden fields; sent to API → Sheet column "Already in WA Group". */
    const alreadyInWAGroup: "yes" | "no" =
      fd.get("already_in_wa_group") === "yes" ? "yes" : "no";
    const talents = String(fd.get("talents") ?? "").trim();
    const instagram = String(fd.get("instagram") ?? "").trim();
    const videoPresentation = String(fd.get("video_presentation") ?? "");
    const actingInterest = String(fd.get("acting_interest") ?? "");
    const dancer = String(fd.get("dancer") ?? "");
    const professionalModel = String(fd.get("prof_model") ?? "");
    const minimumCosting = String(fd.get("minimumCosting") ?? "").trim();

    if (professionalModel === "yes" && !minimumCosting) {
      setSubmitError("Please enter minimum costing.");
      return;
    }

    if (photos.length === 0) {
      setSubmitError("Please upload at least one full-size photo.");
      return;
    }

    setSubmitting(true);
    startSubmitProgress();
    try {
      const photoList = await photosToPayload(photos);
      const payload = {
        fullName,
        age,
        height,
        location,
        gender,
        category,
        whatsapp,
        alreadyInWAGroup,
        talents,
        instagram,
        videoPresentation,
        actingInterest,
        dancer,
        professionalModel,
        minimumCosting: professionalModel === "yes" ? minimumCosting : "",
        photos: photoList,
        ageCategory: ageCategoryPayload,
        registrationForm: "main",
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

      /* Same success rules for all main landing categories: Female, Male, Mature Women, Mature Men. */
      setSuccessAlreadyInWaGroup(alreadyInWAGroup === "yes");
      setShowSuccess(true);
      setSubmitting(false);

      const isFemale = gender === "female";
      const redirectDelayMs = alreadyInWAGroup === "yes" ? 2600 : 1500;
      setTimeout(() => {
        setShowSuccess(false);
        if (alreadyInWAGroup === "yes") {
          window.location.href = WA_DIRECT_OFFICIAL_NUMBER;
          return;
        }
        if (isFemale && alreadyInWAGroup === "no") {
          setShowCommunityPopup(true);
        } else {
          window.location.href = postRegisterRedirectUrl(ageCategoryPayload);
        }
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
    <div className="bg-background font-body selection:bg-primary-container/25 selection:text-on-surface overflow-x-hidden min-h-screen">
      <nav className="fixed top-0 z-50 w-full border-b border-on-background/30 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-3 w-full max-w-md mx-auto">
          <span className="material-symbols-outlined text-on-background">menu</span>
          <h1 className="font-headline font-bold text-sm text-on-background uppercase tracking-widest">Vishu Shoot 2026</h1>
          <div className="w-7 h-7 shrink-0" aria-hidden />
        </div>
      </nav>

      <main className="pt-20 pb-28 px-4 max-w-md mx-auto min-h-screen relative z-10">
        <header className="mb-6 text-on-background">
          <span className="font-headline font-bold tracking-widest text-[9px] uppercase mb-1 block text-on-background/85">Casting Call 2026</span>
          <h2 className="text-3xl font-headline font-extrabold leading-tight tracking-tight">
            Vishu Shoot Model <span className="italic text-on-background/95">Registration</span>
          </h2>
          {initialAgeCategory && AGE_CATEGORY_HINT[initialAgeCategory] ? (
            <p className="mt-2 text-[11px] font-medium tracking-wide text-on-background/85">
              {AGE_CATEGORY_HINT[initialAgeCategory]}
            </p>
          ) : null}
        </header>

        {submitError ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-[12px] text-red-300">
            {submitError}
          </p>
        ) : null}

        <form className="space-y-4" id="registrationForm" onSubmit={handleSubmit}>
          <section className="bg-surface-container-low border border-outline text-on-surface rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-primary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">Personal Details</h3>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-4 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">Full Name *</label>
                <input name="fullName" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium" placeholder="E.g. Aditi Nair" required type="text"/>
              </div>
              <div className="col-span-2 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">Age *</label>
                <input 
                  name="age"
                  className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium" 
                  placeholder="Years" 
                  required 
                  type="text" 
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={2}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 2);
                  }}
                />
              </div>
              <div className="col-span-3 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">Height (ft only) *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    name="height"
                    className="min-w-0 flex-1 bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium"
                    placeholder="e.g. 5.3"
                    required
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    onInput={(e) => {
                      let v = e.currentTarget.value.replace(/[^0-9.]/g, "");
                      const dot = v.indexOf(".");
                      if (dot !== -1) {
                        v =
                          v.slice(0, dot + 1) +
                          v.slice(dot + 1).replace(/\./g, "");
                      }
                      if (v.length > 6) v = v.slice(0, 6);
                      e.currentTarget.value = v;
                    }}
                  />
                  <span className="shrink-0 text-[11px] font-semibold text-on-surface/45">ft</span>
                </div>
              </div>
              <div className="col-span-3 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">Location *</label>
                <input name="location" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium" placeholder="City" required type="text"/>
              </div>
              <div className="col-span-6 rounded-xl border border-green-500/30 bg-green-500/[0.07] p-3">
                {waGroupThankYou ? (
                  <div className="py-1">
                    <input
                      type="hidden"
                      name="already_in_wa_group"
                      value="yes"
                    />
                    <p className="text-center text-[13px] font-medium leading-relaxed text-green-400">
                      Thank you for being part of our community.{" "}
                      <span aria-hidden="true">😊</span>
                    </p>
                  </div>
                ) : waGroupNoSelected ? (
                  <div className="py-1">
                    <input
                      type="hidden"
                      name="already_in_wa_group"
                      value="no"
                    />
                    <p className="text-center text-[13px] font-semibold leading-relaxed text-green-300">
                      👉 Join Our Creative Creator Community
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-medium leading-snug text-green-400 mb-2.5">
                      Are you already in the Shoot Wayanad WhatsApp group? *
                    </p>
                    <div className="flex gap-2 max-w-[220px]">
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
                        <div className="w-full py-2 text-center rounded-lg border border-green-500/35 text-[11px] font-bold text-green-300 peer-checked:bg-green-600 peer-checked:text-white peer-checked:border-green-500">
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
                        <div className="w-full py-2 text-center rounded-lg border border-green-500/35 text-[11px] font-bold text-green-300 peer-checked:bg-green-600 peer-checked:text-white peer-checked:border-green-500">
                          No
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="col-span-6 bg-surface-container border border-outline rounded-xl p-2.5">
                <p className="mb-2 text-[9px] font-medium leading-none text-white">Female or Male *</p>
                <div className="flex gap-2 max-w-xs">
                  <label className="flex-1 cursor-pointer">
                    <input
                      className="peer hidden"
                      name="gender"
                      required
                      type="radio"
                      value="female"
                      onChange={() => setGenderSelected("female")}
                    />
                    <div className="w-full py-2 text-center rounded-lg border border-outline text-[11px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Female</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      className="peer hidden"
                      name="gender"
                      type="radio"
                      value="male"
                      onChange={() => setGenderSelected("male")}
                    />
                    <div className="w-full py-2 text-center rounded-lg border border-outline text-[11px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Male</div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline text-on-surface rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-primary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">Category</h3>
            </div>
            <p className="mb-3 px-0.5 text-[9px] font-medium leading-snug text-white">
              Select one category *
              {genderSelected === "male" ? (
                <span className="mt-1 block normal-case tracking-normal text-white/55">
                  (Saree Drape &amp; MakeUp not shown for Male)
                </span>
              ) : null}
            </p>
            <div
              key={genderSelected || "any"}
              className="grid grid-cols-1 gap-2"
            >
              {categoryOptionsVisible.map((opt, idx) => (
                <label key={opt.value} className="cursor-pointer block">
                  <input
                    className="peer hidden"
                    name="category"
                    required={idx === 0}
                    type="radio"
                    value={opt.value}
                  />
                  <div className="w-full py-2.5 px-3 rounded-xl border border-outline text-[11px] font-bold text-on-surface peer-checked:bg-primary-container peer-checked:text-on-primary transition-colors">
                    {opt.label}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline text-on-surface rounded-2xl p-3" aria-labelledby="registration-talents-section-title">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-3 w-1 rounded-full bg-primary-container"></span>
              <h3
                id="registration-talents-section-title"
                className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90"
              >
                What is YoUr Talents *
              </h3>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container p-2.5 input-focus-glow transition-all duration-300">
              <TalentsTypewriterTextarea
                id="registration-talents"
                name="talents"
                required
                rows={3}
                maxLength={800}
                typewriterPhrase="Tell us about your talents — dance, acting, sports…"
                autoComplete="off"
                aria-labelledby="registration-talents-section-title"
              />
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline text-on-surface rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-secondary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">Portfolio & Presence</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">WhatsApp *</label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-on-surface/40">+91</span>
                  <input 
                    name="whatsapp"
                    className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium" 
                    placeholder="Number" 
                    required 
                    type="tel"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={12}
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 12);
                    }}
                  />
                </div>
              </div>
              <div className="group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-outline">
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-tighter text-on-background">Instagram Link</label>
                <input name="instagram" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium" placeholder="@username" type="text"/>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-outline bg-surface-container p-4 transition-colors group hover:border-primary-container/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-lg text-on-background" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface tracking-tight leading-snug">
                      Upload YoUr FULL Size photos{" "}
                      <span className="text-on-background" aria-hidden>
                        *
                      </span>
                    </p>
                    <p className="mt-0.5 text-[8px] text-white/90">
                      Required · PNG or JPG · Images are auto-compressed for faster upload
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-lg text-on-surface/30 transition-colors group-hover:text-on-background">add_circle</span>
                <input 
                  id="registration-photos"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  type="file" 
                  multiple 
                  aria-label="Upload YoUr FULL Size photos, required"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handlePhotoUpload}
                />
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-outline group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Upload preview ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-on-background z-20"
                        aria-label="Remove photo"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline text-on-surface rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-tertiary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-background/90">Professional Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container border border-outline rounded-xl p-2">
                <p className="mb-2 text-[9px] font-medium leading-none text-white">Video Presentation? *</p>
                <div className="flex gap-1.5">
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="video_presentation" required type="radio" value="yes"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="video_presentation" type="radio" value="no"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                  </label>
                </div>
              </div>
              <div className="bg-surface-container border border-outline rounded-xl p-2">
                <p className="mb-2 text-[9px] font-medium leading-none text-white">Interested in Acting? *</p>
                <div className="flex gap-1.5">
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="acting_interest" required type="radio" value="yes"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="acting_interest" type="radio" value="no"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                  </label>
                </div>
              </div>
              <div className="col-span-2 bg-surface-container border border-outline rounded-xl p-2">
                <p className="mb-2 text-[9px] font-medium leading-none text-white">Are yoU Dancer? *</p>
                <div className="flex gap-1.5 max-w-[200px]">
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="dancer" required type="radio" value="yes"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="dancer" type="radio" value="no"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                  </label>
                </div>
              </div>
              <div className="col-span-2 bg-surface-container border border-outline rounded-xl p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] font-medium leading-none text-white">Professional model? *</p>
                  <div className="flex gap-1.5 w-full sm:w-auto">
                    <label className="flex-1 sm:w-20 cursor-pointer">
                      <input className="peer hidden" name="prof_model" onClick={() => setShowCosting(true)} required type="radio" value="yes"/>
                      <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                    </label>
                    <label className="flex-1 sm:w-20 cursor-pointer">
                      <input className="peer hidden" name="prof_model" onClick={() => setShowCosting(false)} type="radio" value="no"/>
                      <div className="w-full py-1.5 text-center rounded-lg border border-outline text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                    </label>
                  </div>
                </div>
                <div className={`mt-2 border-t border-outline pt-2 ${showCosting ? '' : 'hidden'}`} id="costingField">
                  <label className="mb-1 block text-[8px] font-bold uppercase tracking-widest text-on-background">Minimum Costing *</label>
                  <input
                    name="minimumCosting"
                    className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-on-surface/40 outline-none focus:ring-0 font-medium"
                    placeholder="Amount (numbers only)"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="off"
                    required={showCosting}
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-center justify-center gap-2 pb-4 pt-4">
            <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.2em] text-on-background/85">
              <span className="h-[1px] w-8 bg-on-background/25"></span>
              Brand : SindUr Kalpetta
              <span className="h-[1px] w-8 bg-on-background/25"></span>
            </div>
            <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.2em] text-on-background/75">
              <span className="h-[1px] w-8 bg-on-background/25"></span>
              POWERED BY BRAND21st Pvt LTD
              <span className="h-[1px] w-8 bg-on-background/25"></span>
            </div>
          </div>
        </form>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <div className="border-t border-outline bg-surface-container-low/95 px-4 pb-6 pt-3 backdrop-blur-2xl">
          <button
            disabled={submitting}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-headline font-extrabold text-on-primary-container shadow-[0_8px_24px_rgba(75,46,131,0.35)] transition-all duration-300 hover:bg-surface-tint active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            form="registrationForm"
            type="submit"
          >
            {submitting ? "Sending…" : "Register Now"}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
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
            Submitting registration
          </p>
          <p className="mt-6 text-center font-headline text-5xl font-extrabold tabular-nums text-primary-container">
            {submitProgress}
            <span className="text-2xl font-bold text-primary-container/70">%</span>
          </p>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-r from-surface-tint to-primary-container transition-[width] duration-200 ease-out"
              style={{ width: `${submitProgress}%` }}
            />
          </div>
          <p className="mt-5 text-center text-[11px] text-on-surface-variant">
            Please wait — do not close this page
          </p>
        </div>
      </div>

      <div className={`fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center transition-opacity duration-500 ${showSuccess ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} id="successOverlay">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 blur-[80px] rounded-full scale-150"></div>
          <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10">
            <span className="material-symbols-outlined text-green-500 !text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </div>
        </div>
        <h2 className="mt-6 text-xl font-headline font-bold text-on-background">
          {successAlreadyInWaGroup ? "Thank you for registration" : "Registration Successful"}
        </h2>
        {!successAlreadyInWaGroup ? (
          <p className="mt-2 text-on-background/80 font-body text-[12px] text-center px-10">
            Thank you — finishing up…
          </p>
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-[105] flex flex-col items-center justify-center p-5 transition-opacity duration-300 ${
          showCommunityPopup
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-popup-title"
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          onClick={() => {
            setShowCommunityPopup(false);
            window.location.href = postRegisterRedirectUrl(ageCategoryPayload);
          }}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-outline bg-surface-container-low p-6 shadow-2xl backdrop-blur-md">
          <h2
            id="community-popup-title"
            className="text-center font-headline text-lg font-bold leading-snug text-on-surface"
          >
            Join our WhatsApp community
          </h2>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-on-surface-variant">
            Connect with Shoot Wayanad creators and stay updated.
          </p>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-headline text-sm font-extrabold text-on-primary-container shadow-[0_8px_24px_rgba(75,46,131,0.35)] transition-transform hover:bg-surface-tint active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Join group
          </a>
          <button
            type="button"
            onClick={() => {
              setShowCommunityPopup(false);
              window.location.href = postRegisterRedirectUrl(ageCategoryPayload);
            }}
            className="mt-3 w-full rounded-xl border border-outline py-3 text-[12px] font-medium text-on-surface hover:bg-surface-container"
          >
            Continue to official WhatsApp
          </button>
        </div>
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-10">
        <div className="absolute top-[5%] -right-10 w-40 h-40 border border-primary-container/20 rounded-full"></div>
        <div className="absolute bottom-[15%] -left-10 w-56 h-56 border border-primary-container/10 rounded-full"></div>
      </div>
    </div>
  );
}
