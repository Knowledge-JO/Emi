export function formatBase(raw: string, decimals = 18) {
  try {
    const value = BigInt(raw);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = value / base;
    const frac = (value % base)
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "")
      .slice(0, 6);
    return frac ? `${whole.toString()}.${frac}` : whole.toString();
  } catch {
    return raw;
  }
}

export function errorText(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: string; code?: string }).message;
    const code = (error as { code?: string }).code;
    return code ? `${message} (${code})` : message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export function shortAddress(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
