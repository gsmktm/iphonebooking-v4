import express from 'express';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { config, webDistPath } from './config.js';
import { app } from './app.js';
import { db } from './db.js';
import { sitemap, storefrontDocument, robots } from './services/seo.js';
app.get('/sitemap.xml', sitemap);
app.get('/robots.txt', robots);
if (config.production) {
  await access(path.join(webDistPath, 'index.html'));
  app.use(
    express.static(webDistPath, {
      maxAge: '1h',
      index: false,
      redirect: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`))
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (['sw.js', 'manifest.webmanifest', 'index.html'].includes(path.basename(filePath)))
          res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  app.get('/{*path}', storefrontDocument);
}
// HTML/sitemap handlers are registered after the API error handler.
app.use(((error, _req, res, _next) => {
  console.error(
    JSON.stringify({
      level: 'error',
      code: 'DOCUMENT_RESPONSE_FAILED',
      errorType: error?.constructor?.name,
    }),
  );
  res
    .status(503)
    .set('Cache-Control', 'no-store')
    .type('text/plain')
    .send('This page is temporarily unavailable. Please try again shortly.');
}) as express.ErrorRequestHandler);

await db.$connect();
const server = app.listen(config.port, config.host, () =>
  console.log(
    JSON.stringify({ level: 'info', event: 'listening', host: config.host, port: config.port }),
  ),
);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    const forceExit = setTimeout(() => process.exit(1), 15_000);
    forceExit.unref();
    server.close(() => void db.$disconnect().then(() => process.exit(0)));
    server.closeIdleConnections();
  });
