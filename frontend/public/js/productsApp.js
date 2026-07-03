import adminApi from './adminApi.js';
import {
  bindCurrencyInput,
  formatBRLCurrency,
  formattedCurrencyToDecimal,
  setCurrencyInputDecimalValue
} from './currencyInput.js';

const productForm = document.getElementById('productForm');
const productMessage = document.getElementById('productMessage');
const productSearchForm = document.getElementById('productSearchForm');
const productSearchInput = document.getElementById('productSearch');
const productList = document.getElementById('productList');
const categorySelect = document.getElementById('productCategory');
const barcodeInput = document.getElementById('productBarcode');
const productNameInput = document.getElementById('productName');
const productDescriptionInput = document.getElementById('productDescription');
const productPriceInput = document.getElementById('productPrice');
const productCostInput = document.getElementById('productCost');
const productStockInput = document.getElementById('productStock');
const productMinStockInput = document.getElementById('productMinStock');
const barcodeFeedback = document.getElementById('barcodeFeedback');
const barcodeFeedbackMessage = document.getElementById('barcodeFeedbackMessage');
const openExistingProductButton = document.getElementById('openExistingProductButton');
const productSubmitButton = document.getElementById('productSubmitButton');
const cancelProductEditButton = document.getElementById('cancelProductEditButton');
const productFormTitle = document.getElementById('productFormTitle');

let duplicateProduct = null;
let editingProductId = null;
let editingProductActive = true;

bindCurrencyInput(productPriceInput);
bindCurrencyInput(productCostInput);

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
      ['Preço', formatBRLCurrency(product.preco_venda)],
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

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-action product-edit-button';
    editButton.textContent = 'Editar produto';
    editButton.addEventListener('click', () => openProductEditor(product));
    item.appendChild(editButton);
    productList.appendChild(item);
  });
};

const hideBarcodeFeedback = () => {
  barcodeFeedback.hidden = true;
  barcodeFeedback.className = 'barcode-feedback';
  barcodeFeedbackMessage.textContent = '';
  openExistingProductButton.hidden = true;
};

const showBarcodeFeedback = (message, type, product = null) => {
  barcodeFeedback.hidden = false;
  barcodeFeedback.className = `barcode-feedback ${type}`;
  barcodeFeedbackMessage.textContent = message;
  duplicateProduct = product;
  openExistingProductButton.hidden = !product;
};

const resetProductForm = () => {
  productForm.reset();
  setCurrencyInputDecimalValue(productPriceInput, null);
  setCurrencyInputDecimalValue(productCostInput, null);
  duplicateProduct = null;
  editingProductId = null;
  editingProductActive = true;
  productFormTitle.textContent = 'Cadastrar produto';
  productSubmitButton.textContent = 'Cadastrar produto';
  cancelProductEditButton.hidden = true;
  hideBarcodeFeedback();
  barcodeInput.focus();
};

