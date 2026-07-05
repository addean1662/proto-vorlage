type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    ...data,
    timestamp: new Date().toISOString(),
  };

  console[level](JSON.stringify(payload));
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};
