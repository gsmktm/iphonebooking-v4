/**
 * Prisma stores Product.specs as JSON. Merchant imports may contain an array
 * or keyed notes instead of a scalar string. Render them safely as text so
 * a malformed or structured spec never crashes a product/detail page.
 */
export function displaySpecValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not specified';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.length ? value.map(displaySpecValue).join(', ') : 'None';
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length
      ? entries.map(([key, item]) => `${key}: ${displaySpecValue(item)}`).join('; ')
      : 'None';
  }
  return 'Not specified';
}
