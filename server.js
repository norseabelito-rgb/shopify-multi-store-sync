// server.js
const express = require('express');
const path = require('path');
const config = require('./config');
const { initDb, closePool, query, healthCheck } = require('./lib/db');
const { createLogger, requestLoggerMiddleware, errorLoggerMiddleware } = require('./lib/logger');
const { rateLimit, errorHandler, notFoundHandler, asyncHandler } = require('./lib/middleware');
const { auditContextMiddleware } = require('./services/auditService');
const { router: healthRouter, recordRequestMetric } = require('./routes/health');
const { runDeploymentVerification } = require('./services/deploymentVerification');

// Route imports
const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');
const marketingRouter = require('./routes/marketing');
const shopifyRouter = require('./routes/shopify');
const aiRouter = require('./routes/ai');
const productsRouter = require('./routes/products');
const jobsRouter = require('./routes/jobs');

const logger = createLogger('server');
const app = express();
const PORT = config.PORT;
const APP_PASSWORD = process.env.APP_PASSWORD || '';

// Track server state for graceful shutdown
let isShuttingDown = false;
let server = null;
let activeConnections = new Set();

// ==================== MIDDLEWARE ====================

// Track connections for graceful shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({ error: 'Server is shutting down' });
  }
  activeConnections.add(res);
  res.on('finish', () => activeConnections.delete(res));
  next();
});

// Request timing for metrics
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordRequestMetric(duration, res.statusCode >= 400);
  });
  next();
});

// Body parsing
app.use(express.json({ limit: `${config.MAX_FILE_SIZE_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.MAX_FILE_SIZE_MB}mb` }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging (structured)
app.use(requestLoggerMiddleware());

// Audit context
app.use(auditContextMiddleware());

// ==================== AUTH ====================

function parseCookies(req) {
  const header = req.headers.cookie;
  const result = {};
  if (!header) return result;
  header.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    if (!k) return;
    result[k.trim()] = decodeURIComponent((v || '').trim());
  });
  return result;
}

