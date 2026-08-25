import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = [
  'NODE_ENV',
  'API_PORT',
  'CORS_ORIGIN',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

const missingVars = requiredVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  throw new Error(`Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
}

const env = {
  nodeEnv: process.env.NODE_ENV,
  apiPort: Number(process.env.API_PORT),
  corsOrigin: process.env.CORS_ORIGIN,
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  license: {
    licensedTo: process.env.SOFTWARE_LICENSED_TO || '',
    installationId: process.env.SOFTWARE_INSTALLATION_ID || '',
    deliveryDate: process.env.SOFTWARE_DELIVERY_DATE || '',
    technicalValidUntil: process.env.SOFTWARE_TECHNICAL_VALID_UNTIL || ''
  }
};

export default env;
