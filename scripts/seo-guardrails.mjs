import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function textFingerprint(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

export function checkSeoRegistry({ registry, sitemapSource, fileExists, digest }) {
  const errors = [];
  // Deliberately limited to the current literal publicPaths convention. Fail closed
  // when a refactor changes it, so the checker is reviewed with the new format.
  const list = sitemapSource.match(/const publicPaths\s*=\s*\[([\s\S]*?)\];/);
  if (!list) return ['Cannot read publicPaths: update the SEO checker after reviewing the sitemap refactor.'];
  const paths = [...list[1].matchAll(/\bpath:\s*"([^"]*)"/g)].map(match => match[1]);
  if (!paths.length) errors.push('No sitemap paths found.');
  if (new Set(paths).size !== paths.length) errors.push('Duplicate sitemap path.');
  const knownPaths = new Set();
  const intents = new Set();
  for (const page of registry.pages) {
    if (knownPaths.has(page.path)) errors.push(`Duplicate registry path: ${page.path}`);
    knownPaths.add(page.path);
    if (!page.intent || intents.has(page.intent)) errors.push(`Missing or duplicate primary intent: ${page.path}`);
    intents.add(page.intent);
    if (!paths.includes(page.path)) errors.push(`Protected page missing from sitemap: ${page.path || '/'}`);
    if (!fileExists(page.route)) errors.push(`Protected route missing: ${page.route}`);
    if (page.kind === 'article' && (!page.proof || !page.publishedAt || !page.observeUntil)) {
      errors.push(`Article needs proof, publication and observation dates: ${page.path}`);
    }
  }
  for (const path of paths) {
    if (!knownPaths.has(path)) errors.push(`New sitemap path needs an intent and review in the registry: ${path}`);
  }
  for (const file of registry.protectedFiles) {
    if (!fileExists(file.path)) errors.push(`SEO helper missing: ${file.path}`);
    else if (digest(file.path) !== file.sha256) errors.push(`SEO helper changed: ${file.path}. Review its impact and update the recorded decision and fingerprint.`);
  }
  return errors;
}

export function checkRepository(root) {
  const registry = JSON.parse(readFileSync(resolve(root, 'docs/seo/registre-pages.json'), 'utf8'));
  return checkSeoRegistry({
    registry,
    sitemapSource: readFileSync(resolve(root, 'src/app/sitemap.ts'), 'utf8'),
    fileExists: path => existsSync(resolve(root, path)),
    digest: path => textFingerprint(readFileSync(resolve(root, path), 'utf8')),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const errors = checkRepository(root);
  if (errors.length) {
    console.error(errors.map(error => `SEO: ${error}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('SEO registry matches sitemap and routes; reviewed helper fingerprints match. This does not verify live indexing or rankings.');
  }
}
