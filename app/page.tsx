"use client";

import { useRef, useState } from "react";

/** Target max encoded size per image (~1.1MB base64) for faster uploads & Apps Script limits. */
const COMPRESS_TARGET_BYTES = 850_000;
const LONG_EDGE_STEPS = [2048, 1920, 1600, 1440, 1280, 1024, 960] as const;
const QUALITY_STEPS = [0.9, 0.85, 0.8, 0.74, 0.68, 0.62, 0.56] as const;

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

async function blobToPayloadPart(blob: Blob): Promise<{
  dataBase64: string;
  mimeType: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
  const dataBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  return { dataBase64, mimeType: "image/jpeg" };
}

/**
 * Adaptive JPEG compression: resize long edge in steps, then lower quality until
 * under target size (or best effort at minimum quality).
 */
async function compressImageFile(
  file: File
): Promise<{ dataBase64: string; mimeType: string }> {
  const img = await createImageBitmap(file);
  try {
    const srcW = img.width;
    const srcH = img.height;
    let bestBlob: Blob | null = null;
    let lastSizeKey = "";

    for (const maxDim of LONG_EDGE_STEPS) {
      const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
      const cw = Math.max(1, Math.round(srcW * scale));
      const ch = Math.max(1, Math.round(srcH * scale));
      const sizeKey = `${cw}x${ch}`;
      if (sizeKey === lastSizeKey) continue;
      lastSizeKey = sizeKey;

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare image");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cw, ch);

      for (const q of QUALITY_STEPS) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (!blob) continue;
        bestBlob = blob;
        if (blob.size <= COMPRESS_TARGET_BYTES) {
          return blobToPayloadPart(blob);
        }
      }
    }

    if (!bestBlob) {
      throw new Error("Could not compress image");
    }
    return blobToPayloadPart(bestBlob);
  } finally {
    img.close();
  }
}

async function photosToPayload(files: File[]) {
  const photos: { name: string; mimeType: string; dataBase64: string }[] = [];
  for (const file of files) {
    const { dataBase64, mimeType } = await compressImageFile(file);
    photos.push({ name: file.name, mimeType, dataBase64 });
  }
  return photos;
}

