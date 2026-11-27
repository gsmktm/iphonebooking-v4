import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';

export const productStudio = Router();

const productId = z.string().min(1).max(120);
const httpsUrl = z
  .string()
  .url()
  .max(1500)
  .refine((v) => new URL(v).protocol === 'https:', {
    message: 'Only HTTPS URLs are allowed.',
  });
const mediaUploadPath =
  /^\/api\/v1\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const imagePath = z
  .string()
  .max(500)
  .refine((url) => mediaUploadPath.test(url) || /^\/images\/[a-zA-Z0-9._-]+$/.test(url), {
    message: 'Choose an uploaded image or an existing local product image.',
  });
const commonsPhoto = z
  .string()
  .url()
  .max(1500)
  .refine(
    (url) =>
      new URL(url).protocol === 'https:' &&
      ['thumb.wikimedia.org', 'upload.wikimedia.org'].includes(new URL(url).hostname),
    { message: 'External archive images must come from Wikimedia Commons, or be uploaded.' },
  );
const archivePhoto = z.union([imagePath, commonsPhoto]);
const optionalText = (length: number) => z.string().trim().max(length).nullable().optional();
const archiveFields = z.object({
  family: z.enum(['iphone', 'ipad', 'ipod', 'mac']),
  name: z.string().trim().min(2).max(200),
  introducedYear: z.number().int().min(1984).max(2100),
  modelNumbers: optionalText(300),
  capacity: optionalText(250),
  chip: optionalText(200),
  sourceUrl: httpsUrl,
  referenceUrl: httpsUrl.nullable().optional(),
  imageUrl: archivePhoto.nullable().optional(),
  imageSourceUrl: httpsUrl.nullable().optional(),
  imageCredit: optionalText(200),
  imageLicense: optionalText(120),
  imageLicenseUrl: httpsUrl.nullable().optional(),
  gallery: z.array(imagePath).max(16).optional(),
});
const validExternalImage = (
  data: {
    imageUrl?: string | null;
    imageSourceUrl?: string | null;
    imageCredit?: string | null;
    imageLicense?: string | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (
    data.imageUrl &&
    !mediaUploadPath.test(data.imageUrl) &&
    (!data.imageSourceUrl || !data.imageCredit || !data.imageLicense)
  )
    ctx.addIssue({
      code: 'custom',
      path: ['imageUrl'],
      message: 'External archive photos need source, photographer and license.',
    });
};
const archiveCreate = archiveFields
  .extend({ slug: z.string().regex(/^[a-z0-9-]{5,120}$/) })
  .superRefine(validExternalImage);
const archivePatch = archiveFields
  .partial()
  .extend({ expectedUpdatedAt: z.string().datetime().optional() })
  .superRefine(validExternalImage);

export async function checkMediaReferences(urls: (string | null | undefined)[]) {
  const ids = [
    ...new Set(
      urls
        .map((value) => value?.match(mediaUploadPath)?.[1])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!ids.length) return;
  const actual = await db.mediaAsset.count({ where: { id: { in: ids } } });
  if (actual !== ids.length)
    throw new AppError(422, 'IMAGE_NOT_FOUND', 'One or more uploaded images are unavailable.');
}

async function archivePhotoMetadata(imageUrl: string | null | undefined) {
  const id = imageUrl?.match(mediaUploadPath)?.[1];
  if (!id) return {};
  const media = owned(await db.mediaAsset.findUnique({ where: { id } }));
  return {
    imageSourceUrl: media.sourceUrl,
    imageCredit: media.sourceCredit,
    imageLicense: media.license,
    imageLicenseUrl: media.licenseUrl,
  };
}

productStudio.get('/studio/products/:id', permit('product.read'), async (req, res) => {
  const id = productId.parse(req.params.id);
  const product = owned(
    await db.product.findUnique({
      where: { id },
      include: { category: true, variants: { orderBy: [{ storage: 'asc' }, { color: 'asc' }] } },
    }),
  );
  res.json(product);
});

productStudio.get('/studio/history', permit('product.read'), async (req, res) => {
  const { page, q, family } = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      q: z.string().trim().max(100).default(''),
      family: z.enum(['iphone', 'ipad', 'ipod', 'mac']).optional(),
    })
    .parse(req.query);
  const where = {
    ...(family ? { family } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  };
  const [items, total] = await Promise.all([
    db.appleHistoryDevice.findMany({
      where,
      orderBy: [{ introducedYear: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      take: 40,
      skip: (page - 1) * 40,
    }),
    db.appleHistoryDevice.count({ where }),
  ]);
  res.json({ items, total, page, pageCount: Math.ceil(total / 40) });
});

productStudio.get('/studio/history/:id', permit('product.read'), async (req, res) => {
  const id = productId.parse(req.params.id);
  res.json(owned(await db.appleHistoryDevice.findUnique({ where: { id } })));
});

productStudio.post('/studio/history', permit('product.create'), async (req, res) => {
  const { slug, ...data } = archiveCreate.parse(req.body);
  await checkMediaReferences([data.imageUrl, ...(data.gallery ?? [])]);
  const photo = await archivePhotoMetadata(data.imageUrl);
  const result = await db.$transaction(async (tx) => {
    const created = await tx.appleHistoryDevice.create({
      data: {
        id: `history-${randomUUID()}`,
        slug,
        ...data,
        ...photo,
        checkedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'archive.product.create',
        entity: 'AppleHistoryDevice',
        entityId: created.id,
        after: JSON.parse(JSON.stringify(created)) as Prisma.InputJsonValue,
        requestId: req.requestId,
      },
    });
    return created;
  });
  res.status(201).json(result);
});

productStudio.patch('/studio/history/:id', permit('product.update'), async (req, res) => {
  const id = productId.parse(req.params.id);
  const { expectedUpdatedAt, ...update } = archivePatch.parse(req.body);
  if (!Object.keys(update).length) throw new AppError(422, 'NO_CHANGES', 'Nothing to save.');
  await checkMediaReferences([update.imageUrl, ...(update.gallery ?? [])]);
  const photo = await archivePhotoMetadata(update.imageUrl);
  const saved = await db.$transaction(async (tx) => {
    const before = owned(await tx.appleHistoryDevice.findUnique({ where: { id } }));
    const changed = await tx.appleHistoryDevice.updateMany({
      where: { id, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
      data: { ...update, ...photo, checkedAt: new Date() },
    });
    if (!changed.count)
      throw new AppError(
        409,
        'ARCHIVE_EDIT_CONFLICT',
        'This device was edited elsewhere. Reload it before saving.',
      );
    const after = owned(await tx.appleHistoryDevice.findUnique({ where: { id } }));
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'archive.product.update',
        entity: 'AppleHistoryDevice',
        entityId: id,
        before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
        after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue,
        requestId: req.requestId,
      },
    });
    return after;
  });
  res.json(saved);
});