const openProductEditor = (product) => {
  editingProductId = product.id;
  editingProductActive = Boolean(product.ativo);
  duplicateProduct = null;
  barcodeInput.value = product.codigo_barras || '';
  productNameInput.value = product.nome || '';
  categorySelect.value = product.categoria_id ? String(product.categoria_id) : '';
  productDescriptionInput.value = product.descricao || '';
  setCurrencyInputDecimalValue(productPriceInput, product.preco_venda);
  setCurrencyInputDecimalValue(productCostInput, product.custo);
  productStockInput.value = product.estoque_atual ?? '';
  productMinStockInput.value = product.estoque_minimo ?? 0;
  productFormTitle.textContent = `Editar produto: ${product.nome}`;
  productSubmitButton.textContent = 'Salvar alterações';
  cancelProductEditButton.hidden = false;
  hideBarcodeFeedback();
  showMessage(productMessage, `Editando o produto ${product.nome}.`);
  productNameInput.focus();
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const loadCategories = async () => {
  try {
    const categories = await adminApi.listCategories();
    categorySelect.replaceChildren();
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Sem categoria';
    categorySelect.appendChild(emptyOption);
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.ativo ? category.nome : `${category.nome} (inativa)`;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    showMessage(productMessage, 'Erro ao carregar categorias: ' + error.message, true);
  }
};

const checkBarcode = async ({ focusName = true } = {}) => {
  const barcode = barcodeInput.value.trim();

  if (!barcode) {
    duplicateProduct = null;
    hideBarcodeFeedback();
    if (focusName) productNameInput.focus();
    return 'empty';
  }

  showBarcodeFeedback('Consultando código de barras...', 'checking');

  try {
    const product = await adminApi.getProductByBarcode(barcode);
    if (editingProductId === product.id) {
      duplicateProduct = null;
      showBarcodeFeedback('Este é o código do produto que está sendo editado.', 'available');
      if (focusName) productNameInput.focus();
      return 'available';
    }

    showBarcodeFeedback(
      `Este código de barras já está cadastrado para o produto ${product.nome}.`,
      'duplicate',
      product
    );
    return 'duplicate';
  } catch (error) {
    if (error.status === 404) {
      duplicateProduct = null;
      showBarcodeFeedback('Código disponível para um novo produto.', 'available');
      if (focusName) productNameInput.focus();
      return 'available';
    }

    duplicateProduct = null;
    showBarcodeFeedback(`Não foi possível consultar o código: ${error.message}`, 'error');
    return 'error';
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
  productSubmitButton.disabled = true;
  try {
    const barcodeStatus = await checkBarcode({ focusName: false });
    if (barcodeStatus === 'duplicate') {
      showMessage(
        productMessage,
        'Cadastro bloqueado: abra o produto existente ou informe outro código de barras.',
        true
      );
      return;
    }
    if (barcodeStatus === 'error') return;

    const priceDecimal = formattedCurrencyToDecimal(productPriceInput.value);
    const costDecimal = formattedCurrencyToDecimal(productCostInput.value);
    if (priceDecimal === null) {
      showMessage(productMessage, 'Preço de venda é obrigatório.', true);
      productPriceInput.focus();
      return;
    }

    const productData = {
      categoria_id: categorySelect.value ? Number(categorySelect.value) : null,
      codigo_barras: barcodeInput.value.trim() || null,
      nome: productNameInput.value.trim(),
      descricao: productDescriptionInput.value.trim() || null,
      preco_venda: Number(priceDecimal),
      custo: costDecimal === null ? null : Number(costDecimal),
      estoque_atual: Number(productStockInput.value),
      estoque_minimo: Number(productMinStockInput.value),
      ativo: editingProductId ? editingProductActive : true
    };

    if (editingProductId) {
      await adminApi.updateProduct(editingProductId, productData);
      resetProductForm();
      showMessage(productMessage, 'Produto atualizado com sucesso.');
    } else {
      await adminApi.createProduct(productData);
      resetProductForm();
      showMessage(productMessage, 'Produto cadastrado com sucesso.');
    }
    await loadProducts();
  } catch (error) {
    showMessage(productMessage, error.message, true);
    if (error.status === 409 && barcodeInput.value.trim()) {
      await checkBarcode({ focusName: false });
    }
  } finally {
    productSubmitButton.disabled = false;
  }
});

barcodeInput.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();
  await checkBarcode();
});

barcodeInput.addEventListener('input', () => {
  duplicateProduct = null;
  hideBarcodeFeedback();
});

openExistingProductButton.addEventListener('click', () => {
  if (duplicateProduct) openProductEditor(duplicateProduct);
});

cancelProductEditButton.addEventListener('click', () => {
  resetProductForm();
  showMessage(productMessage, 'Edição cancelada.');
});

productSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadProducts(productSearchInput.value);
});

window.addEventListener('DOMContentLoaded', async () => {
  barcodeInput.focus();
  await loadCategories();
  await loadProducts();
  barcodeInput.focus();
});