// Login page
app.get('/login', (req, res) => {
  if (!APP_PASSWORD) {
    return res.send(`
      <html>
        <head><title>Login</title></head>
        <body style="font-family: system-ui; padding: 32px; color: #e5e7eb; background:#020617;">
          <h2>Login dezactivat</h2>
          <p>Nu este setată <code>APP_PASSWORD</code> în environment. Toată aplicația este accesibilă direct.</p>
          <p><a href="/">→ Mergi la dashboard</a></p>
        </body>
      </html>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Login – Control Panel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at 0 0, rgba(96,165,250,0.18), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(129,140,248,0.18), transparent 60%),
        #020617;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e5e7eb;
    }
    .card {
      background: rgba(15,23,42,0.96);
      border-radius: 16px;
      padding: 24px 22px 20px;
      border: 1px solid rgba(148,163,184,0.4);
      box-shadow: 0 18px 50px rgba(15,23,42,0.9);
      width: 320px;
      max-width: 90vw;
    }
    h1 { margin: 0 0 4px; font-size: 20px; }
    p { margin: 0 0 12px; font-size: 13px; color: #9ca3af; }
    label { display: block; font-size: 12px; margin-bottom: 4px; }
    input[type="password"] {
      width: 100%;
      padding: 8px 9px;
      border-radius: 10px;
      border: 1px solid rgba(148,163,184,0.6);
      background: #020617;
      color: #e5e7eb;
      font-size: 13px;
      box-sizing: border-box;
      margin-bottom: 12px;
    }
    button {
      width: 100%;
      padding: 8px 10px;
      border-radius: 999px;
      border: 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      color: #020617;
      box-shadow: 0 12px 30px rgba(37,99,235,0.65);
    }
    .note { margin-top: 10px; font-size: 11px; color: #9ca3af; text-align: center; }
    .error { color: #fecaca; font-size: 12px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Control Panel Login</h1>
    <p>Introduce parola setată în <code>APP_PASSWORD</code> în Railway.</p>
    ${req.query.err === '1' ? '<div class="error">Parolă incorectă.</div>' : ''}
    <form method="POST" action="/login">
      <label for="password">Parola</label>
      <input id="password" type="password" name="password" autocomplete="current-password" required />
      <button type="submit">Intră în panel</button>
    </form>
    <div class="note">Panel intern pentru Shopify & Ads – by Ștefan.</div>
  </div>
</body>
</html>
  `);
});

app.post('/login', rateLimit({ maxRequests: 5, windowMs: 60000 }), (req, res) => {
  if (!APP_PASSWORD) {
    return res.redirect('/');
  }
  const pwd = (req.body && req.body.password) || '';
  if (pwd === APP_PASSWORD) {
    res.setHeader('Set-Cookie', 'app_auth=1; HttpOnly; Path=/; SameSite=Lax');
    logger.info('User logged in', { ip: req.ip });
    return res.redirect('/');
  }
  logger.warn('Failed login attempt', { ip: req.ip });
  return res.redirect('/login?err=1');
});

// Auth middleware
function authMiddleware(req, res, next) {
  if (!APP_PASSWORD) {
    return next();
  }
  // Allow health checks, login, and static files without auth
  if (req.path.startsWith('/health') || req.path.startsWith('/login') || req.path.startsWith('/public')) {
    return next();
  }

  const cookies = parseCookies(req);
  if (cookies.app_auth === '1') {
    return next();
  }

  return res.redirect('/login');
}

app.use(authMiddleware);

// ==================== ROUTES ====================

// Health checks (no auth required)
app.use('/health', healthRouter);

// API rate limiting
app.use('/ai', rateLimit({ maxRequests: 30, windowMs: 60000 }));

// Main routes
app.use('/', apiRouter);
app.use('/marketing', marketingRouter);
app.use('/shopify', shopifyRouter);
app.use('/ai', aiRouter);
app.use('/products', productsRouter);
app.use('/jobs', jobsRouter);
app.use('/', dashboardRouter);

// Error logging
app.use(errorLoggerMiddleware());

// 404 handler
app.use(notFoundHandler());

// Global error handler
app.use(errorHandler());

// ==================== JOB RECOVERY (Item 15, 47) ====================

async function recoverStaleJobs() {
  const staleThresholdMs = config.JOB_STALE_THRESHOLD_HOURS * 60 * 60 * 1000;
  const staleTime = new Date(Date.now() - staleThresholdMs).toISOString();

  try {
    // Mark stale push jobs as failed
    const pushJobsResult = await query(
      `UPDATE products_push_jobs
       SET status = 'failed',
           error_message = COALESCE(error_message, '') || ' [Server restart: job marked as failed]',
           finished_at = NOW(),
           updated_at = NOW()
       WHERE status = 'running'
         AND started_at < $1
       RETURNING id, store_id`,
      [staleTime]
    );

    if (pushJobsResult.rows.length > 0) {
      logger.warn('Recovered stale push jobs', {
        count: pushJobsResult.rows.length,
        jobs: pushJobsResult.rows.map(j => j.id),
      });
    }

    // Mark stale bulk jobs as failed
    const bulkJobsResult = await query(
      `UPDATE bulk_jobs
       SET status = 'failed',
           errors = COALESCE(errors, '[]'::jsonb) || '[{"error": "Job marked as failed due to server restart"}]'::jsonb,
           finished_at = NOW(),
           updated_at = NOW()
       WHERE status = 'running'
         AND started_at < $1
       RETURNING id, type, store_id`,
      [staleTime]
    );

    if (bulkJobsResult.rows.length > 0) {
      logger.warn('Recovered stale bulk jobs', {
        count: bulkJobsResult.rows.length,
        jobs: bulkJobsResult.rows,
      });
    }

    const totalRecovered = pushJobsResult.rows.length + bulkJobsResult.rows.length;
    if (totalRecovered > 0) {
      logger.info(`Job recovery complete: ${totalRecovered} stale jobs marked as failed`);
    }
  } catch (err) {
    logger.error('Job recovery failed', { error: err.message });
  }
}

// ==================== GRACEFUL SHUTDOWN (Item 33) ====================

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Wait for active requests to complete (with timeout)
  const shutdownTimeout = setTimeout(() => {
    logger.warn('Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);

  // Wait for active connections to drain
  const checkInterval = setInterval(() => {
    if (activeConnections.size === 0) {
      clearInterval(checkInterval);
      clearTimeout(shutdownTimeout);
      finalizeShutdown();
    }
  }, 100);
}

async function finalizeShutdown() {
  try {
    // Close database pool
    await closePool();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: err.message });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// ==================== STARTUP ====================

(async () => {
  try {
    // Initialize database
    await initDb();
    logger.info('Database initialized');

    // Recover stale jobs
    await recoverStaleJobs();

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        env: config.NODE_ENV,
        port: PORT,
      });
    });

    // Track connections for graceful shutdown
    server.on('connection', (socket) => {
      socket.on('close', () => {
        // Connection tracking handled by middleware
      });
    });

    // Run deployment verification (non-blocking)
    setTimeout(async () => {
      try {
        await runDeploymentVerification();
      } catch (err) {
        logger.warn('Deployment verification failed', { error: err.message });
      }
    }, 1000);

    // Periodic health check (Item 34)
    setInterval(async () => {
      const health = await healthCheck();
      if (!health.healthy) {
        logger.error('Database health check failed', health);
      }
    }, config.HEALTH_CHECK_INTERVAL_MS);

  } catch (err) {
    console.error('=== STARTUP FAILED ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    logger.error('Startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
})();
