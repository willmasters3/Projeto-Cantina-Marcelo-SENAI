import app from './app.js';
import env from './config/env.js';
import { testConnection } from './config/database.js';

const startServer = async () => {
  try {
    await testConnection();
    app.listen(env.apiPort, () => {
      console.log(`Server running on http://localhost:${env.apiPort}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
