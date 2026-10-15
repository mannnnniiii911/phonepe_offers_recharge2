import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDatabase } from './db.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { adminProvidersRouter } from './routes/adminProviders.js';
import { adminOffersRouter } from './routes/adminOffers.js';
import { adminSubmissionsRouter } from './routes/adminSubmissions.js';
import { adminStatsRouter } from './routes/adminStats.js';
import { adminSettingsRouter } from './routes/adminSettings.js';
import { adminAuditRouter } from './routes/adminAudit.js';
import { adminUsersRouter } from './routes/adminUsers.js';
import { ordersRouter } from './routes/orders.js';
import { adminOrdersRouter } from './routes/adminOrders.js';
import { paymentClicksRouter } from './routes/paymentClicks.js';

export const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public customer routes
app.use('/api', publicRouter);
app.use('/api', ordersRouter);
app.use('/api', paymentClicksRouter);

// Admin Auth routes
app.use('/api/admin', authRouter);
app.use('/api/auth', authRouter);

// Protected Admin routes
app.use('/api/admin/providers', adminProvidersRouter);
app.use('/api/admin/offers', adminOffersRouter);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/audit-logs', adminAuditRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/orders', adminOrdersRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched API routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.status(404).send('Not Found');
});

// Central error handler (avoid leaking stack traces)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED_ERROR]', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Initialize the database once per running process/serverless instance.
let databaseReady: Promise<void> | undefined;

export function ensureDatabaseReady(): Promise<void> {
  if (!databaseReady) {
    databaseReady = initDatabase().catch((err) => {
      // Allow a later request to retry after a transient database failure.
      databaseReady = undefined;
      throw err;
    });
  }
  return databaseReady;
}

// Local development uses a persistent listener. Vercel imports the Express app
// as a serverless handler and must not start its own listening socket.
if (process.env.VERCEL !== '1') {
  ensureDatabaseReady()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 [PhonePe-Recharge Backend] Running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[DB] Failed to initialize PostgreSQL database:', err);
      process.exit(1);
    });
}

export default app;