export default function Home() {
  const [showCosting, setShowCosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const waDigits = String(fd.get("whatsapp") ?? "").replace(/\D/g, "");
    let whatsapp = "";
    if (waDigits.length === 10) {
      whatsapp = `91${waDigits}`;
    } else if (waDigits.startsWith("91") && waDigits.length >= 12) {
      whatsapp = waDigits;
    } else {
      whatsapp = waDigits;
    }
    const instagram = String(fd.get("instagram") ?? "").trim();
    const videoPresentation = String(fd.get("video_presentation") ?? "");
    const actingInterest = String(fd.get("acting_interest") ?? "");
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
        whatsapp,
        instagram,
        videoPresentation,
        actingInterest,
        professionalModel,
        minimumCosting: professionalModel === "yes" ? minimumCosting : "",
        photos: photoList,
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

      setShowSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        window.location.href =
          "https://wa.me/918848772371?text=Hi%2C%20I%27m%20registered%20as%20a%20model%20for%20Vishu%20Shoot%202026";
      }, 1500);
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
    <div className="dark bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/90 backdrop-blur-xl border-b border-[#FFD700]/10">
        <div className="flex items-center justify-between px-5 py-3 w-full max-w-md mx-auto">
          <span className="material-symbols-outlined text-[#FFD700]">menu</span>
          <h1 className="font-headline font-bold text-sm text-[#FFD700] uppercase tracking-widest">Vishu Shoot 2026</h1>
          <div className="w-7 h-7 shrink-0" aria-hidden />
        </div>
      </nav>

      <main className="pt-20 pb-28 px-4 max-w-md mx-auto min-h-screen relative z-10">
        <header className="mb-6">
          <span className="text-secondary-container font-headline font-bold tracking-widest text-[9px] uppercase mb-1 block">Casting Call 2026</span>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface leading-tight tracking-tight">
            Vishu Shoot Model <span className="text-primary-container italic">Registration</span>
          </h2>
        </header>

        {submitError ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-[12px] text-red-300">
            {submitError}
          </p>
        ) : null}

        <form className="space-y-4" id="registrationForm" onSubmit={handleSubmit}>
          <section className="bg-surface-container-low/50 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-primary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest opacity-80">Personal Details</h3>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-4 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">Full Name *</label>
                <input name="fullName" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" placeholder="E.g. Aditi Nair" required type="text"/>
              </div>
              <div className="col-span-2 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">Age *</label>
                <input 
                  name="age"
                  className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" 
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
              <div className="col-span-3 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">Height *</label>
                <input name="height" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" placeholder="cm/ft" required type="text"/>
              </div>
              <div className="col-span-3 group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">Location *</label>
                <input name="location" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" placeholder="City" required type="text"/>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low/50 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-secondary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest opacity-80">Portfolio & Presence</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">WhatsApp *</label>
                <div className="flex items-center gap-1">
                  <span className="text-white/30 text-[10px] font-medium">+91</span>
                  <input 
                    name="whatsapp"
                    className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" 
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
              <div className="group relative bg-surface-container rounded-xl p-2.5 transition-all duration-300 input-focus-glow border border-white/5">
                <label className="block text-[8px] font-bold text-primary-container uppercase tracking-tighter mb-0.5">Instagram Link</label>
                <input name="instagram" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" placeholder="@username" type="text"/>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative bg-surface-container border border-dashed border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-primary-container/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface tracking-tight leading-snug">
                      Upload YoUr FULL Size photos{" "}
                      <span className="text-primary-container" aria-hidden>
                        *
                      </span>
                    </p>
                    <p className="text-[8px] text-on-surface-variant mt-0.5">
                      Required · PNG or JPG · Images are auto-compressed for faster upload
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-white/20 text-lg group-hover:text-primary-container transition-colors">add_circle</span>
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
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Upload preview ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-white z-20"
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

          <section className="bg-surface-container-low/50 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1 h-3 bg-tertiary-container rounded-full"></span>
              <h3 className="font-headline text-xs font-bold uppercase tracking-widest opacity-80">Professional Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container border border-white/5 rounded-xl p-2">
                <p className="text-[9px] font-medium text-white/60 mb-2 leading-none">Video Presentation? *</p>
                <div className="flex gap-1.5">
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="video_presentation" required type="radio" value="yes"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="video_presentation" type="radio" value="no"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                  </label>
                </div>
              </div>
              <div className="bg-surface-container border border-white/5 rounded-xl p-2">
                <p className="text-[9px] font-medium text-white/60 mb-2 leading-none">Interested in Acting? *</p>
                <div className="flex gap-1.5">
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="acting_interest" required type="radio" value="yes"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input className="peer hidden" name="acting_interest" type="radio" value="no"/>
                    <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                  </label>
                </div>
              </div>
              <div className="col-span-2 bg-surface-container border border-white/5 rounded-xl p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] font-medium text-white/60 leading-none">Professional model? *</p>
                  <div className="flex gap-1.5 w-full sm:w-auto">
                    <label className="flex-1 sm:w-20 cursor-pointer">
                      <input className="peer hidden" name="prof_model" onClick={() => setShowCosting(true)} required type="radio" value="yes"/>
                      <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">Yes</div>
                    </label>
                    <label className="flex-1 sm:w-20 cursor-pointer">
                      <input className="peer hidden" name="prof_model" onClick={() => setShowCosting(false)} type="radio" value="no"/>
                      <div className="w-full py-1.5 text-center rounded-lg border border-white/5 text-[10px] font-bold peer-checked:bg-primary-container peer-checked:text-on-primary">No</div>
                    </label>
                  </div>
                </div>
                <div className={`mt-2 pt-2 border-t border-white/5 ${showCosting ? '' : 'hidden'}`} id="costingField">
                  <label className="block text-[8px] font-bold text-primary-container uppercase tracking-widest mb-1">Minimum Costing *</label>
                  <input name="minimumCosting" className="w-full bg-transparent border-none p-0 text-sm text-on-surface placeholder:text-white/20 outline-none focus:ring-0 font-medium" placeholder="Per day / per shoot" type="text" required={showCosting}/>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-4 pb-4 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-3 text-on-surface-variant text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">
              <span className="w-8 h-[1px] bg-white/20"></span>
              Brand : SindUr Kalpetta
              <span className="w-8 h-[1px] bg-white/20"></span>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant text-[8px] font-bold tracking-[0.2em] uppercase opacity-40">
              <span className="w-8 h-[1px] bg-white/20"></span>
              POWERED BY BRAND21st Pvt LTD
              <span className="w-8 h-[1px] bg-white/20"></span>
            </div>
          </div>
        </form>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <div className="bg-surface-container-highest/90 backdrop-blur-2xl border-t border-white/5 px-4 pb-6 pt-3">
          <button disabled={submitting} className="w-full max-w-md mx-auto bg-primary-container hover:bg-surface-tint text-on-primary-container font-headline font-extrabold py-3.5 rounded-xl shadow-[0_8px_30px_rgba(255,215,0,0.15)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none" form="registrationForm" type="submit">
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
        <div className="relative z-10 mx-6 w-full max-w-[min(100%,20rem)] rounded-2xl border border-[#FFD700]/20 bg-[#131313]/85 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p className="text-center font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#FFD700]/90">
            Submitting registration
          </p>
          <p className="mt-6 text-center font-headline text-5xl font-extrabold tabular-nums text-[#FFD700]">
            {submitProgress}
            <span className="text-2xl font-bold text-[#FFD700]/70">%</span>
          </p>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b8860b] to-[#FFD700] transition-[width] duration-200 ease-out"
              style={{ width: `${submitProgress}%` }}
            />
          </div>
          <p className="mt-5 text-center text-[11px] text-white/45">
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
        <h2 className="mt-6 text-xl font-headline font-bold text-white">Registration Successful</h2>
        <p className="mt-2 text-white/60 font-body text-[12px] text-center px-10">Redirecting to official WhatsApp...</p>
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-10">
        <div className="absolute top-[5%] -right-10 w-40 h-40 border border-primary-container/20 rounded-full"></div>
        <div className="absolute bottom-[15%] -left-10 w-56 h-56 border border-primary-container/10 rounded-full"></div>
      </div>
    </div>
  );
}
