import api from './api.js';

const testButton = document.getElementById('testButton');
const statusCard = document.getElementById('statusCard');
const appStatus = document.getElementById('appStatus');
const dbStatus = document.getElementById('dbStatus');
const timestamp = document.getElementById('timestamp');

const showStatus = (data) => {
  appStatus.textContent = `Servidor: ${data.status === 'ok' ? 'online' : 'offline'}`;
  dbStatus.textContent = `Banco MySQL: ${data.database}`;
  timestamp.textContent = `Atualizado em: ${new Date(data.timestamp).toLocaleString('pt-BR')}`;
  statusCard.classList.remove('hidden');
};

const handleError = (error) => {
  appStatus.textContent = 'Servidor: indisponível';
  dbStatus.textContent = 'Banco MySQL: indisponível';
  timestamp.textContent = error.message;
  statusCard.classList.remove('hidden');
};

const init = () => {
  testButton.addEventListener('click', async () => {
    try {
      const result = await api.getStatus();
      showStatus(result);
    } catch (error) {
      handleError(error);
    }
  });
};

init();
