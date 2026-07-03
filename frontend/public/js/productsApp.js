import adminApi from './adminApi.js';

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

const renderProducts = (products) => {
  productList.replaceChildren();
  if (!products.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Nenhum produto encontrado.';
    productList.appendChild(emptyMessage);
    return;
  }

  products.forEach((product) => {
    const item = document.createElement('div');
    item.className = 'product-card';

    const title = document.createElement('h3');
    title.textContent = product.nome;
    item.appendChild(title);

    const details = [
      ['Código de barras', product.codigo_barras || 'Não informado'],
      ['Categoria', product.categoria || 'Sem categoria'],
      ['Preço', `R$ ${Number(product.preco_venda).toFixed(2)}`],
      ['Estoque', Number(product.estoque_atual).toFixed(2)],
      ['Status', product.ativo ? 'Ativo' : 'Inativo']
    ];

    details.forEach(([label, value]) => {
      const line = document.createElement('p');
      const labelElement = document.createElement('strong');
      labelElement.textContent = `${label}: `;
      line.append(labelElement, document.createTextNode(value));
      item.appendChild(line);
    });
    productList.appendChild(item);
  });
};

const loadCategories = async () => {
  try {
    const categories = await adminApi.listCategories();
    categorySelect.innerHTML = '<option value="">Sem categoria</option>';
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.nome;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    showMessage(productMessage, 'Erro ao carregar categorias: ' + error.message, true);
  }
};

const loadProducts = async (search = '') => {
  try {
    const products = await adminApi.listProducts(search);
    renderProducts(products);
  } catch (error) {
    showMessage(productMessage, error.message, true);
  }
};

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
