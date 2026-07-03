const API_BASE_URL = '/api/v1';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || data?.message || 'Erro na requisição';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
};

const login = async (payload) => request('/auth/login', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const logout = async () => request('/auth/logout', {
  method: 'POST'
});

const me = async () => request('/auth/me');

export default { login, logout, me };
