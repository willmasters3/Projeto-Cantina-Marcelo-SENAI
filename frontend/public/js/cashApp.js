import authApi from './authApi.js';
import cashApi from './cashApi.js';
import { bindCurrencyInput, formattedCurrencyToDecimal } from './currencyInput.js';
import { decimalToUnits, factor, formatBRL, multiplyMoney, unitsToDecimal } from './fixedMoney.js';

const cashMessage = document.getElementById('cashMessage');
const cashSessionBadge = document.getElementById('cashSessionBadge');
const openCashForm = document.getElementById('openCashForm');
const openingAmount = document.getElementById('openingAmount');
const openingNotes = document.getElementById('openingNotes');
const openCashButton = document.getElementById('openCashButton');
const openCashSummary = document.getElementById('openCashSummary');
const sessionTerminal = document.getElementById('sessionTerminal');
const sessionOpenedBy = document.getElementById('sessionOpenedBy');
const sessionOpeningAmount = document.getElementById('sessionOpeningAmount');
const sessionExpectedAmount = document.getElementById('sessionExpectedAmount');
const showCloseCashButton = document.getElementById('showCloseCashButton');
const closeCashForm = document.getElementById('closeCashForm');
const closingAmount = document.getElementById('closingAmount');
const closingDifferenceReason = document.getElementById('closingDifferenceReason');
const closingNotes = document.getElementById('closingNotes');
const closeCashButton = document.getElementById('closeCashButton');
const cancelCloseCashButton = document.getElementById('cancelCloseCashButton');
const saleWorkspace = document.getElementById('saleWorkspace');
const barcodeSaleForm = document.getElementById('barcodeSaleForm');
const saleBarcode = document.getElementById('saleBarcode');
const productSaleSearchForm = document.getElementById('productSaleSearchForm');
const productSaleSearch = document.getElementById('productSaleSearch');
const productSaleResults = document.getElementById('productSaleResults');
const miscellaneousForm = document.getElementById('miscellaneousForm');
const miscellaneousDescription = document.getElementById('miscellaneousDescription');
const miscellaneousPrice = document.getElementById('miscellaneousPrice');
const cartItems = document.getElementById('cartItems');
const cartItemCount = document.getElementById('cartItemCount');
const cartTotal = document.getElementById('cartTotal');
const clearCartButton = document.getElementById('clearCartButton');
const checkoutForm = document.getElementById('checkoutForm');
const saleType = document.getElementById('saleType');
const paymentFields = document.getElementById('paymentFields');
const paymentMethod = document.getElementById('paymentMethod');
const paymentNsu = document.getElementById('paymentNsu');
const paymentAuthorization = document.getElementById('paymentAuthorization');
const paymentReference = document.getElementById('paymentReference');
const creditClientFields = document.getElementById('creditClientFields');
const creditClientSearch = document.getElementById('creditClientSearch');
const searchCreditClientButton = document.getElementById('searchCreditClientButton');
const creditClientResults = document.getElementById('creditClientResults');
const selectedCreditClient = document.getElementById('selectedCreditClient');
const saleNotes = document.getElementById('saleNotes');
const finishSaleButton = document.getElementById('finishSaleButton');
const recentSales = document.getElementById('recentSales');
const refreshSalesButton = document.getElementById('refreshSalesButton');
const cancelSalePanel = document.getElementById('cancelSalePanel');
const cancelSaleNumber = document.getElementById('cancelSaleNumber');
const cancelSaleForm = document.getElementById('cancelSaleForm');
const cancelSaleReason = document.getElementById('cancelSaleReason');
const dismissCancelSaleButton = document.getElementById('dismissCancelSaleButton');

let currentSession = null;
let currentUser = null;
let selectedClient = null;
let selectedSaleForCancellation = null;
let miscellaneousSequence = 0;
let cart = [];

bindCurrencyInput(openingAmount);
bindCurrencyInput(closingAmount);
bindCurrencyInput(miscellaneousPrice);

const showMessage = (message, isError = false) => {
  cashMessage.textContent = message;
  cashMessage.className = message
    ? `message ${isError ? 'error' : 'success'}`
    : 'message';
};

const createCell = (value) => {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
};

