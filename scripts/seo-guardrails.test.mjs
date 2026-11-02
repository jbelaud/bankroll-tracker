import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSeoRegistry, textFingerprint } from './seo-guardrails.mjs';

const page = { path: '/certification', route: 'certification/page.tsx', intent: 'explain-certification', kind: 'product' };
function run({ pages = [page], source = 'const publicPaths = [{ path: "/certification" }];', missing = false, helperChanged = false } = {}) {
  return checkSeoRegistry({ registry: { pages, protectedFiles: [{ path: 'robots.ts', sha256: 'reviewed' }] }, sitemapSource: source,
    fileExists: path => !(missing && path === page.route), digest: () => helperChanged ? 'changed' : 'reviewed' });
}
test('accepts a reviewed route and sitemap', () => assert.deepEqual(run(), []));
test('catches the certification route disappearing', () => assert.match(run({ missing: true }).join(), /Protected route missing/));
test('catches a protected URL removed from the sitemap', () => assert.match(run({ source: 'const publicPaths = [{ path: "/other" }];' }).join(), /Protected page missing/));
test('requires assigning an intent to a new sitemap path', () => assert.match(run({ source: 'const publicPaths = [{ path: "/certification" }, { path: "/new" }];' }).join(), /needs an intent/));
test('rejects duplicate primary intent assignments', () => assert.match(run({ pages: [page, { ...page, path: '/other' }] }).join(), /duplicate primary intent/));
test('flags crawler or metadata helper edits for review', () => assert.match(run({ helperChanged: true }).join(), /SEO helper changed/));
test('refuses to silently pass after a sitemap format change', () => assert.match(run({ source: 'export default function sitemap() { return []; }' }).join(), /Cannot read publicPaths/));
test('requires proof and dates on new articles', () => assert.match(run({ pages: [{ ...page, kind: 'article' }] }).join(), /Article needs proof/));
test('fingerprints are stable across Windows and Linux line endings', () => assert.equal(textFingerprint('first\r\nsecond\r\n'), textFingerprint('first\nsecond\n')));
