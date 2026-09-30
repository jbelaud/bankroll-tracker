export const MAX_CAPTURES = 100;
export const MAX_BYTES = 40 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export function canAddCapture(count: number, bytes: number, size: number) {
  return count < MAX_CAPTURES && size > 0 && size <= MAX_IMAGE_BYTES && bytes + size <= MAX_BYTES;
}
export function cropBounds(rect: { x: number; y: number; width: number; height: number }, viewport: { width: number; height: number }, image: { width: number; height: number }) {
  if (![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height, image.width, image.height].every(Number.isFinite)
    || viewport.width <= 0 || viewport.height <= 0 || image.width <= 0 || image.height <= 0
    || rect.x < 0 || rect.y < 0 || rect.width < 12 || rect.height < 12
    || rect.x + rect.width > viewport.width + 1 || rect.y + rect.height > viewport.height + 1) throw new Error("Zone de capture invalide ou trop petite.");
  const x = Math.floor(rect.x * image.width / viewport.width);
  const y = Math.floor(rect.y * image.height / viewport.height);
  return { x, y, width: Math.min(image.width - x, Math.ceil(rect.width * image.width / viewport.width)), height: Math.min(image.height - y, Math.ceil(rect.height * image.height / viewport.height)) };
}
