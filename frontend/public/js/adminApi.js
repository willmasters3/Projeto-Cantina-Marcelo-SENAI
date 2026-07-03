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
    const message = data?.error || data?.message || 'Não foi possível concluir a operação';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data || data;
};

const listCategories = async () => request('/categories');
const createCategory = async (payload) => request('/categories', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const listProducts = async (search) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  return request(`/products?${params.toString()}`);
};

const createProduct = async (payload) => request('/products', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const getProductByBarcode = async (barcode) => (
  request(`/products/barcode/${encodeURIComponent(barcode)}`)
);

const updateProduct = async (id, payload) => request(`/products/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});

export default {
  listCategories,
  createCategory,
  listProducts,
  createProduct,
  getProductByBarcode,
  updateProduct
};
