import adminApi from './adminApi.js';
import {
  bindCurrencyInput,
  formatBRLCurrency,
  formattedCurrencyToDecimal,
  setCurrencyInputDecimalValue
} from './currencyInput.js';
import { formatQuantity } from './quantityFormat.js';

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
const productImageInput = document.getElementById('productImageInput');
const productImagePreview = document.getElementById('productImagePreview');
const chooseProductImageButton = document.getElementById('chooseProductImageButton');
const removeProductImageButton = document.getElementById('removeProductImageButton');
const productImageFeedback = document.getElementById('productImageFeedback');
const barcodeFeedback = document.getElementById('barcodeFeedback');
const barcodeFeedbackMessage = document.getElementById('barcodeFeedbackMessage');
const openExistingProductButton = document.getElementById('openExistingProductButton');
const productSubmitButton = document.getElementById('productSubmitButton');
const cancelProductEditButton = document.getElementById('cancelProductEditButton');
const productFormTitle = document.getElementById('productFormTitle');
const barcodeNumbersOnlyMessage = 'Código de barras deve conter somente números.';
const productPlaceholderUrl = '/assets/product-placeholder.svg';
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const imageExtensionsByType = new Map([
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])]
]);
const maxImageSizeBytes = 5 * 1024 * 1024;

