import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env, corsOrigins } from './config/env.js';
import { getDriveService } from './services/googleDrive.js';
import { authRoutes, leadsRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';
import { driveRoutes } from './routes/drive.js';
import { casesRoutes } from './routes/cases.js';
import { workflowRoutes } from './routes/workflows.js';
import { invoiceItemRoutes } from './routes/invoiceItems.js';
import { invoiceRoutes } from './routes/invoices.js';
import { welcomeCodeRoutes } from './routes/welcomeCodes.js';
import { privacyRoutes } from './routes/privacy.js';
import { privacyAdminRoutes } from './routes/admin/privacyAdmin.js';
import { erasureRoutes } from './routes/erasure.js';

import { ZodError } from 'zod';

import type { FastifyError } from 'fastify';
import { redisClient, getClientIp } from './lib/rateLimiter.js';

const app = Fastify({ logger: true, trustProxy: env.TRUST_PROXY });

// 1. Origin Protection: Block requests bypassing Cloudflare Edge Security
app.addHook('onRequest', async (request, reply) => {
  if (env.CLOUDFLARE_ORIGIN_SECRET) {
    // Whitelist Render health checks
    if (request.url === '/api/health' || request.url.startsWith('/api/health?')) {
      return;
    }
    const incomingSecret = request.headers['x-cloudflare-origin-secret'];
    if (incomingSecret !== env.CLOUDFLARE_ORIGIN_SECRET) {
      reply.status(403).send({
        error: 'Forbidden: Direct origin access prohibited. Requests must route through Cloudflare Edge Security.',
      });
      return reply;
    }
  }
});

// 2. Defensive HTTP Security Headers
app.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (request.url.startsWith('/api/')) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.header('Surrogate-Control', 'no-store');
  }
});

// 2. Centralized Error Handler for Zod & Input Validation
app.setErrorHandler((error: FastifyError | any, request, reply) => {
  if (error instanceof ZodError) {
    const firstIssue = error.errors[0];
    const fieldPath = firstIssue?.path?.join('.') || 'input';
    const message = firstIssue?.message || 'Invalid input data';
    return reply.status(400).send({
      error: 'Validation failed',
      message: `${fieldPath}: ${message}`,
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle Fastify schema validation errors
  if (error && typeof error === 'object' && 'validation' in error && error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      message: error.message || 'Schema validation error',
    });
  }

  // Handle file too large / multipart errors
  if (error && typeof error === 'object' && error.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.status(413).send({
      error: 'File too large: uploaded document exceeds the allowable limit of 25 MB',
    });
  }

  // Log internal errors and avoid leaking database credentials or stack traces
  request.log.error(error);
  const status = error && typeof error === 'object' && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  const message = error && typeof error === 'object' && typeof error.message === 'string' ? error.message : 'An error occurred';
  return reply.status(status).send({
    error: status === 500 ? 'An unexpected internal error occurred. Please try again.' : message,
  });
});

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || env.NODE_ENV === 'development') {
      cb(null, true);
      return;
    }
    if (
      corsOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
});
await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: '7d' }, // Tokens expire after 7 days; never-expiring tokens are a critical vulnerability
});
await app.register(rateLimit, {
  global: true,
  max: 120, // 120 requests per minute baseline
  timeWindow: '1 minute',
  redis: redisClient || undefined,
  keyGenerator: (req) => getClientIp(req),
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please wait ${Math.ceil(context.ttl / 1000)} seconds before retrying.`,
  }),
});
await app.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
    files: 1,                   // 1 file per upload request
    fields: 15,                 // Max non-file form fields
    fieldNameSize: 100,         // Max field name size
    fieldSize: 1024 * 1024,     // 1 MB max for textual form fields
  },
});

app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await app.register(authRoutes);
await app.register(leadsRoutes);
await app.register(settingsRoutes);
await app.register(driveRoutes);
await app.register(casesRoutes);
await app.register(workflowRoutes);
await app.register(invoiceItemRoutes);
await app.register(invoiceRoutes);
await app.register(welcomeCodeRoutes);
await app.register(privacyRoutes);
await app.register(privacyAdminRoutes);
await app.register(erasureRoutes);

const drive = getDriveService();
if (drive) {
  try {
    const rootId = await drive.initialize();
    app.log.info(`Google Drive root folder: ${rootId}`);
  } catch (err) {
    app.log.warn({ err }, 'Google Drive initialization skipped or failed');
  }
}

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    const RETENTION_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
    setTimeout(() => {
      import('./services/retentionCleanupService.js')
        .then(({ runRetentionPurge }) => runRetentionPurge())
        .then((summary) => app.log.info({ totalPurged: summary.totalPurged }, 'Initial retention purge completed'))
        .catch((err) => app.log.warn({ err }, 'Retention purge initial execution error'));
    }, 10000);

    const purgeInterval: NodeJS.Timeout = setInterval(() => {
      import('./services/retentionCleanupService.js')
        .then(({ runRetentionPurge }) => runRetentionPurge())
        .then((summary) => app.log.info({ totalPurged: summary.totalPurged }, 'Periodic retention purge completed'))
        .catch((err) => app.log.warn({ err }, 'Periodic retention purge error'));
    }, RETENTION_PURGE_INTERVAL_MS);
    if (purgeInterval.unref) purgeInterval.unref();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
