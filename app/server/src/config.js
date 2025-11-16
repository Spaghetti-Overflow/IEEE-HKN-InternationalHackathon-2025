import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  databasePath: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/budget.db'),
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../data/uploads')
};
