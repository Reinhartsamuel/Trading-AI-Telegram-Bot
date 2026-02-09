import pino from "pino";
import { config } from "@/config/env";

const transport =
  config.NODE_ENV === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: false,
          translateTime: "SYS:standard",
        },
      }
    : undefined;

export const logger = pino(
  {
    level: config.NODE_ENV === "development" ? "debug" : "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport ? pino.transport(transport) : undefined
);

export function createLogger(name: string) {
  return logger.child({ module: name });
}
