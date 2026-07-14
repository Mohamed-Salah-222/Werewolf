const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function configuredOrigins(): string[] {
  return [process.env.FRONTEND_URL].filter((origin): origin is string => Boolean(origin));
}

export function isAllowedCorsOrigin(origin?: string): boolean {
  if (!origin) return true;

  const allowedOrigins = configuredOrigins();
  if (allowedOrigins.includes(origin)) return true;

  if (process.env.NODE_ENV !== "production" && LOCAL_DEV_ORIGIN.test(origin)) {
    return true;
  }

  return false;
}

export function resolveCorsOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  if (isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
}
