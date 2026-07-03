import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import statusRoutes from './routes/statusRoutes.js';
import authRoutes from './routes/authRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import clientsRoutes from './routes/clientsRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import cookieMiddleware from './middlewares/cookieMiddleware.js';
import notFoundMiddleware from './middlewares/notFoundMiddleware.js';
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend/public');
const loggedApiMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const shouldSkipRequestLog = (req, res) => {
  const requestPath = req.path || '';
  const isStaticRequest = requestPath.startsWith('/css/')
    || requestPath.startsWith('/js/')
    || requestPath.startsWith('/assets/')
    || requestPath === '/favicon.ico';

  if (isStaticRequest || res.statusCode === 304) return true;
  if (res.statusCode >= 400) return false;

  const isLoggedApiMutation = requestPath.startsWith('/api/')
    && loggedApiMethods.has(req.method);
  return !isLoggedApiMutation;
};

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieMiddleware);
app.use(
  cors({
    origin: env.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);
app.use(morgan('dev', { skip: shouldSkipRequestLog }));

app.use('/css', express.static(path.join(frontendPath, 'css'), { index: false }));
app.use('/js', express.static(path.join(frontendPath, 'js'), { index: false }));
app.use('/', pageRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/clients', clientsRoutes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
export { shouldSkipRequestLog };
