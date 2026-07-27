const API_BASE_URL = '/api/v1/fiado';

const request = async (path = '', options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    const error = new Error(payload?.error || 'Não foi possível concluir a operação');
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload?.data ?? payload;
};

const toQuery = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const getSummary = async () => request('/summary');
const listCustomers = async (search = '') => request(`/customers${toQuery({ search })}`);
const getCustomer = async (id) => request(`/customers/${id}`);
const getCustomerCycles = async (id) => request(`/customers/${id}/cycles`);
const getCustomerStatement = async (id) => request(`/customers/${id}/statement`);
const registerPayment = async (payload) => request('/payments', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export default {
  getCustomer,
  getCustomerCycles,
  getCustomerStatement,
  getSummary,
  listCustomers,
  registerPayment
};
