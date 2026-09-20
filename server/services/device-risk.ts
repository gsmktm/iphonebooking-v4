export interface DeviceRiskProvider {
  name: string;
  check(input: {
    canonicalId: string;
  }): Promise<{ result: 'CLEAR' | 'REVIEW' | 'BLOCKED' | 'UNKNOWN'; reason: string }>;
}
// Full external identifiers must come from an authorized protected identifier vault.
// The current registry deliberately stores digests only, so no live lookup is claimed.
export const deviceRiskProvider: DeviceRiskProvider = {
  name: 'unconfigured',
  async check() {
    return {
      result: 'UNKNOWN',
      reason:
        'No authorized lost/stolen or blacklist provider is connected. External device status is unknown.',
    };
  },
};
