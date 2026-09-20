import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { app } from './app.js';
import { db } from './db.js';
import { sitemap, storefrontDocument, origin } from './services/seo.js';
app.get('/sitemap.xml', sitemap);
app.get('/robots.txt', (_req, res) =>
  res
    .type('text/plain')
    .send(
      `User-agent: *\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /track\nSitemap: ${origin()}/sitemap.xml`,
    ),
);
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('dist'), { maxAge: '1h', index: false }));
  app.get('/{*path}', storefrontDocument);
}
const server = app.listen(Number(process.env.PORT ?? 4000), process.env.HOST ?? '127.0.0.1', () =>
  console.log('iPhoneBooking API listening on http://127.0.0.1:4000'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => void db.$disconnect().then(() => process.exit(0)));
  });
