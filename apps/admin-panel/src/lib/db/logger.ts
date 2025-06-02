export interface Logger {
  error: (message: string, error?: unknown) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
}

export const logger: Logger = {
  error: (message: string, error?: unknown) => {
    console.error(`[DB Error] ${message}`, error);
  },
  warn: (message: string) => {
    console.warn(`[DB Warning] ${message}`);
  },
  info: (message: string) => {
    console.info(`[DB Info] ${message}`);
  }
};

export const createLogger = (prefix: string): Logger => {
  return {
    error: (message: string, error?: unknown) => {
      console.error(`[${prefix}] ${message}`, error);
    },
    warn: (message: string) => {
      console.warn(`[${prefix}] ${message}`);
    },
    info: (message: string) => {
      console.info(`[${prefix}] ${message}`);
    }
  };
}; 