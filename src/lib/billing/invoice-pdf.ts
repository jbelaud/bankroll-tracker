import "server-only";

/** Fetch only provider-issued PDFs, with bounded redirects and bounded memory. */
export async function fetchStripePdf(raw: string): Promise<Uint8Array<ArrayBuffer>> {
  let url = new URL(raw);
  for (let redirect = 0; redirect < 4; redirect++) {
    const allowed = url.hostname.endsWith(".stripe.com") || url.hostname.endsWith(".amazonaws.com");
    if (url.protocol !== "https:" || !allowed) throw new Error("Untrusted PDF origin");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location"); if (!location) throw new Error("Missing PDF redirect");
      url = new URL(location, url); continue;
    }
    if (!response.ok || !response.body) throw new Error("PDF archive fetch failed");
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); throw new Error("PDF archive too large"); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("Invalid PDF archive");
    return bytes;
  }
  throw new Error("Too many PDF redirects");
}
