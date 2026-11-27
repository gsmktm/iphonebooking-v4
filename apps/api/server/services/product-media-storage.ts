import { createHash, randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppError } from '../core.js';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const mediaPath = (id: string) => `/api/v1/media/${id}`;

type MediaSettings = {
  bucket: string;
  client: S3Client;
};
let cached: MediaSettings | null = null;

function settings(): MediaSettings {
  if (cached) return cached;
  const endpoint = process.env.MEDIA_S3_ENDPOINT;
  const bucket = process.env.MEDIA_S3_BUCKET;
  const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
    throw new AppError(
      503,
      'MEDIA_STORAGE_UNAVAILABLE',
      'Image storage is not configured. Ask an administrator to connect a private storage bucket.',
    );
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:')
    throw new AppError(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Image storage must use HTTPS.');
  const region = process.env.MEDIA_S3_REGION || 'auto';
  const pathStyle = process.env.MEDIA_S3_URL_STYLE === 'path';
  cached = {
    bucket,
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle: pathStyle,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 2,
    }),
  };
  return cached;
}

export type SupportedImage = 'image/jpeg' | 'image/png' | 'image/webp';

export function detectImageType(data: Buffer): SupportedImage | null {
  if (data.length < 16) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return 'image/jpeg';
  if (
    data.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  )
    return 'image/png';
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}

export function checkImage(data: Buffer, declared: string) {
  if (!data.length || data.length > MAX_IMAGE_BYTES)
    throw new AppError(413, 'IMAGE_SIZE_INVALID', 'Upload an image smaller than 6 MB.');
  const detected = detectImageType(data);
  if (!detected || detected !== declared)
    throw new AppError(
      422,
      'IMAGE_TYPE_INVALID',
      'Only actual JPEG, PNG or WebP images with matching MIME types can be uploaded.',
    );
  return {
    type: detected,
    extension: detected === 'image/jpeg' ? 'jpg' : detected === 'image/png' ? 'png' : 'webp',
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}

export async function putImage(data: Buffer, type: SupportedImage) {
  const { bucket, client } = settings();
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
  const id = randomUUID();
  const key = `product-media/${id}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: type,
      CacheControl: 'private, max-age=0',
    }),
  );
  return { id, key };
}

export async function getImage(key: string) {
  const { client, bucket } = settings();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteImage(key: string) {
  const { client, bucket } = settings();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
