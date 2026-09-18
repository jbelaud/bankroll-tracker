import sharp from "sharp";
import type { ScanMediaType } from "@/lib/scan/ai-provider";

/** Enlarge small screenshots for text recognition without changing the source hash. */
export async function prepareScanImage(
  bytes: Buffer,
  mediaType: ScanMediaType
): Promise<{ base64: string; mediaType: ScanMediaType }> {
  const original = { base64: bytes.toString("base64"), mediaType };
  if (mediaType === "image/gif") return original;

  try {
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) return original;
    const scale = Math.min(3, Math.floor(2048 / Math.max(width, height)));
    if (scale < 2) return original;

    const enlarged = await sharp(bytes)
      .resize({ width: width * scale, height: height * scale, kernel: "lanczos3" })
      .png()
      .toBuffer();
    return enlarged.length <= 8 * 1024 * 1024
      ? { base64: enlarged.toString("base64"), mediaType: "image/png" }
      : original;
  } catch {
    return original;
  }
}
