import { describe, expect, it } from 'vitest';
import { displaySpecValue } from '../apps/web/src/services/product-spec';

describe('displaySpecValue', () => {
  it('renders strings, numbers and missing values without throwing', () => {
    expect(displaySpecValue('M5')).toBe('M5');
    expect(displaySpecValue(256)).toBe('256');
    expect(displaySpecValue(null)).toBe('Not specified');
  });

  it('formats merchant-supplied secondary MacBook price notes from JSON', () => {
    const notes = {
      '16GB RAM / 1TB SSD': 'NPR 289,900 — type unspecified',
      '16GB RAM / 512GB SSD': 'NPR 234,900 — type unspecified',
    };
    expect(displaySpecValue(notes)).toContain('16GB RAM / 512GB SSD: NPR 234,900');
    expect(displaySpecValue(notes)).toContain('16GB RAM / 1TB SSD: NPR 289,900');
  });

  it('renders empty objects as None and arrays in readable form', () => {
    expect(displaySpecValue({})).toBe('None');
    expect(displaySpecValue(['M5', 'A18 Pro'])).toBe('M5, A18 Pro');
  });
});
