export function hasExplicitQualityConsent(value: FormDataEntryValue | null): boolean {
  return value === "true";
}

export function isOwnedBy(userId: string, ownerId: string): boolean {
  return Boolean(userId) && userId === ownerId;
}

export function isPrivateQualityStoragePath(userId: string, path: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..") && !path.startsWith("/");
}
