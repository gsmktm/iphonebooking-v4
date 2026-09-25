import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');
const routesDir = path.resolve('server/routes');

function parseSchema() {
  const models = [];
  // Find all model blocks (handle nested braces for some model definitions)
  const modelRegex = /model\s+(\w+)\s*\{/g;
  let match;
  const modelPositions = [];
  while ((match = modelRegex.exec(schema))) {
    modelPositions.push({ name: match[1], index: match.index });
  }

  // Find the end of each model block
  for (let i = 0; i < modelPositions.length; i++) {
    const start = schema.indexOf('{', modelPositions[i].index) + 1;
    const endModel =
      i < modelPositions.length - 1
        ? schema.indexOf('model ', start)
        : schema.indexOf('\n}', start);
    const blockEnd = schema.lastIndexOf('}', start + (endModel - start));
    const body = schema.slice(start, blockEnd);
    const fields = [];
    const relations = [];
    const fieldLines = body
      .split('\n')
      .filter(
        (l) =>
          l.trim() &&
          !l.trim().startsWith('//') &&
          !l.trim().startsWith('///') &&
          !l.trim().startsWith('+'),
      );
    for (const line of fieldLines) {
      const trimmed = line.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      const fieldName = parts[0];
      const fieldType = parts[1].replace('?', '');
      const attrs = parts.slice(2).join(' ');
      const isId = attrs.includes('@id');
      const isUnique = attrs.includes('@unique');
      const isArray = parts[1].includes('[');
      if (fieldType.startsWith('@') || fieldType === '') continue;
      fields.push({
        name: fieldName,
        type: fieldType,
        isArray,
        isId,
        isUnique,
      });
      if (
        !fieldType.startsWith('Int') &&
        !fieldType.startsWith('String') &&
        !fieldType.startsWith('Boolean') &&
        !fieldType.startsWith('Float') &&
        !fieldType.startsWith('DateTime') &&
        !fieldType.startsWith('Json') &&
        !fieldType.startsWith('Decimal') &&
        !fieldType.startsWith('BigInt')
      ) {
        relations.push({ name: fieldName, type: fieldType, isList: isArray });
      }
    }
    models.push({ name: modelPositions[i].name, fields, relations });
  }
  return models;
}

const SKIP_MODELS = new Set([
  'User',
  'Role',
  'UserSession',
  'Address',
  'Category',
  'Product',
  'ProductVariant',
  'AccessoryCompatibility',
  'Store',
  'InventoryStock',
  'InventoryLedger',
  'InventoryUnit',
  'CartItem',
  'Wishlist',
  'Order',
  'OrderItem',
  'OrderStatusHistory',
  'Booking',
  'Payment',
  'Refund',
  'Device',
  'TradeInRule',
  'TradeIn',
  'Repair',
  'RepairStatusHistory',
  'RepairQuote',
  'SupportTicket',
  'TicketMessage',
  'Notification',
  'CMSPage',
  'AuditLog',
  'WebhookEvent',
  'Job',
  'AnalyticsEvent',
  'Subscriber',
  'BookingAllocation',
  'PolicyAcceptance',
  'B2BContact',
  'Retailer',
  'RetailerSettlement',
  'APIClient',
  'SLAConfig',
]);

const models = parseSchema();
const routeRegistrations = [];

for (const model of models) {
  if (SKIP_MODELS.has(model.name)) continue;
  const pascalName = model.name;
  const camelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
  const fileName = `${camelName}.ts`;

  let code = `import { Router } from 'express';\nimport { db } from '../db.js';\n`;
  if (model.fields.some((f) => f.isId)) code += `import { AppError } from '../core.js';\n`;
  code += `export const ${camelName} = Router();\n\n`;

  // GET /list
  code += `${camelName}.get('/list', async (_req, res) => {\n`;
  code += `  res.json(await db.${pascalName}.findMany({ take: 100 }));\n`;
  code += `});\n\n`;

  // GET /:id
  if (model.fields.some((f) => f.isId)) {
    code += `${camelName}.get('/:id', async (req, res) => {\n`;
    code += `  const row = await db.${pascalName}.findUnique({ where: { id: String(req.params.id) } });\n`;
    code += `  if (!row) throw new AppError(404, 'NOT_FOUND', '${pascalName} not found.');\n`;
    code += `  res.json(row);\n`;
    code += `});\n\n`;
  }

  // POST /
  code += `${camelName}.post('/', async (req, res) => {\n`;
  code += `  const row = await db.${pascalName}.create({ data: req.body });\n`;
  code += `  res.status(201).json(row);\n`;
  code += `});\n\n`;

  // PATCH /:id
  if (model.fields.some((f) => f.isId)) {
    code += `${camelName}.patch('/:id', async (req, res) => {\n`;
    code += `  const row = await db.${pascalName}.update({ where: { id: String(req.params.id) }, data: req.body });\n`;
    code += `  res.json(row);\n`;
    code += `});\n\n`;
  }

  // DELETE /:id
  if (model.fields.some((f) => f.isId)) {
    code += `${camelName}.delete('/:id', async (req, res) => {\n`;
    code += `  await db.${pascalName}.delete({ where: { id: String(req.params.id) } });\n`;
    code += `  res.json({ ok: true });\n`;
    code += `});\n`;
  }

  const outPath = path.join(routesDir, fileName);
  fs.writeFileSync(outPath, code);
  routeRegistrations.push({ fileName, varName: camelName, pascalName });
}

// Update app.ts
const appPath = path.resolve('server/app.ts');
let appCode = fs.readFileSync(appPath, 'utf8');

const imports = routeRegistrations
  .map((r) => `import { ${r.varName} } from './routes/${r.fileName.replace('.ts', '')}.js';`)
  .join('\n');
const registrations = routeRegistrations
  .map((r) => `app.use('/api/v1/${r.varName}', ${r.varName});`)
  .join('\n');

const insertMarker = 'const errors: ErrorRequestHandler';
const insertIdx = appCode.indexOf(insertMarker);
if (insertIdx > 0) {
  appCode =
    appCode.slice(0, insertIdx) +
    imports +
    '\n' +
    registrations +
    '\n\n' +
    appCode.slice(insertIdx);
  fs.writeFileSync(appPath, appCode);
  console.log('Updated server/app.ts');
}

console.log(`Generated ${routeRegistrations.length} route files`);
