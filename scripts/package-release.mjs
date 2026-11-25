import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await Promise.all(
  [
    'apps/web/dist/index.html',
    'apps/api/dist-server/index.js',
    'apps/api/dist-server/worker.js',
  ].map((file) => access(path.join(root, file))),
);
const scratch = await mkdtemp(path.join(tmpdir(), 'iphonebooking-release-'));
const name = `iphonebooking-${manifest.version}`;
const stage = path.join(scratch, name);
const output = path.join(root, 'release');
const allowed = [
  'apps/web/dist',
  'apps/api/dist-server',
  'apps/api/prisma/schema.prisma',
  'apps/api/prisma/migrations',
  'apps/api/package.json',
  'apps/web/package.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.env.example',
  'README.md',
  'ARCHITECTURE.md',
  'DATABASE.md',
  'API.md',
  'DESIGN-SYSTEM.md',
  'ADMIN.md',
  'SECURITY.md',
  'DEPLOYMENT.md',
  'TESTING.md',
  'docs/database-erd.mmd',
  'docs/api-endpoint-matrix.md',
  'docs/permission-matrix.md',
  'docs/route-map.md',
  'docs/repository-audit-v2.md',
  'deployment',
  'docs/operations.md',
  'docs/release-notes.md',
  'docs/implementation-status.md',
  'docs/architecture.md',
  'docs/api.md',
  'docs/device-os-progress.md',
  'docs/requirements-register.md',
  'docs/architecture/adr-002-device-os-domain-boundaries.md',
];
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Release symlink rejected: ${relative}`);
    if (entry.isDirectory()) result.push(...(await files(path.join(dir, entry.name), relative)));
    else result.push(relative);
  }
  return result.sort();
}
try {
  await mkdir(stage, { recursive: true });
  for (const file of allowed) {
    const source = path.join(root, file);
    if ((await lstat(source)).isSymbolicLink())
      throw new Error(`Release symlink rejected: ${file}`);
    await cp(source, path.join(stage, file), { recursive: true, dereference: false });
  }
  const entries = await files(stage);
  if (
    entries.some((file) =>
      /(^|\/)(node_modules|\.git)(\/|$)|(^|\/)\.env(?:$|\.(?!example$))|\.(log|dump|sql\.gz)$/.test(
        file,
      ),
    )
  )
    throw new Error('A forbidden file entered the release package.');
  const checksums = await Promise.all(
    entries.map(
      async (file) =>
        `${createHash('sha256')
          .update(await readFile(path.join(stage, file)))
          .digest('hex')}  ${file}`,
    ),
  );
  await writeFile(path.join(stage, 'SHA256SUMS'), checksums.join('\n') + '\n');
  await mkdir(output, { recursive: true });
  const archive = path.join(output, `${name}.tar.gz`);
  const result = spawnSync('tar', ['-czf', archive, '-C', scratch, name], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Release archive failed.');
  const digest = createHash('sha256')
    .update(await readFile(archive))
    .digest('hex');
  await writeFile(path.join(output, 'SHA256SUMS'), `${digest}  ${name}.tar.gz\n`);
  console.log(
    `Packaged ${entries.length} files: release/${name}.tar.gz (no environment secrets or dependencies).`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
