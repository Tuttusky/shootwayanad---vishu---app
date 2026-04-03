/** Target max encoded size per image (~1.1MB base64) for faster uploads & Apps Script limits. */
export const COMPRESS_TARGET_BYTES = 850_000;
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

export async function compressImageFile(
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

export async function photosToPayload(files: File[]) {
  const photos: { name: string; mimeType: string; dataBase64: string }[] = [];
  for (const file of files) {
    const { dataBase64, mimeType } = await compressImageFile(file);
    photos.push({ name: file.name, mimeType, dataBase64 });
  }
  return photos;
}

export function safeVibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
