export type TypeDuration =
  | "h" // hours
  | "m" // minutes
  | "s" // seconds
  | "ms"; // milliseconds
export type Duration = `${number}${TypeDuration}`;
export const durationExpr =
  /^(?<value>\d+(_\d+)*(\.\d+(_\d+)*)?)(?<type>h|m|s|ms)$/;

export const isValidDuration = (duration: string): duration is Duration => {
  return durationExpr.test(duration);
};

export type DurationParts = {
  value: number;
  type: TypeDuration;
};

export const parseDurationParts = (
  duration: Duration,
): DurationParts | null => {
  const match = duration.match(durationExpr);
  if (!match?.groups?.value || !match.groups.type) return null;

  const numericPart = match.groups.value.replace(/_/g, "");
  const value = parseFloat(numericPart);
  const type = match.groups.type as TypeDuration;

  return { value, type };
};

/** Parse duration to seconds */
export const parseSecond = (duration: string): number | null => {
  const parts = isValidDuration(duration) ? parseDurationParts(duration) : null;
  if (!parts) return null;

  switch (parts.type) {
    case "h":
      return parts.value * 60 * 60;
    case "m":
      return parts.value * 60;
    case "s":
      return parts.value;
    case "ms":
      return parts.value / 1000;
  }
};
