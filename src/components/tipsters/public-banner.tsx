export function PublicBanner({ url }: { url: string | null }) {
  if (!url) return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* eslint-disable-next-line @next/next/no-img-element -- URL publique configurable, domaines distants inconnus */}
    <img src={url} alt="" referrerPolicy="no-referrer" className="size-full object-cover opacity-25" />
    <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/55" />
    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-card/20" />
  </div>;
}
