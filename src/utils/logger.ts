type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...(context || {}),
    };

    if (process.env.NODE_ENV === "test") {
      // In tests, maybe we don't want noisy logs unless they are errors
      if (level === "error") {
        console.error(`[${level.toUpperCase()}] ${message}`, context || "");
      }
      return;
    }

    const output = JSON.stringify(payload);
    
    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(output);
        }
        break;
      default:
        console.log(output);
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }
}

export const logger = new Logger();
