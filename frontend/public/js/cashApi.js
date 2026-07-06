const API_BASE_URL = '/api/v1/cash';

const request = async (path = '', options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    const error = new Error(payload?.error || 'Não foi possível concluir a operação');
    error.status = response.status;
    throw error;
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
};

const getCurrentSession = async () => request('/session');
const openSession = async (payload) => request('/session/open', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const closeSession = async (payload) => request('/session/close', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const updateMonitorState = async (payload) => request('/monitor-state', {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const getProductByBarcode = async (barcode) => (
  request(`/products/barcode/${encodeURIComponent(barcode)}`)
);
const searchProducts = async (search) => (
  request(`/products?${new URLSearchParams({ search }).toString()}`)
);
const searchClients = async (search) => (
  request(`/clients?${new URLSearchParams({ search }).toString()}`)
);
const createSale = async (payload) => request('/sales', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const listRecentSales = async () => request('/sales');
const cancelSale = async (id, motivo) => request(`/sales/${id}/cancel`, {
  method: 'POST',
  body: JSON.stringify({ motivo })
});

export default {
  cancelSale,
  closeSession,
  createSale,
  getCurrentSession,
  getProductByBarcode,
  listRecentSales,
  openSession,
  searchClients,
  searchProducts,
  updateMonitorState
};
