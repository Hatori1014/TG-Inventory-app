import { randomUUID } from 'crypto';
import type { Params } from 'nestjs-pino';

// TT-21 — structured JSON logs to stdout (Render captures it automatically,
// no extra infra needed), with a correlation id per request so a single
// request can be traced across every log line it produced.
export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
        : undefined,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = typeof existing === 'string' ? existing : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // Never log credentials, even by accident from a future endpoint
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.token',
      ],
      censor: '[Redacted]',
    },
  },
};