let duplicateProduct = null;
let editingProductId = null;
let editingProductActive = true;
let currentProductImageUrl = null;
let selectedProductImage = null;
let selectedPreviewDataUrl = null;
let previewReadSequence = 0;

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

    const image = document.createElement('img');
    image.className = 'product-card-image';
    image.src = product.imagem_url || productPlaceholderUrl;
    image.alt = `Imagem de ${product.nome}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      if (!image.src.endsWith(productPlaceholderUrl)) image.src = productPlaceholderUrl;
    });
    item.appendChild(image);

    const content = document.createElement('div');
    content.className = 'product-card-content';

    const title = document.createElement('h3');
    title.textContent = product.nome;
    content.appendChild(title);

    const details = [
      ['Código de barras', product.codigo_barras || 'Não informado'],
      ['Categoria', product.categoria || 'Sem categoria'],
      ['Preço', formatBRLCurrency(product.preco_venda)],
      ['Estoque', formatQuantity(product.estoque_atual)],
      ['Status', product.ativo ? 'Ativo' : 'Inativo']
    ];

    details.forEach(([label, value]) => {
      const line = document.createElement('p');
      const labelElement = document.createElement('strong');
      labelElement.textContent = `${label}: `;
      line.append(labelElement, document.createTextNode(value));
      content.appendChild(line);
    });

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-action product-edit-button';
    editButton.textContent = 'Editar produto';
    editButton.addEventListener('click', () => openProductEditor(product));
    content.appendChild(editButton);
    item.appendChild(content);
    productList.appendChild(item);
  });
};

const showImageFeedback = (message = '', isError = false) => {
  productImageFeedback.textContent = message;
  productImageFeedback.className = message
    ? `image-feedback ${isError ? 'error' : 'success'}`
    : 'image-feedback';
};

const setProductImagePreview = (url = null) => {
  productImagePreview.src = url || productPlaceholderUrl;
};

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
      reject(new Error('O arquivo selecionado não gerou uma imagem válida.'));
      return;
    }
    resolve(reader.result);
  }, { once: true });
  reader.addEventListener('error', () => {
    reject(new Error('Não foi possível ler a imagem selecionada.'));
  }, { once: true });
  reader.readAsDataURL(file);
});

const validateSelectedImage = (file) => {
  if (!allowedImageTypes.has(file.type)) {
    return 'Selecione uma imagem JPEG, PNG ou WebP.';
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (!allowedImageExtensions.has(extension) || !imageExtensionsByType.get(file.type)?.has(extension)) {
    return 'A extensão do arquivo não corresponde ao formato da imagem.';
  }
  if (file.size <= 0 || file.size > maxImageSizeBytes) {
    return 'A imagem deve ter no máximo 5 MB.';
  }
  return null;
};

const clearSelectedImage = () => {
  previewReadSequence += 1;
  selectedPreviewDataUrl = null;
  selectedProductImage = null;
  productImageInput.value = '';
};

const resetProductImageEditor = () => {
  clearSelectedImage();
  currentProductImageUrl = null;
  setProductImagePreview();
  chooseProductImageButton.textContent = 'Selecionar imagem';
  removeProductImageButton.hidden = true;
  showImageFeedback();
};

const loadProductImageEditor = (product) => {
  clearSelectedImage();
  currentProductImageUrl = product.imagem_url || null;
  setProductImagePreview(currentProductImageUrl);
  chooseProductImageButton.textContent = currentProductImageUrl
    ? 'Trocar imagem'
    : 'Selecionar imagem';
  removeProductImageButton.hidden = !currentProductImageUrl;
  showImageFeedback();
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

const isBarcodeValid = (barcode) => barcode === '' || /^[0-9]+$/.test(barcode);

const validateBarcodeInput = ({ focusInvalid = false } = {}) => {
  if (isBarcodeValid(barcodeInput.value)) {
    barcodeInput.setCustomValidity('');
    return true;
  }

  duplicateProduct = null;
  barcodeInput.setCustomValidity(barcodeNumbersOnlyMessage);
  showBarcodeFeedback(barcodeNumbersOnlyMessage, 'error');
  if (focusInvalid) barcodeInput.focus();
  return false;
};

const resetProductForm = () => {
  productForm.reset();
  barcodeInput.setCustomValidity('');
  setCurrencyInputDecimalValue(productPriceInput, null);
  setCurrencyInputDecimalValue(productCostInput, null);
  duplicateProduct = null;
  editingProductId = null;
  editingProductActive = true;
  productFormTitle.textContent = 'Cadastrar produto';
  productSubmitButton.textContent = 'Cadastrar produto';
  cancelProductEditButton.hidden = true;
  resetProductImageEditor();
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
  loadProductImageEditor(product);
  productFormTitle.textContent = `Editar produto: ${product.nome}`;
  productSubmitButton.textContent = 'Salvar alterações';
  cancelProductEditButton.hidden = false;
  hideBarcodeFeedback();
  showMessage(productMessage, `Editando o produto ${product.nome}.`);
  if (validateBarcodeInput()) {
    productNameInput.focus();
  } else {
    barcodeInput.focus();
  }
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
  if (!validateBarcodeInput({ focusInvalid: true })) return 'invalid';

  const barcode = barcodeInput.value;

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
    if (barcodeStatus === 'invalid') {
      showMessage(productMessage, barcodeNumbersOnlyMessage, true);
      return;
    }
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
      codigo_barras: barcodeInput.value || null,
      nome: productNameInput.value.trim(),
      descricao: productDescriptionInput.value.trim() || null,
      preco_venda: Number(priceDecimal),
      custo: costDecimal === null ? null : Number(costDecimal),
      estoque_atual: Number(productStockInput.value),
      estoque_minimo: Number(productMinStockInput.value),
      ativo: editingProductId ? editingProductActive : true
    };

    const isEditing = Boolean(editingProductId);
    const imageToUpload = selectedProductImage;
    const savedProduct = isEditing
      ? await adminApi.updateProduct(editingProductId, productData)
      : await adminApi.createProduct(productData);

    let imageUploadError = null;
    if (imageToUpload) {
      try {
        await adminApi.uploadProductImage(savedProduct.id, imageToUpload);
      } catch (error) {
        imageUploadError = error;
      }
    }

    resetProductForm();
    await loadProducts();
    if (imageUploadError) {
      showMessage(
        productMessage,
        `Produto ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso, mas a imagem falhou: ${imageUploadError.message}`,
        true
      );
    } else {
      showMessage(
        productMessage,
        `Produto ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso.`
      );
    }
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
  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    await checkBarcode();
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1 && !/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    barcodeInput.setCustomValidity(
      isBarcodeValid(barcodeInput.value) ? '' : barcodeNumbersOnlyMessage
    );
    showBarcodeFeedback(barcodeNumbersOnlyMessage, 'error');
  }
});

barcodeInput.addEventListener('paste', (event) => {
  const pastedValue = event.clipboardData?.getData('text') ?? '';
  if (/^[0-9]+$/.test(pastedValue)) return;

  event.preventDefault();
  barcodeInput.setCustomValidity(
    isBarcodeValid(barcodeInput.value) ? '' : barcodeNumbersOnlyMessage
  );
  showBarcodeFeedback(barcodeNumbersOnlyMessage, 'error');
});

barcodeInput.addEventListener('input', () => {
  duplicateProduct = null;
  if (validateBarcodeInput()) hideBarcodeFeedback();
});

chooseProductImageButton.addEventListener('click', () => {
  productImageInput.click();
});

productImageInput.addEventListener('change', async () => {
  const file = productImageInput.files?.[0];
  if (!file) return;

  const validationError = validateSelectedImage(file);
  if (validationError) {
    clearSelectedImage();
    setProductImagePreview(currentProductImageUrl);
    showImageFeedback(validationError, true);
    return;
  }

  const readSequence = ++previewReadSequence;
  selectedProductImage = file;
  chooseProductImageButton.textContent = currentProductImageUrl
    ? 'Trocar imagem selecionada'
    : 'Alterar imagem selecionada';
  showImageFeedback('Carregando prévia...');

  try {
    const dataUrl = await readImageAsDataUrl(file);
    if (readSequence !== previewReadSequence || selectedProductImage !== file) return;
    selectedPreviewDataUrl = dataUrl;
    setProductImagePreview(dataUrl);
    showImageFeedback('Prévia carregada. A imagem será enviada ao salvar o produto.');
  } catch (error) {
    if (readSequence !== previewReadSequence || selectedProductImage !== file) return;
    clearSelectedImage();
    setProductImagePreview(currentProductImageUrl);
    showImageFeedback(error.message || 'Não foi possível visualizar esta imagem.', true);
  }
});

productImagePreview.addEventListener('error', () => {
  const failedSelectedPreview = Boolean(selectedPreviewDataUrl);
  if (failedSelectedPreview) {
    clearSelectedImage();
    showImageFeedback('Não foi possível visualizar esta imagem.', true);
    setProductImagePreview(currentProductImageUrl);
    return;
  }
  if (!productImagePreview.src.endsWith(productPlaceholderUrl)) {
    setProductImagePreview();
  }
});

removeProductImageButton.addEventListener('click', async () => {
  if (!editingProductId || !currentProductImageUrl) return;
  removeProductImageButton.disabled = true;
  try {
    await adminApi.removeProductImage(editingProductId);
    clearSelectedImage();
    currentProductImageUrl = null;
    setProductImagePreview();
    chooseProductImageButton.textContent = 'Selecionar imagem';
    removeProductImageButton.hidden = true;
    showImageFeedback('Imagem removida com sucesso.');
    showMessage(productMessage, 'Imagem do produto removida com sucesso.');
    await loadProducts(productSearchInput.value);
  } catch (error) {
    showImageFeedback(error.message, true);
  } finally {
    removeProductImageButton.disabled = false;
  }
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
