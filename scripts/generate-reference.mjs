import { readFile, readdir, writeFile } from 'node:fs/promises';

const schema = await readFile('apps/api/prisma/schema.prisma', 'utf8');
const models = [...schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)].map((match) => ({
  name: match[1],
  fields: match[2]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
}));
const names = new Set(models.map((model) => model.name));
const diagram = ['erDiagram'];
let relations = 0;
for (const model of models) {
  diagram.push(`  ${model.name} {`);
  const foreignKeys = model.fields.flatMap(
    (field) =>
      field
        .match(/fields:\s*\[([^\]]+)\]/)?.[1]
        .split(',')
        .map((key) => key.trim()) ?? [],
  );
  for (const field of model.fields) {
    const parts = field.match(/^(\w+)\s+(\w+)(\??)(\[\])?(.*)$/);
    if (!parts || names.has(parts[2]) || field.startsWith('@@')) continue;
    const key = field.includes('@id')
      ? ' PK'
      : foreignKeys.includes(parts[1])
        ? ' FK'
        : field.includes('@unique')
          ? ' UK'
          : '';
    diagram.push(
      `    ${parts[2]}${parts[4] ? '_array' : ''} ${parts[1]}${key}${parts[3] ? ' "nullable"' : ''}`,
    );
  }
  diagram.push('  }');
  for (const field of model.fields) {
    const relation = field.match(/^(\w+)\s+(\w+)(\??)\s+.*@relation\(.*fields:\s*\[([^\]]+)\]/);
    if (!relation || !names.has(relation[2])) continue;
    const keys = relation[4].split(',').map((key) => key.trim());
    const unique = model.fields.some(
      (line) =>
        keys.some((key) => line.startsWith(`${key} `) && line.includes('@unique')) ||
        line.includes(`@@unique([${keys.join(', ')}])`),
    );
    diagram.push(
      `  ${relation[2]} ${relation[3] ? '|o' : '||'}--${unique ? 'o|' : 'o{'} ${model.name} : "${relation[1]}"`,
    );
    relations++;
  }
}
await writeFile('docs/database-erd.mmd', `${diagram.join('\n')}\n`);

const app = await readFile('apps/api/server/app.ts', 'utf8');
const mounts = new Map(
  [...app.matchAll(/app\.use\('([^']+)',\s*(\w+)\)/g)].map((match) => [match[2], match[1]]),
);
const rows = [];
for (const file of (await readdir('apps/api/server/routes'))
  .filter((name) => name.endsWith('.ts'))
  .sort()) {
  const source = await readFile(`apps/api/server/routes/${file}`, 'utf8');
  const calls = [...source.matchAll(/(\w+)\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\3/g)];
  for (let index = 0; index < calls.length; index++) {
    const match = calls[index],
      mount = mounts.get(match[1]);
    if (!mount) continue;
    const body = source.slice(match.index, calls[index + 1]?.index ?? source.length);
    const permission = body.match(/permit\('([^']+)'\)/)?.[1];
    const inherited = source.includes(`${match[1]}.use(requireUser)`);
    const access = permission
      ? `Permission: ${permission}`
      : inherited || /requireUser/.test(body.split('async')[0])
        ? 'Signed-in account; handler enforces scope'
        : 'Handler-specific; see API.md';
    const line = source.slice(0, match.index).split('\n').length;
    rows.push(
      `| ${match[2].toUpperCase()} | \`${mount}${match[4]}\` | ${access} | [${file}:${line}](../apps/api/server/routes/${file}#L${line}) |`,
    );
  }
}
await writeFile(
  'docs/api-endpoint-matrix.md',
  `# API endpoint inventory\n\nGenerated from mounted literal route declarations with \`pnpm docs:generate\`. It lists paths and explicit middleware, not a replacement for the authorization checks inside each handler. Array aliases, generic resource expansion and fail-closed legacy families are documented in [API.md](../API.md).\n\n| Method | Endpoint | Explicit access boundary | Source |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`,
);

const permissions = await readFile('apps/api/server/services/permissions.ts', 'utf8');
const permissionNames = [
  ...permissions.split('] as const;')[0].matchAll(/'([a-z]+\.[a-z]+)'/g),
].map((match) => match[1]);
const uses = [];
for (const permission of permissionNames) {
  const matching = rows
    .filter((row) => row.includes(`Permission: ${permission} |`))
    .map((row) => row.split('|')[2].trim());
  uses.push(
    `| \`${permission}\` | ${matching.join(', ') || 'Generic resource map or service guard; inspect the source'} |`,
  );
}
await writeFile(
  'docs/permission-matrix.md',
  `# Implemented permission inventory\n\nDerived from the permission catalog and mounted handlers. Roles store a list of these permissions; \`*\` is restricted to existing super administrators. [ADMIN.md](../ADMIN.md) explains read/write separation and independent approval.\n\n| Permission | Explicit endpoint uses |\n| --- | --- |\n${uses.join('\n')}\n`,
);
console.log(
  `Generated ERD (${models.length} models, ${relations} foreign-key relations), ${rows.length} literal endpoints and ${permissionNames.length} permissions.`,
);
