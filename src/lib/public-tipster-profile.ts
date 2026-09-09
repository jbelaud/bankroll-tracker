export function normalizePublicHandle(value: string) {
  return value.normalize("NFKC").trim().replace(/^@+/, "").toLocaleLowerCase("fr");
}

export function validPublicHandle(value: string) {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(value);
}

export function normalizeXHandle(value: string) {
  const trimmed = value.normalize("NFKC").trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/i)?.[1];
  return (fromUrl ?? trimmed.replace(/^@+/, "")).toLocaleLowerCase("fr");
}

export function validXHandle(value: string | null) {
  return value === null || /^[a-z0-9_]{1,15}$/.test(value);
}

export function validPublicAvatarUrl(value: string | null) {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value.length <= 1_000;
  } catch {
    return false;
  }
}