const getCartTotal = () => cart.reduce(
  (total, item) => total + multiplyMoney(item.unitPrice, item.quantity),
  0n
);

const hasAvailableStock = (item, quantity) => (
  item.type === 'DIVERSOS'
  || decimalToUnits(item.stock) >= BigInt(quantity) * factor
);

const updateItemQuantity = (itemId, quantity) => {
  const item = cart.find((cartItem) => cartItem.id === itemId);
  if (!item) return;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    showMessage('A quantidade deve ser um número inteiro maior que zero.', true);
    renderCart();
    return;
  }
  if (!hasAvailableStock(item, quantity)) {
    showMessage(`Estoque insuficiente para ${item.name}.`, true);
    renderCart();
    return;
  }
  item.quantity = quantity;
  renderCart();
};

const removeCartItem = (itemId) => {
  cart = cart.filter((item) => item.id !== itemId);
  renderCart();
};

const renderCart = () => {
  cartItems.replaceChildren();
  if (!cart.length) {
    const row = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.className = 'empty-cart-cell';
    emptyCell.textContent = 'Carrinho vazio. Bipe um produto para começar.';
    row.appendChild(emptyCell);
    cartItems.appendChild(row);
  }

  cart.forEach((item) => {
    const row = document.createElement('tr');
    const itemCell = document.createElement('td');
    const itemName = document.createElement('strong');
    itemName.textContent = item.name;
    const itemPrice = document.createElement('span');
    itemPrice.textContent = formatBRL(item.unitPrice);
    itemCell.append(itemName, itemPrice);

    const quantityCell = document.createElement('td');
    const quantityControl = document.createElement('div');
    quantityControl.className = 'quantity-control';
    const decreaseButton = document.createElement('button');
    decreaseButton.type = 'button';
    decreaseButton.className = 'secondary-action compact-button';
    decreaseButton.textContent = '−';
    decreaseButton.setAttribute('aria-label', `Diminuir quantidade de ${item.name}`);
    decreaseButton.addEventListener('click', () => updateItemQuantity(item.id, item.quantity - 1));
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.step = '1';
    quantityInput.value = String(item.quantity);
    quantityInput.setAttribute('aria-label', `Quantidade de ${item.name}`);
    quantityInput.addEventListener('change', () => (
      updateItemQuantity(item.id, Number(quantityInput.value))
    ));
    const increaseButton = document.createElement('button');
    increaseButton.type = 'button';
    increaseButton.className = 'secondary-action compact-button';
    increaseButton.textContent = '+';
    increaseButton.setAttribute('aria-label', `Aumentar quantidade de ${item.name}`);
    increaseButton.addEventListener('click', () => updateItemQuantity(item.id, item.quantity + 1));
    quantityControl.append(decreaseButton, quantityInput, increaseButton);
    quantityCell.appendChild(quantityControl);

    const subtotal = multiplyMoney(item.unitPrice, item.quantity);
    const subtotalCell = createCell(formatBRL(subtotal));
    const actionCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'danger-action compact-button';
    removeButton.textContent = 'Remover';
    removeButton.addEventListener('click', () => removeCartItem(item.id));
    actionCell.appendChild(removeButton);

    row.append(itemCell, quantityCell, subtotalCell, actionCell);
    cartItems.appendChild(row);
  });

  const itemQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  cartItemCount.textContent = itemQuantity
    ? `${itemQuantity} ${itemQuantity === 1 ? 'unidade' : 'unidades'} no carrinho.`
    : 'Nenhum item.';
  cartTotal.textContent = formatBRL(getCartTotal());
  clearCartButton.disabled = !cart.length;
  finishSaleButton.disabled = !cart.length;
};

const addProductToCart = (product) => {
  const id = `product-${product.id}`;
  const existing = cart.find((item) => item.id === id);
  const nextQuantity = existing ? existing.quantity + 1 : 1;
  const stockItem = {
    type: 'PRODUTO',
    stock: product.estoque_atual,
    name: product.nome
  };
  if (!hasAvailableStock(stockItem, nextQuantity)) {
    showMessage(`Estoque insuficiente para ${product.nome}.`, true);
    return;
  }

  if (existing) {
    existing.quantity = nextQuantity;
    existing.stock = product.estoque_atual;
  } else {
    cart.push({
      id,
      type: 'PRODUTO',
      productId: String(product.id),
      name: product.nome,
      barcode: product.codigo_barras,
      unitPrice: product.preco_venda,
      stock: product.estoque_atual,
      quantity: 1
    });
  }
  renderCart();
  showMessage(`${product.nome} adicionado ao carrinho.`);
  saleBarcode.focus();
};

