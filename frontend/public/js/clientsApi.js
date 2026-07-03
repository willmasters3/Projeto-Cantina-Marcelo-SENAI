const API_BASE_URL = '/api/v1/clients';

const request = async (path = '', options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    const error = new Error(data?.error || 'Não foi possível concluir a operação');
    error.status = response.status;
    throw error;
  }

  return data?.data ?? data;
};

const listClients = async (search = '') => {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();
  return request(query ? `?${query}` : '');
};

const createClient = async (payload) => request('', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const updateClient = async (id, payload) => request(`/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});

const updateClientStatus = async (id, ativo) => request(`/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ ativo })
});

export default { listClients, createClient, updateClient, updateClientStatus };
