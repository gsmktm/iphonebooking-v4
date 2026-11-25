import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const policyFiles = [
  'AGENTS.md',
  'AGENT.md',
  'CLAUDE.md',
  '.agents/rules/agent.md',
  '.cursor/rules/agent.mdc',
];
const skills = [
  '.agents/skills/debug-and-verify/SKILL.md',
  '.agents/skills/commerce-integrity/SKILL.md',
  '.agents/skills/secure-prisma-changes/SKILL.md',
  '.agents/skills/storefront-ui-quality/SKILL.md',
  '.agents/skills/release-gates/SKILL.md',
];
let checked = 0;
for (const path of policyFiles) {
  const content = await readFile(path, 'utf8');
  assert.match(content, /iPhoneBooking/i, path + ': missing project identity');
  assert.doesNotMatch(
    content,
    /Jetro|jet_exec|jet_render|jet_query/i,
    path + ': unrelated instructions',
  );
  checked++;
}
for (const path of skills) {
  const content = await readFile(path, 'utf8');
  assert.match(
    content,
    /^---\r?\nname: [a-z-]+\r?\ndescription: .+\r?\n---/m,
    path + ': missing skill frontmatter',
  );
  assert.doesNotMatch(content, /^hooks:/m, path + ': unreviewed hooks forbidden');
  assert.doesNotMatch(
    content,
    /curl[^\n]*\|[^\n]*\b(?:bash|sh)\b/i,
    path + ': shell piping forbidden',
  );
  checked++;
}
const sources = await readFile('docs/agent-skill-sources.md', 'utf8');
for (const source of [
  'mattpocock/skills',
  'obra/superpowers',
  'affaan-m/ECC',
  'anthropics/skills',
  'addyosmani/agent-skills',
]) {
  assert(sources.includes(source), 'Missing source ' + source);
}
checked++;
console.log('Skills policy: ' + checked + ' files verified.');
