import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { prepareScanImage } from "./image-preparation";

describe("small screenshot preparation", () => {
  it("enlarges the image sent to OCR while leaving the original available for deduplication", async () => {
    const original = await sharp({ create: { width: 433, height: 279, channels: 4, background: "white" } }).png().toBuffer();
    const hash = createHash("sha256").update(original).digest("hex");
    const prepared = await prepareScanImage(original, "image/png");
    const result = Buffer.from(prepared.base64, "base64");

    expect(prepared.mediaType).toBe("image/png");
    expect(await sharp(result).metadata()).toMatchObject({ width: 1299, height: 837 });
    expect(createHash("sha256").update(original).digest("hex")).toBe(hash);
  });

  it("keeps already large screenshots unchanged", async () => {
    const original = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "white" } }).jpeg().toBuffer();
    const prepared = await prepareScanImage(original, "image/jpeg");
    expect(prepared.mediaType).toBe("image/jpeg");
    expect(Buffer.from(prepared.base64, "base64")).toEqual(original);
  });
});
