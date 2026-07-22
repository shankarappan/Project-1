type LogLevel = "info" | "warn" | "error";

interface LogFields {
  [key: string]: string | number | boolean | null | undefined;
}

const SENSITIVE_KEY =
  /(email|token|password|secret|authorization|invite|amount|share|balance|cookie|otp)/i;

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) {
      clean[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 200) {
      clean[key] = `${value.slice(0, 200)}…`;
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...sanitize(fields),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};
