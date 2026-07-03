const API_BASE_URL = '/api/v1';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    const message = data?.error || data?.message || 'Não foi possível concluir a operação';
    throw new Error(message);
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

export default {
  listCategories,
  createCategory,
  listProducts,
  createProduct
};
