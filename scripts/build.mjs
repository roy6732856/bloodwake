import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
// Explicit allowlist: source control, tests, credentials and deployment config
// are never included in the public static asset directory.
for (const [from, to] of [['index.html', 'index.html'], ['src', 'src'], ['vendor', 'vendor'], ['public/assets', 'assets']]) {
  await cp(resolve(root, from), resolve(dist, to), { recursive: true });
}
await writeFile(resolve(dist, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'
  Cache-Control: no-cache
`);
console.log('Production game assets ready in dist/');
