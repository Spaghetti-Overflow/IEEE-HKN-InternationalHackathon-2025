import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initializeDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import budgetRoutes from './routes/budgets.js';
import transactionRoutes from './routes/transactions.js';
import deadlineRoutes from './routes/deadlines.js';
import eventRoutes from './routes/events.js';
import exportRoutes from './routes/exports.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const originPatternRegexes = config.clientOriginPatterns.map((pattern) => {
  const escaped = pattern.split('*').map(escapeRegex).join('.*');
  return new RegExp(`^${escaped}$`, 'i');
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.clientOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (originPatternRegexes.some((regex) => regex.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
};

app.use(helmet());
app.use(globalLimiter);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(config.uploadDir));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected error' });
});

initializeDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
