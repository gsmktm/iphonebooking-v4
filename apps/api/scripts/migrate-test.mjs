import { config } from 'dotenv';
import { userInfo } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const apiRoot = fileURLToPath(new URL('../', import.meta.url));
config({ path: [`${apiRoot}.env`, `${apiRoot}../../.env`], quiet: true });
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://localhost:5432/iphonebooking_v2_test?schema=public';
const parsed = new URL(url);
if (!parsed.username && ['localhost', '127.0.0.1'].includes(parsed.hostname))
  parsed.username = userInfo().username;
if (!parsed.pathname.endsWith('_test') || url === process.env.DATABASE_URL)
  throw new Error('Use a separate database ending with _test.');
const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  cwd: apiRoot,
  env: { ...process.env, DATABASE_URL: parsed.toString() },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
