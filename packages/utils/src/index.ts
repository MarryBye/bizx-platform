export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

export function createLogger(serviceName: string) {
  return {
    info: (msg: string, ...args: unknown[]) => {
      console.info(`[${new Date().toISOString()}] [INFO] [${serviceName}] ${msg}`, ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      console.error(`[${new Date().toISOString()}] [ERROR] [${serviceName}] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      console.warn(`[${new Date().toISOString()}] [WARN] [${serviceName}] ${msg}`, ...args);
    }
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
