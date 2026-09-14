export function normalizeDiscoverSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const search = raw?.normalize("NFKC").trim().slice(0, 60) ?? "";
  const handleSearch = search.replace(/^@+/, "");

  return { search, handleSearch };
}
