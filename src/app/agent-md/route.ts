import { NextRequest } from "next/server";
import {
  classifyMarkdownRoute,
  renderMarkdownNotFound,
  renderMarkdownPage,
  splitLocalePath,
} from "@/lib/agent/markdown";
import { getSiteUrlForPath } from "@/lib/site";

// Internal target of the proxy rewrite for `Accept: text/markdown` requests.
// The public URL stays the HTML URL; this variant is never indexed itself.
const headers = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
  "Cache-Control": "public, max-age=0, s-maxage=3600",
  "X-Robots-Tag": "noindex",
};

export function GET(request: NextRequest) {
  const requested = request.headers.get("x-agent-md-path") ?? request.nextUrl.searchParams.get("p") ?? "/";
  const parts = splitLocalePath(requested) ?? { locale: "fr" as const, path: requested };
  const body =
    classifyMarkdownRoute(parts.path) === "page" ? renderMarkdownPage(parts.locale, parts.path) : null;

  if (body === null) {
    return new Response(renderMarkdownNotFound(parts.locale, requested), { status: 404, headers });
  }
  return new Response(body, {
    headers: { ...headers, Link: `<${getSiteUrlForPath(requested)}>; rel="canonical"` },
  });
}
