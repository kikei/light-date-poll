import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const JSON_LIMIT = '10mb';
export const PORT = process.env.PORT || 3000;
