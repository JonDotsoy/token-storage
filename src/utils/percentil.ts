export type Percentile = `P${number}`;
export const percentileExpr = /^P(?<value>\d+(_\d+)*(\.\d+(_\d+)*)?)$/;

export const isPercentile = (value: string): value is Percentile =>
  percentileExpr.test(value);

/**
 * @param value
 * @returns
 */
export const parsePercentile = (value: string): number | null => {
  if (!isPercentile(value)) return null;
  const v = Number(
    percentileExpr.exec(value)!.groups!.value!.replace(/_/g, ""),
  );
  return v < 1 ? v : v / 100;
};
