import { describe, expect, it } from 'vitest';
import { checkImage, detectImageType, MAX_IMAGE_BYTES } from '../apps/api/server/services/product-media-storage';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(10).fill(0)]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(4),
]);

describe('safe image upload validation', () => {
  it('recognizes only real JPEG, PNG and WebP file signatures', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(webp)).toBe('image/webp');
    expect(detectImageType(Buffer.from('<svg onload="alert(1)">'))).toBeNull();
    expect(detectImageType(Buffer.from('%PDF-1.7 fake.jpg'))).toBeNull();
  });

  it('rejects mismatched MIME, masquerading HTML and zero-byte files', () => {
    expect(() => checkImage(jpeg, 'image/png')).toThrow();
    expect(() => checkImage(Buffer.from('<script>alert(1)</script>'), 'image/jpeg')).toThrow();
    expect(() => checkImage(Buffer.alloc(0), 'image/png')).toThrow();
  });

  it('limits uploaded photograph bytes to 6 MB', () => {
    expect(checkImage(jpeg, 'image/jpeg').sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => checkImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png')).toThrow();
  });
});
