import { describe, it, expect } from 'vitest';
import { valueDevice } from '../server/services/valuation';
const rule = { baseValue: 10000000, goodPercent: 85, fairPercent: 65, damagedPercent: 30 };
describe('valuation in integer paisa', () => {
  it('never adds floating point money', () => {
    expect(valueDevice(rule, 'Excellent', 100, true)).toBe(10000000);
    expect(valueDevice(rule, 'Good', 90, true)).toBe(8500000);
  });
  it('applies condition, battery and functional penalties on the server', () => {
    expect(valueDevice(rule, 'Fair', 70, false)).toBe(3315000);
  });
  it('rounds down to whole rupees without increasing the estimate', () => {
    const value = valueDevice({ ...rule, baseValue: 1234567 }, 'Damaged', 50, false);
    expect(value % 100).toBe(0);
    expect(value).toBeLessThan(1234567 * 0.3 * 0.85 * 0.6);
  });
});
