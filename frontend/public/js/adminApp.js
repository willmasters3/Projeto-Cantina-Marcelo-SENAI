import adminApi from './adminApi.js';

const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryMessage = document.getElementById('categoryMessage');
const productForm = document.getElementById('productForm');
const productMessage = document.getElementById('productMessage');
const productSearchForm = document.getElementById('productSearchForm');
const productSearchInput = document.getElementById('productSearch');
const productList = document.getElementById('productList');
const categorySelect = document.getElementById('productCategory');

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.className = isError ? 'message error' : 'message success';
};

const loadCategories = async () => {
  try {
    const categories = await adminApi.listCategories();
    categorySelect.innerHTML = '<option value="">Selecione</option>';
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.nome;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    showMessage(categoryMessage, error.message, true);
  }
};

const renderProducts = (products) => {
  productList.innerHTML = '';
  if (!products.length) {
    productList.innerHTML = '<p>Nenhum produto encontrado.</p>';
    return;
  }

  products.forEach((product) => {
    const item = document.createElement('div');
    item.className = 'product-card';
    item.innerHTML = `
      <h3>${product.nome}</h3>
      <p><strong>Código de barras:</strong> ${product.codigo_barras || 'Não informado'}</p>
      <p><strong>Categoria:</strong> ${product.categoria || 'Sem categoria'}</p>
      <p><strong>Preço:</strong> R$ ${Number(product.preco_venda).toFixed(2)}</p>
      <p><strong>Estoque:</strong> ${Number(product.estoque_atual).toFixed(2)}</p>
      <p><strong>Status:</strong> ${product.ativo ? 'Ativo' : 'Inativo'}</p>
    `;
    productList.appendChild(item);
  });
};

const loadProducts = async (search = '') => {
  try {
    const products = await adminApi.listProducts(search);
    renderProducts(products);
  } catch (error) {
    showMessage(productMessage, error.message, true);
  }
};

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const nome = categoryNameInput.value;
    await adminApi.createCategory({ nome });
    showMessage(categoryMessage, 'Categoria cadastrada com sucesso');
    categoryNameInput.value = '';
    await loadCategories();
  } catch (error) {
    showMessage(categoryMessage, error.message, true);
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const productData = {
      categoria_id: categorySelect.value ? Number(categorySelect.value) : null,
      codigo_barras: document.getElementById('productBarcode').value || null,
      nome: document.getElementById('productName').value,
      descricao: document.getElementById('productDescription').value || null,
      preco_venda: Number(document.getElementById('productPrice').value),
      custo: document.getElementById('productCost').value ? Number(document.getElementById('productCost').value) : null,
      estoque_atual: Number(document.getElementById('productStock').value),
      estoque_minimo: Number(document.getElementById('productMinStock').value),
      ativo: true
    };

    await adminApi.createProduct(productData);
    showMessage(productMessage, 'Produto cadastrado com sucesso');
    productForm.reset();
    await loadProducts();
  } catch (error) {
    showMessage(productMessage, error.message, true);
  }
});

productSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadProducts(productSearchInput.value);
});

window.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadProducts();
});
