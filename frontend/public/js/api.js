const API_BASE_URL = 'http://localhost:3000/api/v1';

const getStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao acessar a API');
  }

  const data = await response.json();
  return data;
};

export default { getStatus };
