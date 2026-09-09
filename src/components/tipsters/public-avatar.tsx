"use client";

import { useState } from "react";

export function PublicAvatar({ name, avatarUrl, className = "size-16 text-xl" }: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary font-bold text-primary-foreground shadow-sm ${className}`}>
    {initial}
    {avatarUrl && !failed ? <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL publique configurable, domaines distants inconnus */}
      <img src={avatarUrl} alt="" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
    </> : null}
  </span>;
}
