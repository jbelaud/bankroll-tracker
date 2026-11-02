import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  classifyMarkdownRoute,
  renderMarkdownNotFound,
  renderMarkdownPage,
  splitLocalePath,
  wantsMarkdown,
} from "./markdown";
import { GET as markdownRoute } from "@/app/agent-md/route";
import { GET as llmsRoute } from "@/app/llms.txt/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kalivoa.com");
});

describe("wantsMarkdown", () => {
  it.each([
    ["text/markdown", true],
    ["text/markdown, text/html;q=0.9", true],
    ["text/markdown, text/html", true],
    ["text/html, text/markdown", false],
    ["text/html,application/xhtml+xml,*/*;q=0.8", false],
    ["text/html;q=0.5, text/markdown;q=0.9", true],
    ["text/markdown;q=0", false],
    ["*/*", false],
    ["", false],
    [null, false],
  ])("%s -> %s", (accept, expected) => {
    expect(wantsMarkdown(accept)).toBe(expected);
  });
});

describe("routing de la variante Markdown", () => {
  it("extrait la locale et le chemin logique", () => {
    expect(splitLocalePath("/fr")).toEqual({ locale: "fr", path: "" });
    expect(splitLocalePath("/en/about/")).toEqual({ locale: "en", path: "/about" });
    expect(splitLocalePath("/frog")).toBeNull();
    expect(splitLocalePath("/__probe")).toBeNull();
  });

  it("distingue pages Markdown, pages HTML existantes et inconnues", () => {
    expect(classifyMarkdownRoute("")).toBe("page");
    expect(classifyMarkdownRoute("/about")).toBe("page");
    expect(classifyMarkdownRoute("/dashboard")).toBe("html-only");
    expect(classifyMarkdownRoute("/bookmakers/winamax")).toBe("html-only");
    expect(classifyMarkdownRoute("/academie/calculer-roi-paris")).toBe("html-only");
    expect(classifyMarkdownRoute("/__ora-404-probe")).toBe("not-found");
  });

  it("couvre chaque page du sitemap : Markdown ou HTML seulement", () => {
    const sitemap = readFileSync(resolve(process.cwd(), "src/app/sitemap.ts"), "utf8");
    const paths = [...sitemap.matchAll(/\bpath:\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(10);
    for (const path of paths) {
      expect(classifyMarkdownRoute(path), path).not.toBe("not-found");
    }
  });
});

describe("rendu Markdown", () => {
  it.each(["fr", "en"] as const)("accueil %s : titre, faits et liens absolus", (locale) => {
    const md = renderMarkdownPage(locale, "")!;
    expect(md.startsWith("# Kalivoa")).toBe(true);
    expect(md).toContain("https://kalivoa.com/sitemap.xml");
    expect(md).toContain(`https://kalivoa.com/${locale}/about`);
    expect(md.length).toBeGreaterThan(500);
  });

  it("À propos contient l’éditeur", () => {
    expect(renderMarkdownPage("fr", "/about")).toContain("ETS BELAUD");
  });

  it("retourne null pour un chemin sans variante", () => {
    expect(renderMarkdownPage("fr", "/nope")).toBeNull();
  });

  it("404 : texte explicatif et liens vers sitemap et llms.txt", () => {
    const md = renderMarkdownNotFound("en", "/<script>x");
    expect(md).toContain("does not exist");
    expect(md).not.toContain("<script>");
    expect(md).toContain("https://kalivoa.com/llms.txt");
    expect(md).toContain("https://kalivoa.com/sitemap.xml");
  });
});

describe("route /agent-md", () => {
  const call = (p: string) => markdownRoute(new NextRequest(`https://kalivoa.com/agent-md?p=${encodeURIComponent(p)}`));

  it("sert l’accueil en text/markdown avec Vary: Accept", async () => {
    const res = call("/fr");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/markdown/);
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect((await res.text()).length).toBeGreaterThan(0);
  });

  it("répond 404 en Markdown pour un chemin inconnu", async () => {
    const res = call("/fr/__ora-404-probe-x");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/^text\/markdown/);
    expect((await res.text()).length).toBeGreaterThan(20);
  });
});

describe("llms.txt", () => {
  it("contient les conseils d’usage et les pages de confiance", async () => {
    const text = await llmsRoute().text();
    expect(text).toContain("## When to use Kalivoa");
    expect(text).toContain("## How an agent should use this site");
    for (const path of ["/fr/about", "/fr/contact", "/fr/privacy"]) {
      expect(text).toContain(`https://kalivoa.com${path}`);
    }
  });
});
