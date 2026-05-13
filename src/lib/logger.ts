// Centralized logger — structured JSON in production, pretty in dev.
// Safe to import from both server and client modules.

type Level = "debug" | "info" | "warn" | "error";

const isProd =
  (typeof process !== "undefined" && process.env?.NODE_ENV === "production") ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.PROD);

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  };
  const line = isProd ? JSON.stringify(entry) : `[${level.toUpperCase()}] ${msg}`;
  // eslint-disable-next-line no-console
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (isProd) fn(line);
  else fn(line, meta ?? "");
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
};
