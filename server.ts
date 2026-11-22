import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.ts';
import { attachAuth } from './server/auth.ts';
import { UPLOAD_DIR } from './server/uploads.ts';
import { authRouter } from './server/routes/auth.ts';
import { propertiesRouter } from './server/routes/properties.ts';
import { socialRouter } from './server/routes/social.ts';
import { messagingRouter } from './server/routes/messaging.ts';
import { adminRouter } from './server/routes/admin.ts';

dotenv.config();

async function startServer() {
  initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(attachAuth);

  // Serve validated user-uploaded media safely (without executing scripts)
  app.use('/uploads', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }, express.static(UPLOAD_DIR));

  // Health & integration status endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    });
  });

  // Domain API routers
  app.use('/api/auth', authRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/social', socialRouter);
  app.use('/api/messaging', messagingRouter);
  app.use('/api/admin', adminRouter);

  // Unknown /api route handler
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UniNest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start UniNest server:', err);
  process.exit(1);
});
