import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const dir = './server/routes';
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));

function pascalToCamel(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

let fixed = 0;
for (const file of files) {
  const path = `${dir}/${file}`;
  let content = readFileSync(path, 'utf8');
  const original = content;

  const modelNames = [...content.matchAll(/db\.([A-Z][a-zA-Z0-9]+)/g)].map((m) => m[1]);
  const uniqueModels = [...new Set(modelNames)];

  for (const model of uniqueModels) {
    const camel = pascalToCamel(model);
    content = content.replaceAll(`db.${model}.`, `db.${camel}.`);
  }

  if (content !== original) {
    writeFileSync(path, content);
    fixed++;
  }
}

console.log(`Fixed ${fixed} files`);
