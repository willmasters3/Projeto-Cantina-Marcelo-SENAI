import { testConnection } from '../config/database.js';

const checkDatabaseConnection = async () => {
  try {
    await testConnection();
    return true;
  } catch (error) {
    return false;
  }
};

export default { checkDatabaseConnection };
