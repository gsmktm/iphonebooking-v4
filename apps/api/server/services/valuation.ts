export interface ValuationRule {
  baseValue: number;
  goodPercent: number;
  fairPercent: number;
  damagedPercent: number;
}
export function valueDevice(
  rule: ValuationRule,
  condition: string,
  battery: number,
  functional: boolean,
): number {
  const factor =
    condition === 'Excellent'
      ? 100
      : condition === 'Good'
        ? rule.goodPercent
        : condition === 'Fair'
          ? rule.fairPercent
          : rule.damagedPercent;
  const batteryPenalty = battery < 80 ? 85 : 100;
  const functionalFactor = functional ? 100 : 60;
  return (
    Math.floor((rule.baseValue * factor * batteryPenalty * functionalFactor) / 1_000_000 / 100) *
    100
  );
}
