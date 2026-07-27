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
    if (response.status === 401) window.location.href = '/login';
    const error = new Error(data?.error || 'Não foi possível concluir a operação');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data?.data ?? data;
};

const toQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const getSummary = async () => request('/stock/summary');
const listStockProducts = async (filters = {}) => request(
  `/stock/products${toQueryString(filters)}`
);
const listMovements = async (params = {}) => {
  const queryParams = typeof params === 'number' ? { limit: params } : params;
  return request(`/stock/movements${toQueryString(queryParams)}`);
};
const listLowStock = async (limit = 8) => request(
  `/stock/low-stock${toQueryString({ limit })}`
);
const createEntry = async (payload) => request('/stock/entries', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const createAdjustment = async (payload) => request('/stock/adjustments', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const listCategories = async () => request('/categories');
const listSuppliers = async ({ activeOnly = false, search = '' } = {}) => request(
  `/suppliers${toQueryString({
    active_only: activeOnly ? '1' : '',
    search
  })}`
);
const createSupplier = async (payload) => request('/suppliers', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const updateSupplier = async (id, payload) => request(`/suppliers/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const updateSupplierStatus = async (id, ativo) => request(`/suppliers/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ ativo })
});

export default {
  createAdjustment,
  createEntry,
  createSupplier,
  getSummary,
  listCategories,
  listLowStock,
  listMovements,
  listStockProducts,
  listSuppliers,
  updateSupplier,
  updateSupplierStatus
};
