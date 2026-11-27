import { Router, express } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';
import {
  checkImage,
  deleteImage,
  getImage,
  MAX_IMAGE_BYTES,
  mediaPath,
  putImage,
} from '../services/product-media-storage.js';

export const media = Router();
export const adminMedia = Router();
const mediaId = z.string().uuid();
const httpsUrl = z.string().url().max(1000).refine((url) => new URL(url).protocol === 'https:', {
  message: 'An HTTPS source link is required.',
});
const sourceSchema = z
  .object({
    sourceType: z.enum(['OWNED', 'LICENSED']),
    sourceUrl: httpsUrl.nullable().optional(),
    sourceCredit: z.string().trim().min(2).max(200),
    license: z.string().trim().max(120).nullable().optional(),
    licenseUrl: httpsUrl.nullable().optional(),
    altText: z.string().trim().min(3).max(250),
  })
  .superRefine((data, ctx) => {
    if (
      data.sourceType === 'LICENSED' &&
      (!data.sourceUrl || !data.license || !data.licenseUrl)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['license'],
        message: 'Licensed images require a source URL, author credit, license and license URL.',
      });
    }
  });
function readHeader(req: Request, name: string) {
  const value = req.get(name) ?? '';
  if (value.length > 2400)
    throw new AppError(422, 'METADATA_TOO_LARGE', 'Image metadata is too long.');
  try {
    return decodeURIComponent(value);
  } catch {
    throw new AppError(422, 'INVALID_MEDIA_METADATA', 'Invalid encoded image metadata.');
  }
}
const metadataFromHeaders = (req: Request) =>
  sourceSchema.parse({
    sourceType: readHeader(req, 'X-Image-Source-Type'),
    sourceUrl: readHeader(req, 'X-Image-Source-URL') || null,
    sourceCredit: readHeader(req, 'X-Image-Credit'),
    license: readHeader(req, 'X-Image-License') || null,
    licenseUrl: readHeader(req, 'X-Image-License-URL') || null,
    altText: readHeader(req, 'X-Image-Alt'),
  });

const uploadParser = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: MAX_IMAGE_BYTES,
});

adminMedia.post('/media/uploads', permit('product.update'), uploadParser, async (req, res) => {
  const contentType = (req.get('Content-Type') ?? '').split(';')[0].toLowerCase();
  if (!Buffer.isBuffer(req.body))
    throw new AppError(415, 'INVALID_IMAGE_BODY', 'Choose a JPEG, PNG or WebP image file.');
  const image = checkImage(req.body, contentType);
  const meta = metadataFromHeaders(req);
  const originalName = readHeader(req, 'X-Image-Name') || 'device-photo';
  const safeName = originalName.replace(/[\\/\x00-\x1f]/g, '').slice(0, 160);
  if (!safeName) throw new AppError(422, 'INVALID_FILE_NAME', 'Choose a named image file.');

  const stored = await putImage(req.body, image.type);
  try {
    const asset = await db.$transaction(async (tx) => {
      const result = await tx.mediaAsset.create({
        data: {
          id: stored.id,
          storageKey: stored.key,
          originalName: safeName,
          mimeType: image.type,
          byteSize: req.body.length,
          sha256: image.sha256,
          sourceType: meta.sourceType,
          sourceUrl: meta.sourceUrl,
          sourceCredit: meta.sourceCredit,
          license: meta.license,
          licenseUrl: meta.licenseUrl,
          altText: meta.altText,
          uploadedById: req.user!.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'media.upload',
          entity: 'MediaAsset',
          entityId: result.id,
          after: {
            mimeType: result.mimeType,
            byteSize: result.byteSize,
            sha256: result.sha256,
            sourceType: result.sourceType,
            sourceUrl: result.sourceUrl,
            sourceCredit: result.sourceCredit,
            license: result.license,
          },
          requestId: req.requestId,
        },
      });
      return result;
    });
    res.status(201).json({ ...asset, url: mediaPath(asset.id), storageKey: undefined });
  } catch (error) {
    await deleteImage(stored.key).catch(() => undefined);
    throw error;
  }
});