const renderProductResults = (products) => {
  productSaleResults.replaceChildren();
  if (!products.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum produto ativo encontrado.';
    productSaleResults.appendChild(empty);
    return;
  }
  products.forEach((product) => {
    const row = document.createElement('div');
    row.className = 'cash-result-row';
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = product.nome;
    const meta = document.createElement('span');
    meta.textContent = `${formatBRL(product.preco_venda)} · Estoque ${product.estoque_atual}`;
    details.append(name, meta);
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'compact-button';
    addButton.textContent = 'Adicionar';
    addButton.addEventListener('click', () => addProductToCart(product));
    row.append(details, addButton);
    productSaleResults.appendChild(row);
  });
};

const selectClient = (client) => {
  selectedClient = client;
  selectedCreditClient.textContent = `Selecionado: ${client.nome} · ${client.codigo}`;
  selectedCreditClient.className = 'selected-client selected';
  creditClientResults.replaceChildren();
};

const renderClientResults = (clients) => {
  creditClientResults.replaceChildren();
  if (!clients.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum cliente ativo encontrado.';
    creditClientResults.appendChild(empty);
    return;
  }
  clients.forEach((client) => {
    const row = document.createElement('div');
    row.className = 'cash-result-row';
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = client.nome;
    const meta = document.createElement('span');
    meta.textContent = [client.codigo, client.matricula, client.telefone].filter(Boolean).join(' · ');
    details.append(name, meta);
    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'compact-button';
    selectButton.textContent = 'Selecionar';
    selectButton.addEventListener('click', () => selectClient(client));
    row.append(details, selectButton);
    creditClientResults.appendChild(row);
  });
};

const resetCheckout = () => {
  saleType.value = 'A_VISTA';
  paymentMethod.value = 'DINHEIRO';
  paymentNsu.value = '';
  paymentAuthorization.value = '';
  paymentReference.value = '';
  saleNotes.value = '';
  selectedClient = null;
  selectedCreditClient.textContent = 'Nenhum cliente selecionado.';
  selectedCreditClient.className = 'selected-client';
  creditClientSearch.value = '';
  creditClientResults.replaceChildren();
  paymentFields.hidden = false;
  creditClientFields.hidden = true;
};

const renderSession = () => {
  const isOpen = Boolean(currentSession);
  openCashForm.hidden = isOpen;
  openCashSummary.hidden = !isOpen;
  saleWorkspace.hidden = !isOpen;
  closeCashForm.hidden = true;

  if (!isOpen) {
    cashSessionBadge.textContent = 'Caixa fechado';
    cashSessionBadge.className = 'cash-session-badge closed';
    return;
  }

  cashSessionBadge.textContent = 'Caixa aberto';
  cashSessionBadge.className = 'cash-session-badge open';
  sessionTerminal.textContent = currentSession.terminal_codigo;
  sessionOpenedBy.textContent = currentSession.usuario_abertura_nome;
  sessionOpeningAmount.textContent = formatBRL(currentSession.valor_abertura);
  sessionExpectedAmount.textContent = formatBRL(currentSession.valor_esperado_atual);
  saleBarcode.focus();
};

const loadSession = async () => {
  currentSession = await cashApi.getCurrentSession();
  renderSession();
};

const formatSaleType = (value) => value === 'FIADO' ? 'Fiado' : 'À vista';
const formatPaymentMethods = (value) => value
  ? value.split(', ').map((method) => method.charAt(0) + method.slice(1).toLowerCase()).join(', ')
  : 'Fiado';

