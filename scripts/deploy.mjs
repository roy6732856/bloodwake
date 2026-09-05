import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
try {
  const config = JSON.parse(readFileSync('wrangler.deploy.json', 'utf8'));
  if (!config.d1_databases?.[0]?.database_id || config.d1_databases[0].database_id.startsWith('00000000')) throw new Error('Run npm run cloud:setup first.');
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.deploy.json'], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch { console.error('Deployment is not configured. Run npx wrangler login, then npm run cloud:setup.'); process.exitCode = 1; }
