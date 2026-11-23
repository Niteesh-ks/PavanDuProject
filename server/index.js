import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentsRouter from './routes/payments.js';
import ticketsRouter from './routes/tickets.js';
import scraperRouter from './routes/scraper.js';
import emailRouter from './routes/email.js';
import eventsRouter from './routes/events.js';
import adminEventsRouter from './routes/adminEvents.js';
import { createPublicSupabaseClient } from './services/supabaseClients.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
  app.locals.publicSupabase = createPublicSupabaseClient();
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/email', emailRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminEventsRouter);

// System Health & Diagnostics
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Meet Hub Core Backend',
    timestamp: new Date().toISOString(),
    services: {
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
      emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      supabase: Boolean(process.env.SUPABASE_URL),
    },
  });
});

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Express server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  MEET HUB BACKEND SERVER ONLINE       `);
    console.log(`  Port: http://localhost:${PORT}        `);
    console.log(`  Healthcheck: http://localhost:${PORT}/api/health `);
    console.log(`========================================`);
  });
}

export default app;