const openCancellation = (sale) => {
  selectedSaleForCancellation = sale;
  cancelSaleNumber.textContent = `#${sale.id}`;
  cancelSaleReason.value = '';
  cancelSalePanel.hidden = false;
  cancelSaleReason.focus();
  cancelSalePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const renderRecentSales = (sales) => {
  recentSales.replaceChildren();
  if (!sales.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhuma venda registrada.';
    recentSales.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Venda', 'Data', 'Tipo', 'Cliente', 'Pagamento', 'Total', 'Status', 'Ação'].forEach((title) => {
    const header = document.createElement('th');
    header.scope = 'col';
    header.textContent = title;
    headRow.appendChild(header);
  });
  head.appendChild(headRow);

  const body = document.createElement('tbody');
  sales.forEach((sale) => {
    const row = document.createElement('tr');
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = sale.status === 'CONFIRMADA'
      ? 'status-badge active'
      : 'status-badge inactive';
    badge.textContent = sale.status === 'CONFIRMADA' ? 'Confirmada' : 'Cancelada';
    statusCell.appendChild(badge);

    const actionCell = document.createElement('td');
    if (currentUser?.role?.slug === 'ADMINISTRADOR' && sale.status === 'CONFIRMADA') {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'danger-action compact-button';
      cancelButton.textContent = 'Cancelar';
      cancelButton.addEventListener('click', () => openCancellation(sale));
      actionCell.appendChild(cancelButton);
    } else {
      actionCell.textContent = '—';
    }

    row.append(
      createCell(`#${sale.id}`),
      createCell(new Date(sale.confirmada_em).toLocaleString('pt-BR')),
      createCell(formatSaleType(sale.tipo_venda)),
      createCell(sale.cliente_nome || '—'),
      createCell(formatPaymentMethods(sale.formas_pagamento)),
      createCell(formatBRL(sale.total)),
      statusCell,
      actionCell
    );
    body.appendChild(row);
  });
  table.append(head, body);
  recentSales.appendChild(table);
};

const loadRecentSales = async () => {
  try {
    renderRecentSales(await cashApi.listRecentSales());
  } catch (error) {
    recentSales.replaceChildren();
    showMessage(`Não foi possível carregar as vendas: ${error.message}`, true);
  }
};

openCashForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  openCashButton.disabled = true;
  try {
    const value = formattedCurrencyToDecimal(openingAmount.value);
    currentSession = await cashApi.openSession({
      valor_abertura: value || '0.00',
      observacoes: openingNotes.value.trim() || null
    });
    openingAmount.value = '';
    openingAmount.dataset.currencyDigits = '';
    openingNotes.value = '';
    await loadSession();
    showMessage('Caixa aberto com sucesso.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    openCashButton.disabled = false;
  }
});

showCloseCashButton.addEventListener('click', () => {
  if (cart.length) {
    showMessage('Finalize ou limpe o carrinho antes de fechar o caixa.', true);
    return;
  }
  closeCashForm.hidden = false;
  closingAmount.focus();
});

cancelCloseCashButton.addEventListener('click', () => {
  closeCashForm.hidden = true;
});

closeCashForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  closeCashButton.disabled = true;
  try {
    const value = formattedCurrencyToDecimal(closingAmount.value);
    if (value === null) throw new Error('Informe o valor contado no fechamento.');
    const closedSession = await cashApi.closeSession({
      valor_fechamento_informado: value,
      justificativa_diferenca: closingDifferenceReason.value.trim() || null,
      observacoes: closingNotes.value.trim() || null
    });
    currentSession = null;
    renderSession();
    showMessage(
      `Caixa fechado. Diferença: ${formatBRL(closedSession.diferenca_fechamento || '0')}.`
    );
    closeCashForm.reset();
    closingAmount.dataset.currencyDigits = '';
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    closeCashButton.disabled = false;
  }
});

barcodeSaleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const barcode = saleBarcode.value.trim();
  if (!barcode) return;
  try {
    const product = await cashApi.getProductByBarcode(barcode);
    addProductToCart(product);
    saleBarcode.value = '';
  } catch (error) {
    showMessage(error.message, true);
  }
});

saleBarcode.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') event.stopPropagation();
});

productSaleSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    renderProductResults(await cashApi.searchProducts(productSaleSearch.value.trim()));
  } catch (error) {
    showMessage(error.message, true);
  }
});

miscellaneousForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const price = formattedCurrencyToDecimal(miscellaneousPrice.value);
  if (price === null || decimalToUnits(price) <= 0n) {
    showMessage('Informe um valor maior que zero para o item Diversos.', true);
    return;
  }
  miscellaneousSequence += 1;
  const description = miscellaneousDescription.value.trim();
  cart.push({
    id: `misc-${miscellaneousSequence}`,
    type: 'DIVERSOS',
    name: description || 'Diversos / Outros',
    description,
    unitPrice: unitsToDecimal(decimalToUnits(price)),
    quantity: 1
  });
  miscellaneousForm.reset();
  miscellaneousPrice.dataset.currencyDigits = '';
  renderCart();
  showMessage('Item Diversos adicionado ao carrinho.');
  saleBarcode.focus();
});

clearCartButton.addEventListener('click', () => {
  cart = [];
  renderCart();
  showMessage('Carrinho limpo.');
  saleBarcode.focus();
});

saleType.addEventListener('change', () => {
  const isCreditSale = saleType.value === 'FIADO';
  paymentFields.hidden = isCreditSale;
  creditClientFields.hidden = !isCreditSale;
  if (isCreditSale) creditClientSearch.focus();
});

searchCreditClientButton.addEventListener('click', async () => {
  try {
    renderClientResults(await cashApi.searchClients(creditClientSearch.value.trim()));
  } catch (error) {
    showMessage(error.message, true);
  }
});

creditClientSearch.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  searchCreditClientButton.click();
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!cart.length) {
    showMessage('Adicione pelo menos um item ao carrinho.', true);
    return;
  }
  if (saleType.value === 'FIADO' && !selectedClient) {
    showMessage('Selecione o cliente da venda fiado.', true);
    creditClientSearch.focus();
    return;
  }
  if (
    saleType.value === 'FIADO'
    && cart.some((item) => item.type === 'DIVERSOS' && !item.description)
  ) {
    showMessage('Informe a descrição de todos os itens Diversos da venda fiado.', true);
    return;
  }

  finishSaleButton.disabled = true;
  const payload = {
    tipo_venda: saleType.value,
    cliente_id: saleType.value === 'FIADO' ? selectedClient.id : null,
    observacoes: saleNotes.value.trim() || null,
    itens: cart.map((item) => item.type === 'PRODUTO' ? {
      tipo_item: 'PRODUTO',
      produto_id: item.productId,
      quantidade: String(item.quantity)
    } : {
      tipo_item: 'DIVERSOS',
      descricao: item.description || null,
      preco_unitario: item.unitPrice,
      quantidade: String(item.quantity)
    }),
    pagamento: saleType.value === 'A_VISTA' ? {
      forma_pagamento: paymentMethod.value,
      nsu: paymentNsu.value.trim() || null,
      codigo_autorizacao: paymentAuthorization.value.trim() || null,
      referencia_transacao: paymentReference.value.trim() || null
    } : null
  };

  try {
    const sale = await cashApi.createSale(payload);
    cart = [];
    renderCart();
    resetCheckout();
    productSaleResults.replaceChildren();
    await Promise.all([loadSession(), loadRecentSales()]);
    showMessage(`Venda #${sale.id} confirmada com sucesso.`);
    saleBarcode.focus();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    finishSaleButton.disabled = !cart.length;
  }
});

refreshSalesButton.addEventListener('click', loadRecentSales);

cancelSaleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedSaleForCancellation) return;
  const submitButton = cancelSaleForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await cashApi.cancelSale(selectedSaleForCancellation.id, cancelSaleReason.value.trim());
    cancelSalePanel.hidden = true;
    selectedSaleForCancellation = null;
    await Promise.all([loadSession(), loadRecentSales()]);
    showMessage('Venda cancelada e movimentos revertidos com sucesso.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

dismissCancelSaleButton.addEventListener('click', () => {
  cancelSalePanel.hidden = true;
  selectedSaleForCancellation = null;
});

window.addEventListener('DOMContentLoaded', async () => {
  renderCart();
  try {
    const [{ user }] = await Promise.all([authApi.me(), loadSession(), loadRecentSales()]);
    currentUser = user;
    await loadRecentSales();
    if (currentSession) saleBarcode.focus();
  } catch (error) {
    showMessage(`Não foi possível iniciar o Caixa: ${error.message}`, true);
  }
});
