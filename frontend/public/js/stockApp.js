import stockApi from './stockApi.js';
import {
  bindCurrencyInput,
  formatBRLCurrency,
  formattedCurrencyToDecimal
} from './currencyInput.js';
import { formatQuantity } from './quantityFormat.js';

const stockMessage = document.getElementById('stockMessage');
const summaryProducts = document.getElementById('summaryProducts');
const summaryInStock = document.getElementById('summaryInStock');
const summaryLowStock = document.getElementById('summaryLowStock');
const summaryStockValue = document.getElementById('summaryStockValue');
const stockFilters = document.getElementById('stockFilters');
const stockSearch = document.getElementById('stockSearch');
const stockCategoryFilter = document.getElementById('stockCategoryFilter');
const stockSupplierFilter = document.getElementById('stockSupplierFilter');
const stockStatusFilter = document.getElementById('stockStatusFilter');
const stockProductsTable = document.getElementById('stockProductsTable');
const stockMovementsList = document.getElementById('stockMovementsList');
const lowStockList = document.getElementById('lowStockList');
const suppliersList = document.getElementById('suppliersList');
const openEntryButton = document.getElementById('openEntryButton');
const openSupplierButton = document.getElementById('openSupplierButton');

const entryDialog = document.getElementById('entryDialog');
const entryForm = document.getElementById('entryForm');
const entryProduct = document.getElementById('entryProduct');
const entryQuantity = document.getElementById('entryQuantity');
const entrySupplier = document.getElementById('entrySupplier');
const entryCost = document.getElementById('entryCost');
const entryReason = document.getElementById('entryReason');
const entrySubmitButton = document.getElementById('entrySubmitButton');

const adjustmentDialog = document.getElementById('adjustmentDialog');
const adjustmentForm = document.getElementById('adjustmentForm');
const adjustmentTitle = document.getElementById('adjustmentTitle');
const adjustmentCurrentStock = document.getElementById('adjustmentCurrentStock');
const adjustmentProductId = document.getElementById('adjustmentProductId');
const adjustmentFinalStock = document.getElementById('adjustmentFinalStock');
const adjustmentType = document.getElementById('adjustmentType');
const adjustmentReason = document.getElementById('adjustmentReason');
const adjustmentSubmitButton = document.getElementById('adjustmentSubmitButton');

const supplierDialog = document.getElementById('supplierDialog');
const supplierForm = document.getElementById('supplierForm');
const supplierDialogTitle = document.getElementById('supplierDialogTitle');
const supplierId = document.getElementById('supplierId');
const supplierName = document.getElementById('supplierName');
const supplierTradingName = document.getElementById('supplierTradingName');
const supplierDocument = document.getElementById('supplierDocument');
const supplierPhone = document.getElementById('supplierPhone');
const supplierEmail = document.getElementById('supplierEmail');
const supplierNotes = document.getElementById('supplierNotes');
const supplierSubmitButton = document.getElementById('supplierSubmitButton');

const productPlaceholderUrl = '/assets/product-placeholder.svg';
const statusLabels = new Map([
  ['OK', { label: 'OK', className: 'ok' }],
  ['BAIXO', { label: 'Baixo', className: 'low' }],
  ['SEM_ESTOQUE', { label: 'Sem estoque', className: 'out' }]
]);
const originLabels = new Map([
  ['VENDA', 'Venda'],
  ['CANCELAMENTO_VENDA', 'Cancelamento'],
  ['AJUSTE', 'Ajuste'],
  ['ENTRADA_INICIAL', 'Entrada inicial'],
  ['ENTRADA_ESTOQUE', 'Entrada']
]);

let categories = [];
let activeSuppliers = [];
let selectableProducts = [];
let searchTimer = null;

bindCurrencyInput(entryCost);

const showMessage = (message, isError = false) => {
  stockMessage.textContent = message;
  stockMessage.className = message
    ? `message ${isError ? 'error' : 'success'}`
    : 'message';
};

const createEmptyMessage = (message) => {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
};

const createCell = (value, className = '') => {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value || '—';
  return cell;
};

const useProductPlaceholder = (event) => {
  const image = event.currentTarget;
  if (!image.src.endsWith(productPlaceholderUrl)) image.src = productPlaceholderUrl;
};

const clearCurrencyInput = (input) => {
  input.value = '';
  input.dataset.currencyDigits = '';
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const getProductStatus = (product) => (
  statusLabels.get(product.status_estoque) || statusLabels.get('OK')
);

const getFilters = () => ({
  search: stockSearch.value.trim(),
  category_id: stockCategoryFilter.value,
  supplier_id: stockSupplierFilter.value,
  status: stockStatusFilter.value,
  limit: 200
});

const populateCategories = () => {
  const currentValue = stockCategoryFilter.value;
  stockCategoryFilter.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Todas as categorias';
  stockCategoryFilter.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.ativo ? category.nome : `${category.nome} (inativa)`;
    stockCategoryFilter.appendChild(option);
  });

  stockCategoryFilter.value = currentValue;
};