adminMedia.get('/media', permit('product.read'), async (req, res) => {
  const { page, q } = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      q: z.string().trim().max(100).default(''),
    })
    .parse(req.query);
  const where = q
    ? {
        OR: [
          { originalName: { contains: q, mode: 'insensitive' as const } },
          { sourceCredit: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    db.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 30,
      take: 30,
      omit: { storageKey: true },
    }),
    db.mediaAsset.count({ where }),
  ]);
  res.json({
    items: items.map((item) => ({ ...item, url: mediaPath(item.id) })),
    total,
    page,
    pageCount: Math.ceil(total / 30),
  });
});

adminMedia.patch('/media/:id', permit('product.update'), async (req, res) => {
  const id = mediaId.parse(req.params.id);
  const meta = sourceSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = owned(await tx.mediaAsset.findUnique({ where: { id } }));
    const after = await tx.mediaAsset.update({ where: { id }, data: meta });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'media.metadata.update',
        entity: 'MediaAsset',
        entityId: id,
        before: {
          sourceType: before.sourceType,
          sourceUrl: before.sourceUrl,
          sourceCredit: before.sourceCredit,
          license: before.license,
          licenseUrl: before.licenseUrl,
          altText: before.altText,
        },
        after: meta,
        requestId: req.requestId,
      },
    });
    return after;
  });
  res.json({ ...result, storageKey: undefined, url: mediaPath(result.id) });
});

const hasPhotoAccess = (req: Request) =>
  Boolean(req.user?.role?.permissions.some((p) => ['*', 'product.read', 'product.update'].includes(p)));

async function isPublicImage(url: string) {
  const [product, historical] = await Promise.all([
    db.product.findFirst({
      where: {
        active: true,
        OR: [{ image: url }, { gallery: { has: url } }, { variants: { some: { image: url } } }],
      },
      select: { id: true },
    }),
    db.appleHistoryDevice.findFirst({
      where: { OR: [{ imageUrl: url }, { gallery: { has: url } }] },
      select: { id: true },
    }),
  ]);
  return Boolean(product || historical);
}
media.get('/media/credits', async (req, res) => {
  const { slug } = z.object({ slug: z.string().max(120).regex(/^[a-z0-9-]+$/) }).parse(req.query);
  const product = await db.product.findFirst({
    where: { slug, active: true },
    select: { image: true, gallery: true, variants: { select: { image: true } } },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found.');
  const ids = [
    product.image,
    ...product.gallery,
    ...product.variants.map((v) => v.image).filter((v): v is string => Boolean(v)),
  ]
    .map((v) => v.match(/^\/api\/v1\/media\/([0-9a-f-]{36})$/i)?.[1])
    .filter((id): id is string => Boolean(id));
  const items = await db.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      sourceType: true,
      sourceUrl: true,
      sourceCredit: true,
      license: true,
      licenseUrl: true,
      altText: true,
    },
  });
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(items.map((item) => ({ ...item, url: mediaPath(item.id) })));
});
media.get('/media/:id', async (req, res) => {
  const id = mediaId.parse(req.params.id);
  const asset = owned(await db.mediaAsset.findUnique({ where: { id } }));
  const publiclyLinked = await isPublicImage(mediaPath(id));
  if (!publiclyLinked && !hasPhotoAccess(req))
    throw new AppError(404, 'NOT_FOUND', 'This image is not published.');
  const etag = `"${asset.sha256}"`;
  res.setHeader('Content-Type', asset.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    publiclyLinked ? 'public, max-age=86400' : 'private, no-store',
  );
  res.setHeader('ETag', etag);
  if (req.get('If-None-Match') === etag) {
    res.status(304).end();
    return;
  }
  try {
    const data = await getImage(asset.storageKey);
    if (!data.Body) throw new Error('Missing object body');
    const bytes = await data.Body.transformToByteArray();
    if (bytes.byteLength > MAX_IMAGE_BYTES)
      throw new Error('Stored object is larger than the permitted image size');
    res.send(Buffer.from(bytes));
  } catch {
    throw new AppError(502, 'MEDIA_TEMPORARILY_UNAVAILABLE', 'Image delivery is temporarily unavailable.');
  }
});
