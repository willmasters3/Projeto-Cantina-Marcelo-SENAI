import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import statusRoutes from './routes/statusRoutes.js';
import notFoundMiddleware from './middlewares/notFoundMiddleware.js';
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: env.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);
app.use(morgan('dev'));

app.use('/api/v1', statusRoutes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
