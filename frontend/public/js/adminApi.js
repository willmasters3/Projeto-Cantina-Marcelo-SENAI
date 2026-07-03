const API_BASE_URL = 'http://localhost:3000/api/v1';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error || data.message || 'Erro desconhecido';
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
