import app, { ensureDatabaseReady } from '../server/index';

// Vercel invokes this function for /api/* requests.
// Keep database initialization shared across warm invocations.
export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseReady();
    return app(req, res);
  } catch (error) {
    console.error('[Vercel API] Request initialization failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'API initialization failed' });
    }
  }
}
