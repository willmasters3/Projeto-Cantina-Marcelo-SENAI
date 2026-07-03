import statusRepository from '../repositories/statusRepository.js';

const getSystemStatus = async () => {
  const databaseHealthy = await statusRepository.checkDatabaseConnection();
  return {
    app: 'Projeto Cantina',
    status: 'ok',
    database: databaseHealthy ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString()
  };
};

export default { getSystemStatus };
