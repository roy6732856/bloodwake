import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const cli = 'node_modules/wrangler/bin/wrangler.js';
function run(args, capture = false) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit' });
  if (result.status !== 0) throw new Error('Wrangler failed. Check login with: npx wrangler login');
  return result.stdout;
}
try {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  let databases = JSON.parse(run(['d1', 'list', '--json'], true));
  let database = databases.find(d => d.name === 'bloodwake-saves');
  if (!database) {
    run(['d1', 'create', 'bloodwake-saves', '--location', 'apac', '--update-config=false']);
    databases = JSON.parse(run(['d1', 'list', '--json'], true));
    database = databases.find(d => d.name === 'bloodwake-saves');
  }
  if (!database?.uuid) throw new Error('D1 database not found after creation.');
  // Never replace an existing deployment config bound to a different database.
  if (existsSync('wrangler.deploy.json')) {
    const old = JSON.parse(readFileSync('wrangler.deploy.json', 'utf8'));
    if (old.d1_databases?.[0]?.database_id !== database.uuid) throw new Error('Deployment config targets a different D1 database. Check the selected account before proceeding.');
  }
  config.d1_databases[0].database_id = database.uuid;
  if (process.env.CLOUDFLARE_ACCOUNT_ID) config.account_id = process.env.CLOUDFLARE_ACCOUNT_ID;
  writeFileSync('wrangler.deploy.json', JSON.stringify(config, null, 2) + '\n');
  run(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.deploy.json']);
  console.log('D1 is ready. Run npm run deploy to publish the game.');
} catch (e) { console.error(e.message); process.exitCode = 1; }
