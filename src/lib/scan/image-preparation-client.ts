const MAX_PREPARED_IMAGE_BYTES = 8 * 1024 * 1024;

export function scanImageScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.max(1, Math.min(3, Math.floor(2048 / Math.max(width, height))));
}

/**
 * Agrandit localement les petites captures pour aider la lecture des textes fins.
 * L'original est envoyé séparément et reste la source du hash anti-doublon.
 */
export async function prepareClientScanImage(file: File): Promise<File | null> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = scanImageScale(bitmap.width, bitmap.height);
    if (scale < 2) return null;

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob || blob.size > MAX_PREPARED_IMAGE_BYTES) return null;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "capture";
    return new File([blob], `${baseName}-scan.png`, { type: "image/png", lastModified: file.lastModified });
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