const populateSupplierSelects = () => {
  const currentFilterValue = stockSupplierFilter.value;
  const currentEntryValue = entrySupplier.value;

  stockSupplierFilter.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Todos os fornecedores';
  stockSupplierFilter.appendChild(allOption);

  entrySupplier.replaceChildren();
  const emptyEntryOption = document.createElement('option');
  emptyEntryOption.value = '';
  emptyEntryOption.textContent = 'Sem fornecedor';
  entrySupplier.appendChild(emptyEntryOption);

  activeSuppliers.forEach((supplier) => {
    const filterOption = document.createElement('option');
    filterOption.value = supplier.id;
    filterOption.textContent = supplier.nome;
    stockSupplierFilter.appendChild(filterOption);

    const entryOption = document.createElement('option');
    entryOption.value = supplier.id;
    entryOption.textContent = supplier.nome;
    entrySupplier.appendChild(entryOption);
  });

  stockSupplierFilter.value = currentFilterValue;
  entrySupplier.value = currentEntryValue;
};

const populateProductSelect = () => {
  const currentValue = entryProduct.value;
  entryProduct.replaceChildren();

  if (!selectableProducts.length) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Nenhum produto ativo disponível';
    entryProduct.appendChild(emptyOption);
    return;
  }

  selectableProducts.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.nome} · estoque ${formatQuantity(product.estoque_atual)}`;
    entryProduct.appendChild(option);
  });

  entryProduct.value = currentValue || String(selectableProducts[0].id);
};

const renderSummary = (summary) => {
  summaryProducts.textContent = Number(summary.produtos_cadastrados || 0);
  summaryInStock.textContent = Number(summary.em_estoque || 0);
  summaryLowStock.textContent = Number(summary.baixo_estoque || 0);
  summaryStockValue.textContent = formatBRLCurrency(summary.valor_estimado || 0);
};

const renderProducts = (products) => {
  stockProductsTable.replaceChildren();
  if (!products.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 11;
    cell.textContent = 'Nenhum produto encontrado.';
    row.appendChild(cell);
    stockProductsTable.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('tr');

    const imageCell = document.createElement('td');
    const image = document.createElement('img');
    image.className = 'stock-product-image';
    image.src = product.imagem_url || productPlaceholderUrl;
    image.alt = `Imagem de ${product.nome}`;
    image.loading = 'lazy';
    image.addEventListener('error', useProductPlaceholder);
    imageCell.appendChild(image);

    const productCell = document.createElement('td');
    const productDetails = document.createElement('div');
    productDetails.className = 'stock-product-cell';
    const productText = document.createElement('div');
    const productName = document.createElement('strong');
    productName.textContent = product.nome;
    const productCode = document.createElement('small');
    productCode.textContent = `Código interno: ${product.id}`;
    productText.append(productName, productCode);
    productDetails.appendChild(productText);
    productCell.appendChild(productDetails);

    const status = getProductStatus(product);
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = `stock-status ${status.className}`;
    statusBadge.textContent = status.label;
    statusCell.appendChild(statusBadge);

    const actionCell = document.createElement('td');
    const adjustButton = document.createElement('button');
    adjustButton.type = 'button';
    adjustButton.className = 'secondary-action compact-button stock-action-button';
    adjustButton.textContent = 'Ajustar';
    adjustButton.addEventListener('click', () => openAdjustmentDialog(product));
    actionCell.appendChild(adjustButton);

    row.append(
      imageCell,
      productCell,
      createCell(product.codigo_barras || 'Não informado'),
      createCell(product.categoria || 'Sem categoria'),
      createCell(product.fornecedor || 'Sem fornecedor'),
      createCell(formatQuantity(product.estoque_atual), 'numeric-cell'),
      createCell(formatQuantity(product.estoque_minimo), 'numeric-cell'),
      createCell(formatBRLCurrency(product.custo || 0), 'numeric-cell'),
      createCell(formatBRLCurrency(product.preco_venda || 0), 'numeric-cell'),
      statusCell,
      actionCell
    );
    stockProductsTable.appendChild(row);
  });
};

const renderMovements = (movements) => {
  stockMovementsList.replaceChildren();
  if (!movements.length) {
    stockMovementsList.appendChild(createEmptyMessage('Nenhuma movimentação registrada.'));
    return;
  }

  movements.forEach((movement) => {
    const item = document.createElement('article');
    item.className = 'movement-item';

    const heading = document.createElement('div');
    heading.className = 'movement-heading';
    const product = document.createElement('div');
    product.className = 'movement-product';
    const productName = document.createElement('strong');
    productName.textContent = movement.produto || 'Produto não encontrado';
    const meta = document.createElement('small');
    meta.textContent = `${originLabels.get(movement.origem) || movement.origem} · ${formatDateTime(movement.criado_em)}`;
    product.append(productName, meta);

    const quantity = document.createElement('span');
    const isEntry = movement.natureza === 'ENTRADA';
    quantity.className = `movement-quantity ${isEntry ? 'entry' : 'exit'}`;
    quantity.textContent = `${isEntry ? '+' : '-'} ${formatQuantity(movement.quantidade)}`;
    heading.append(product, quantity);

    const transition = document.createElement('div');
    transition.className = 'movement-meta';
    transition.textContent = `Estoque: ${formatQuantity(movement.estoque_antes)} → ${formatQuantity(movement.estoque_depois)}`;

    const details = document.createElement('div');
    details.className = 'movement-meta';
    details.textContent = [
      movement.fornecedor ? `Fornecedor: ${movement.fornecedor}` : null,
      movement.usuario ? `Usuário: ${movement.usuario}` : null
    ].filter(Boolean).join(' · ') || 'Sem fornecedor vinculado';

    item.append(heading, transition, details);
    if (movement.motivo) {
      const reason = document.createElement('div');
      reason.className = 'movement-reason';
      reason.textContent = movement.motivo;
      item.appendChild(reason);
    }
    stockMovementsList.appendChild(item);
  });
};

const renderLowStock = (products) => {
  lowStockList.replaceChildren();
  if (!products.length) {
    lowStockList.appendChild(createEmptyMessage('Nenhum produto com estoque baixo.'));
    return;
  }

  products.forEach((product) => {
    const item = document.createElement('article');
    item.className = 'mini-product-item';
    const visualGroup = document.createElement('div');
    visualGroup.className = 'stock-product-cell';

    const image = document.createElement('img');
    image.className = 'mini-product-image';
    image.src = product.imagem_url || productPlaceholderUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', useProductPlaceholder);

    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = product.nome;
    const minStock = document.createElement('small');
    minStock.textContent = `Mínimo: ${formatQuantity(product.estoque_minimo)}`;
    details.append(name, minStock);
    visualGroup.append(image, details);

    const currentStock = document.createElement('strong');
    currentStock.className = 'numeric-cell';
    currentStock.textContent = formatQuantity(product.estoque_atual);
    item.append(visualGroup, currentStock);
    lowStockList.appendChild(item);
  });
};

const openSupplierDialog = (supplier = null) => {
  supplierForm.reset();
  supplierId.value = supplier?.id || '';
  supplierDialogTitle.textContent = supplier ? `Editar fornecedor: ${supplier.nome}` : 'Novo fornecedor';
  supplierName.value = supplier?.nome || '';
  supplierTradingName.value = supplier?.nome_fantasia || '';
  supplierDocument.value = supplier?.documento || '';
  supplierPhone.value = supplier?.telefone || '';
  supplierEmail.value = supplier?.email || '';
  supplierNotes.value = supplier?.observacoes || '';
  supplierDialog.showModal();
  supplierName.focus();
};

const inactivateSupplier = async (supplier) => {
  if (!window.confirm(`Deseja inativar o fornecedor ${supplier.nome}?`)) return;
  try {
    await stockApi.updateSupplierStatus(supplier.id, false);
    await refreshStockData();
    showMessage('Fornecedor inativado com sucesso.');
  } catch (error) {
    showMessage(error.message, true);
  }
};

const renderSuppliers = (suppliers) => {
  suppliersList.replaceChildren();
  if (!suppliers.length) {
    suppliersList.appendChild(createEmptyMessage('Nenhum fornecedor ativo cadastrado.'));
    return;
  }

  suppliers.forEach((supplier) => {
    const item = document.createElement('article');
    item.className = 'supplier-item';

    const heading = document.createElement('div');
    heading.className = 'supplier-heading';
    const title = document.createElement('div');
    title.className = 'supplier-title';
    const name = document.createElement('strong');
    name.textContent = supplier.nome;
    const meta = document.createElement('small');
    meta.textContent = `${Number(supplier.produtos_vinculados || 0)} produtos · ${formatBRLCurrency(supplier.valor_estimado || 0)}`;
    title.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'supplier-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-action compact-button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => openSupplierDialog(supplier));
    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = 'danger-action compact-button';
    statusButton.textContent = 'Inativar';
    statusButton.addEventListener('click', () => inactivateSupplier(supplier));
    actions.append(editButton, statusButton);

    heading.append(title, actions);
    item.appendChild(heading);
    if (supplier.nome_fantasia || supplier.telefone || supplier.email) {
      const details = document.createElement('div');
      details.className = 'supplier-meta';
      details.textContent = [
        supplier.nome_fantasia,
        supplier.telefone,
        supplier.email
      ].filter(Boolean).join(' · ');
      item.appendChild(details);
    }
    suppliersList.appendChild(item);
  });
};

async function refreshStockData() {
  try {
    const [
      summary,
      products,
      movements,
      lowStockProducts,
      suppliers,
      allProducts
    ] = await Promise.all([
      stockApi.getSummary(),
      stockApi.listStockProducts(getFilters()),
      stockApi.listMovements(20),
      stockApi.listLowStock(8),
      stockApi.listSuppliers({ activeOnly: true }),
      stockApi.listStockProducts({ status: 'all', limit: 500 })
    ]);

    activeSuppliers = suppliers;
    selectableProducts = allProducts;
    renderSummary(summary);
    renderProducts(products);
    renderMovements(movements);
    renderLowStock(lowStockProducts);
    renderSuppliers(suppliers);
    populateSupplierSelects();
    populateProductSelect();
  } catch (error) {
    showMessage(error.message, true);
  }
}

const loadFilters = async () => {
  categories = await stockApi.listCategories();
  populateCategories();
};

const openEntryDialog = () => {
  if (!selectableProducts.length) {
    showMessage('Não há produto ativo disponível para entrada de estoque.', true);
    return;
  }

  entryForm.reset();
  clearCurrencyInput(entryCost);
  populateProductSelect();
  populateSupplierSelects();
  entryDialog.showModal();
  entryProduct.focus();
};

function openAdjustmentDialog(product) {
  adjustmentForm.reset();
  adjustmentProductId.value = product.id;
  adjustmentTitle.textContent = `Ajustar estoque: ${product.nome}`;
  adjustmentCurrentStock.textContent = `Estoque atual: ${formatQuantity(product.estoque_atual)}`;
  adjustmentFinalStock.value = product.estoque_atual;
  adjustmentDialog.showModal();
  adjustmentFinalStock.focus();
  adjustmentFinalStock.select();
}

entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  entrySubmitButton.disabled = true;
  try {
    await stockApi.createEntry({
      produto_id: entryProduct.value,
      quantidade: entryQuantity.value,
      supplier_id: entrySupplier.value || null,
      custo_unitario: formattedCurrencyToDecimal(entryCost.value),
      motivo: entryReason.value.trim() || null
    });
    entryDialog.close();
    await refreshStockData();
    showMessage('Entrada de estoque registrada com sucesso.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    entrySubmitButton.disabled = false;
  }
});

adjustmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adjustmentSubmitButton.disabled = true;
  try {
    const result = await stockApi.createAdjustment({
      produto_id: adjustmentProductId.value,
      estoque_final: adjustmentFinalStock.value,
      tipo_ajuste: adjustmentType.value,
      motivo: adjustmentReason.value.trim()
    });
    adjustmentDialog.close();
    await refreshStockData();
    showMessage(result.alterado === false
      ? result.mensagem || 'Não houve alteração no estoque.'
      : 'Ajuste de estoque registrado com sucesso.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    adjustmentSubmitButton.disabled = false;
  }
});

supplierForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  supplierSubmitButton.disabled = true;
  const payload = {
    nome: supplierName.value.trim(),
    nome_fantasia: supplierTradingName.value.trim() || null,
    documento: supplierDocument.value.trim() || null,
    telefone: supplierPhone.value.trim() || null,
    email: supplierEmail.value.trim() || null,
    observacoes: supplierNotes.value.trim() || null,
    ativo: true
  };

  try {
    if (supplierId.value) {
      await stockApi.updateSupplier(supplierId.value, payload);
      showMessage('Fornecedor atualizado com sucesso.');
    } else {
      await stockApi.createSupplier(payload);
      showMessage('Fornecedor cadastrado com sucesso.');
    }
    supplierDialog.close();
    await refreshStockData();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    supplierSubmitButton.disabled = false;
  }
});

stockFilters.addEventListener('submit', async (event) => {
  event.preventDefault();
  await refreshStockData();
});

stockSearch.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(refreshStockData, 250);
});

[stockCategoryFilter, stockSupplierFilter, stockStatusFilter].forEach((select) => {
  select.addEventListener('change', refreshStockData);
});

stockFilters.addEventListener('reset', () => {
  window.setTimeout(refreshStockData, 0);
});

openEntryButton.addEventListener('click', openEntryDialog);
openSupplierButton.addEventListener('click', () => openSupplierDialog());

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.closeDialog)?.close();
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadFilters();
    await refreshStockData();
  } catch (error) {
    showMessage(error.message, true);
  }
});
