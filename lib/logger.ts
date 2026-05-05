type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
const minLevel = LEVELS[envLevel] ?? LEVELS.info;

function emit(level: LogLevel, payload: Record<string, unknown> | undefined, msg: string) {
  if (LEVELS[level] < minLevel) return;
  const line = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(payload ?? {}),
  };
  const out = JSON.stringify(line);
  if (level === "error" || level === "warn") {
    console.error(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  debug: (payload: Record<string, unknown> | undefined, msg: string) =>
    emit("debug", payload, msg),
  info: (payload: Record<string, unknown> | undefined, msg: string) =>
    emit("info", payload, msg),
  warn: (payload: Record<string, unknown> | undefined, msg: string) =>
    emit("warn", payload, msg),
  error: (payload: Record<string, unknown> | undefined, msg: string) =>
    emit("error", payload, msg),
};
