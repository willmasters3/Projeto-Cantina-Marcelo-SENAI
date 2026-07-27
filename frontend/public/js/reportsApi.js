const API_BASE_URL = '/api/v1/reports';

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
    const error = new Error(payload?.error || 'Não foi possível carregar o relatório.');
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload?.data ?? payload;
};

const toQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const getOptions = async () => request('/options');
const getSummary = async (filters) => request(`/summary${toQuery(filters)}`);
const getSales = async (filters) => request(`/sales${toQuery(filters)}`);
const getCash = async (filters) => request(`/cash${toQuery(filters)}`);
const getFiado = async (filters) => request(`/fiado${toQuery(filters)}`);
const getPayments = async (filters) => request(`/payments${toQuery(filters)}`);
const getProducts = async (filters) => request(`/products${toQuery(filters)}`);
const getStock = async (filters) => request(`/stock${toQuery(filters)}`);

export default {
  getCash,
  getFiado,
  getOptions,
  getPayments,
  getProducts,
  getSales,
  getStock,
  getSummary
};
