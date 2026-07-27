import authApi from './authApi.js';
import reportsApi from './reportsApi.js';
import { formatBRLCurrency } from './currencyInput.js';
import { formatQuantity } from './quantityFormat.js';

const reportsMessage = document.getElementById('reportsMessage');
const reportsFilters = document.getElementById('reportsFilters');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const paymentMethod = document.getElementById('paymentMethod');
const clientFilter = document.getElementById('clientFilter');
const productFilter = document.getElementById('productFilter');
const statusFilter = document.getElementById('statusFilter');
const periodBadge = document.getElementById('periodBadge');
const generateReportButton = document.getElementById('generateReportButton');
const printReportButton = document.getElementById('printReportButton');
const exportPdfButton = document.getElementById('exportPdfButton');
const exportExcelButton = document.getElementById('exportExcelButton');

const cardSalesTotal = document.getElementById('cardSalesTotal');
const cardSalesCount = document.getElementById('cardSalesCount');
const cardReceivedTotal = document.getElementById('cardReceivedTotal');
const cardFiadoOpen = document.getElementById('cardFiadoOpen');
const cardFiadoClients = document.getElementById('cardFiadoClients');
const cardEstimatedProfit = document.getElementById('cardEstimatedProfit');

const paymentChart = document.getElementById('paymentChart');
const paymentLegend = document.getElementById('paymentLegend');
const salesTrend = document.getElementById('salesTrend');
const topProductsList = document.getElementById('topProductsList');
const summaryDebtorsList = document.getElementById('summaryDebtorsList');
const summaryFiadoReceipts = document.getElementById('summaryFiadoReceipts');
const cashSummaryBox = document.getElementById('cashSummaryBox');

const salesTableBody = document.getElementById('salesTableBody');
const salesPaginationInfo = document.getElementById('salesPaginationInfo');
const salesPaginationButtons = document.getElementById('salesPaginationButtons');
const cashReportSummary = document.getElementById('cashReportSummary');
const cashSessionsTable = document.getElementById('cashSessionsTable');
const fiadoOpenTotal = document.getElementById('fiadoOpenTotal');
const fiadoPendingClients = document.getElementById('fiadoPendingClients');
const fiadoReceivedPeriod = document.getElementById('fiadoReceivedPeriod');
const fiadoDebtorsTable = document.getElementById('fiadoDebtorsTable');
const fiadoReceiptsTable = document.getElementById('fiadoReceiptsTable');
const paymentsTable = document.getElementById('paymentsTable');
const productsReportTable = document.getElementById('productsReportTable');
const productsPaginationInfo = document.getElementById('productsPaginationInfo');
const productsPaginationButtons = document.getElementById('productsPaginationButtons');
const stockValueReport = document.getElementById('stockValueReport');
const stockLowCount = document.getElementById('stockLowCount');
const stockOutCount = document.getElementById('stockOutCount');
const stockLowTable = document.getElementById('stockLowTable');
const stockMovementsTable = document.getElementById('stockMovementsTable');

const saleDetailsDialog = document.getElementById('saleDetailsDialog');
const saleDetailsTitle = document.getElementById('saleDetailsTitle');
const saleDetailsSubtitle = document.getElementById('saleDetailsSubtitle');
const saleDetailsContent = document.getElementById('saleDetailsContent');
const closeSaleDetailsButton = document.getElementById('closeSaleDetailsButton');

const PAGE_SIZE = 10;
const chartColors = ['#2563eb', '#16a34a', '#f97316', '#7c3aed', '#ef4444', '#64748b'];
const paymentLabels = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  OUTROS: 'Outro',
  FIADO: 'Fiado'
};
const statusLabels = {
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  EM_ABERTO: 'Em aberto',
  PARCIAL: 'Parcial',
  VENCIDO: 'Vencido',
  ATRASADO: 'Atrasado',
  QUITADO: 'Quitado'
};

let currentUser = null;
let salesPage = 1;
let productsPage = 1;
let currentReport = {
  summary: null,
  sales: null,
  cash: null,
  fiado: null,
  payments: null,
  products: null,
  stock: null
};

const showMessage = (message = '', isError = false) => {
  reportsMessage.textContent = message;
  reportsMessage.className = message
    ? `message ${isError ? 'error' : 'success'}`
    : 'message';
};

const today = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
};

const formatDate = (value) => {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return day && month && year ? `${day}/${month}/${year}` : '—';
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const toCurrency = (value) => formatBRLCurrency(value || 0);

const createEmpty = (message) => {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
};

const appendCell = (row, value, className = '') => {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = value ?? '—';
  }
  row.appendChild(cell);
  return cell;
};

const createStatus = (status) => {
  const badge = document.createElement('span');
  badge.className = `report-status ${String(status || '').toLowerCase()}`;
  badge.textContent = statusLabels[status] || status || '—';
  return badge;
};

const renderCompactTable = (container, columns, rows, emptyMessage) => {
  container.replaceChildren();
  if (!rows?.length) {
    container.appendChild(createEmpty(emptyMessage));
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  rows.forEach((item) => {
    const row = document.createElement('tr');
    columns.forEach((column) => {
      appendCell(row, column.render(item), column.className || '');
    });
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  container.appendChild(table);
};

const getFilters = (extra = {}) => ({
  startDate: startDate.value,
  endDate: endDate.value,
  paymentMethod: paymentMethod.value,
  clientId: clientFilter.value,
  productId: productFilter.value,
  status: statusFilter.value,
  ...extra
});

const populateSelect = (select, items, getValue, getLabel, emptyLabel) => {
  const currentValue = select.value;
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = emptyLabel;
  select.appendChild(empty);
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
  select.value = currentValue;
};

const updatePeriodBadge = () => {
  const sameDay = startDate.value === endDate.value;
  periodBadge.textContent = sameDay
    ? `Período: ${formatDate(startDate.value)}`
    : `Período: ${formatDate(startDate.value)} a ${formatDate(endDate.value)}`;
};

const renderCards = (summary) => {
  const cards = summary.cards || {};
  cardSalesTotal.textContent = toCurrency(cards.vendas_periodo?.total);
  cardSalesCount.textContent = `${Number(cards.vendas_periodo?.quantidade || 0)} vendas confirmadas`;
  cardReceivedTotal.textContent = toCurrency(cards.recebido_periodo?.total);
  cardFiadoOpen.textContent = toCurrency(cards.fiado_em_aberto?.total);
  cardFiadoClients.textContent = `${Number(cards.fiado_em_aberto?.clientes || 0)} clientes com pendência`;
  cardEstimatedProfit.textContent = toCurrency(cards.lucro_estimado?.total);
};

const renderPaymentChart = (rows) => {
  const items = rows || [];
  paymentLegend.replaceChildren();

  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  if (!items.length || total <= 0) {
    paymentChart.style.background = 'conic-gradient(var(--color-border) 0 100%)';
    paymentLegend.appendChild(createEmpty('Sem recebimentos no período.'));
    return;
  }

  let cursor = 0;
  const segments = items.map((item, index) => {
    const value = Number(item.total || 0);
    const start = cursor;
    cursor += (value / total) * 100;
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
  });
  paymentChart.style.background = `conic-gradient(${segments.join(', ')})`;

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    const label = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = chartColors[index % chartColors.length];
    label.append(dot, document.createTextNode(`${paymentLabels[item.forma_pagamento] || item.forma_pagamento}`));
    const value = document.createElement('strong');
    value.textContent = `${toCurrency(item.total)} · ${item.percentual}%`;
    row.append(label, value);
    paymentLegend.appendChild(row);
  });
};

const renderTrend = (rows) => {
  salesTrend.replaceChildren();
  const max = Math.max(...rows.map((row) => Number(row.total || 0)), 1);
  rows.forEach((item) => {
    const bar = document.createElement('div');
    bar.className = 'trend-bar';
    const value = document.createElement('span');
    value.style.height = `${Math.max(10, (Number(item.total || 0) / max) * 130)}px`;
    value.title = toCurrency(item.total);
    const label = document.createElement('small');
    label.textContent = formatDate(item.data).slice(0, 5);
    bar.append(value, label);
    salesTrend.appendChild(bar);
  });
};

const renderSummaryTab = (summary) => {
  renderPaymentChart(summary.paymentBreakdown || []);
  renderTrend(summary.salesTrend || []);
  renderCompactTable(topProductsList, [
    { label: 'Produto', render: (item) => item.produto },
    { label: 'Qtd.', render: (item) => formatQuantity(item.quantidade) },
    { label: 'Total', render: (item) => toCurrency(item.total), className: 'numeric-cell' }
  ], summary.topProducts || [], 'Sem produtos vendidos no período.');

  renderCompactTable(summaryDebtorsList, [
    { label: 'Cliente', render: (item) => item.nome },
    { label: 'Ciclo', render: (item) => item.ciclo_mais_antigo },
    { label: 'Saldo', render: (item) => toCurrency(item.saldo_aberto), className: 'numeric-cell' },
    { label: 'Status', render: (item) => createStatus(item.status) }
  ], summary.fiadoDebtors || [], 'Nenhum cliente com pendência.');

  renderCompactTable(summaryFiadoReceipts, [
    { label: 'Cliente', render: (item) => item.cliente },
    { label: 'Valor', render: (item) => toCurrency(item.valor), className: 'numeric-cell' },
    { label: 'Forma', render: (item) => paymentLabels[item.forma_pagamento] || item.forma_pagamento },
    { label: 'Hora', render: (item) => formatDateTime(item.confirmado_em) }
  ], summary.fiadoReceipts || [], 'Nenhum recebimento de fiado no período.');

  renderCashSummary(cashSummaryBox, summary.cash);
};

const renderCashSummary = (container, cash) => {
  container.replaceChildren();
  const payments = cash?.payments || [];
  const receivedTotal = payments.reduce((sum, item) => (
    item.tipo_operacao === 'PAGAMENTO' ? sum + Number(item.total || 0) : sum
  ), 0);
  const refundTotal = payments.reduce((sum, item) => (
    item.tipo_operacao === 'ESTORNO' ? sum + Number(item.total || 0) : sum
  ), 0);

  const rows = [
    ['Total vendido', toCurrency(cash?.sales?.total_vendido)],
    ['Recebido em pagamentos', toCurrency(receivedTotal)],
    ['Estornos confirmados', toCurrency(refundTotal)],
    ['Vendas canceladas', `${Number(cash?.canceled?.quantidade_cancelada || 0)} · ${toCurrency(cash?.canceled?.valor_cancelado)}`],
    ['Total líquido recebido', toCurrency(receivedTotal - refundTotal)]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const left = document.createElement('span');
    left.textContent = label;
    const right = document.createElement('strong');
    right.textContent = value;
    row.append(left, right);
    container.appendChild(row);
  });
};

const createPaginationButton = ({ label, page, active = false, disabled = false }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `secondary-action compact-button pagination-button${active ? ' active' : ''}`;
  button.textContent = label;
  button.dataset.page = String(page);
  button.disabled = disabled;
  return button;
};

const renderPagination = (container, info, pagination, label) => {
  const page = Number(pagination?.page || 1);
  const pageSize = Number(pagination?.pageSize || PAGE_SIZE);
  const totalItems = Number(pagination?.totalItems || 0);
  const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  const first = totalItems ? ((page - 1) * pageSize) + 1 : 0;
  const last = Math.min(page * pageSize, totalItems);
  info.textContent = `Mostrando ${first} a ${last} de ${totalItems} ${label}`;
  container.replaceChildren();
  container.appendChild(createPaginationButton({
    label: 'Anterior',
    page: Math.max(1, page - 1),
    disabled: page <= 1
  }));
  for (let nextPage = 1; nextPage <= totalPages; nextPage += 1) {
    if (nextPage > 5 && Math.abs(nextPage - page) > 1 && nextPage !== totalPages) continue;
    container.appendChild(createPaginationButton({
      label: String(nextPage),
      page: nextPage,
      active: nextPage === page
    }));
  }
  container.appendChild(createPaginationButton({
    label: 'Próxima',
    page: Math.min(totalPages, page + 1),
    disabled: page >= totalPages
  }));
};

const renderSales = (sales) => {
  salesTableBody.replaceChildren();
  if (!sales.items?.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = 'Nenhuma venda encontrada no período.';
    row.appendChild(cell);
    salesTableBody.appendChild(row);
  } else {
    sales.items.forEach((sale) => {
      const row = document.createElement('tr');
      const detailsButton = document.createElement('button');
      detailsButton.type = 'button';
      detailsButton.className = 'secondary-action compact-button';
      detailsButton.textContent = 'Detalhes';
      detailsButton.dataset.saleId = sale.id;
      appendCell(row, `#${sale.id}`);
      appendCell(row, formatDateTime(sale.confirmada_em));
      appendCell(row, sale.cliente || 'Cliente avulso');
      appendCell(row, sale.tipo_venda === 'FIADO' ? 'Fiado' : sale.formas_pagamento || '—');
      appendCell(row, toCurrency(sale.total), 'numeric-cell');
      appendCell(row, createStatus(sale.status));
      appendCell(row, sale.operador || '—');
      appendCell(row, detailsButton);
      salesTableBody.appendChild(row);
    });
  }
  renderPagination(salesPaginationButtons, salesPaginationInfo, sales.pagination, 'vendas');
};

const renderCash = (cash) => {
  renderCashSummary(cashReportSummary, cash.summary);
  cashSessionsTable.replaceChildren();
  const sessions = cash.sessions?.items || [];
  if (!sessions.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 9;
    cell.textContent = 'Nenhuma sessão de caixa encontrada.';
    row.appendChild(cell);
    cashSessionsTable.appendChild(row);
    return;
  }

  sessions.forEach((session) => {
    const row = document.createElement('tr');
    appendCell(row, formatDateTime(session.aberto_em));
    appendCell(row, formatDateTime(session.fechado_em));
    appendCell(row, session.usuario_abertura);
    appendCell(row, session.usuario_fechamento || '—');
    appendCell(row, toCurrency(session.valor_abertura), 'numeric-cell');
    appendCell(row, toCurrency(session.valor_fechamento_esperado), 'numeric-cell');
    appendCell(row, toCurrency(session.valor_fechamento_informado), 'numeric-cell');
    appendCell(row, toCurrency(session.diferenca_fechamento), 'numeric-cell');
    appendCell(row, session.status);
    cashSessionsTable.appendChild(row);
  });
};

const renderFiado = (fiado) => {
  fiadoOpenTotal.textContent = toCurrency(fiado.summary?.total_em_aberto);
  fiadoPendingClients.textContent = Number(fiado.summary?.clientes_com_pendencia || 0);
  fiadoReceivedPeriod.textContent = toCurrency(fiado.summary?.recebido_periodo);

  renderCompactTable(fiadoDebtorsTable, [
    { label: 'Cliente', render: (item) => item.nome },
    { label: 'CPF', render: (item) => item.cpf_mascarado },
    { label: 'Ciclo mais antigo', render: (item) => item.ciclo_mais_antigo },
    { label: 'Saldo', render: (item) => toCurrency(item.saldo_aberto), className: 'numeric-cell' },
    { label: 'Status', render: (item) => createStatus(item.status) }
  ], fiado.debtors || [], 'Nenhum cliente com pendência.');

  renderCompactTable(fiadoReceiptsTable, [
    { label: 'Cliente', render: (item) => item.cliente },
    { label: 'Valor', render: (item) => toCurrency(item.valor), className: 'numeric-cell' },
    { label: 'Forma', render: (item) => paymentLabels[item.forma_pagamento] || item.forma_pagamento },
    { label: 'Data/hora', render: (item) => formatDateTime(item.confirmado_em) },
    { label: 'Operador', render: (item) => item.operador || '—' }
  ], fiado.receipts || [], 'Nenhum recebimento de fiado no período.');
};

const renderPayments = (payments) => {
  renderCompactTable(paymentsTable, [
    { label: 'Forma', render: (item) => paymentLabels[item.forma_pagamento] || item.forma_pagamento },
    { label: 'Finalidade', render: (item) => item.finalidade },
    { label: 'Operação', render: (item) => item.tipo_operacao },
    { label: 'Qtd.', render: (item) => Number(item.quantidade || 0) },
    { label: 'Total', render: (item) => toCurrency(item.total), className: 'numeric-cell' },
    { label: '%', render: (item) => `${item.percentual || '0.00'}%`, className: 'numeric-cell' }
  ], payments.items || [], 'Nenhum pagamento encontrado no período.');
};

const renderProducts = (products) => {
  productsReportTable.replaceChildren();
  if (!products.items?.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Nenhum produto vendido no período.';
    row.appendChild(cell);
    productsReportTable.appendChild(row);
  } else {
    products.items.forEach((product) => {
      const row = document.createElement('tr');
      appendCell(row, product.produto);
      appendCell(row, product.categoria || 'Sem categoria');
      appendCell(row, formatQuantity(product.quantidade_vendida), 'numeric-cell');
      appendCell(row, toCurrency(product.total_vendido), 'numeric-cell');
      appendCell(row, toCurrency(product.custo_estimado), 'numeric-cell');
      appendCell(row, toCurrency(product.lucro_estimado), 'numeric-cell');
      appendCell(row, formatQuantity(product.estoque_atual), 'numeric-cell');
      productsReportTable.appendChild(row);
    });
  }
  renderPagination(productsPaginationButtons, productsPaginationInfo, products.pagination, 'produtos');
};

const renderStock = (stock) => {
  stockValueReport.textContent = toCurrency(stock.summary?.valor_estimado);
  stockLowCount.textContent = Number(stock.summary?.baixo_estoque || 0);
  stockOutCount.textContent = Number(stock.summary?.sem_estoque || 0);

  renderCompactTable(stockLowTable, [
    { label: 'Produto', render: (item) => item.nome },
    { label: 'Atual', render: (item) => formatQuantity(item.estoque_atual), className: 'numeric-cell' },
    { label: 'Mínimo', render: (item) => formatQuantity(item.estoque_minimo), className: 'numeric-cell' }
  ], [...(stock.lowStock || []), ...(stock.outOfStock || [])], 'Nenhum produto com atenção no estoque.');

  renderCompactTable(stockMovementsTable, [
    { label: 'Produto', render: (item) => item.produto },
    { label: 'Natureza', render: (item) => item.natureza },
    { label: 'Origem', render: (item) => item.origem },
    { label: 'Qtd.', render: (item) => formatQuantity(item.quantidade), className: 'numeric-cell' },
    { label: 'Data/hora', render: (item) => formatDateTime(item.criado_em) }
  ], stock.movements || [], 'Nenhuma movimentação no período.');
};

const renderAll = () => {
  renderCards(currentReport.summary);
  renderSummaryTab(currentReport.summary);
  renderSales(currentReport.sales);
  renderCash(currentReport.cash);
  renderFiado(currentReport.fiado);
  renderPayments(currentReport.payments);
  renderProducts(currentReport.products);
  renderStock(currentReport.stock);
};

const loadReport = async () => {
  generateReportButton.disabled = true;
  showMessage('Carregando relatório...');
  updatePeriodBadge();
  try {
    const baseFilters = getFilters();
    const [
      summary,
      sales,
      cash,
      fiado,
      payments,
      products,
      stock
    ] = await Promise.all([
      reportsApi.getSummary(baseFilters),
      reportsApi.getSales({ ...baseFilters, page: salesPage, pageSize: PAGE_SIZE }),
      reportsApi.getCash({ ...baseFilters, page: 1, pageSize: PAGE_SIZE }),
      reportsApi.getFiado(baseFilters),
      reportsApi.getPayments(baseFilters),
      reportsApi.getProducts({ ...baseFilters, page: productsPage, pageSize: PAGE_SIZE }),
      reportsApi.getStock(baseFilters)
    ]);
    currentReport = { summary, sales, cash, fiado, payments, products, stock };
    renderAll();
    showMessage('');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    generateReportButton.disabled = false;
  }
};

const openSaleDetails = (saleId) => {
  const sale = currentReport.sales?.items?.find((item) => String(item.id) === String(saleId));
  if (!sale) return;
  saleDetailsTitle.textContent = `Venda #${sale.id}`;
  saleDetailsSubtitle.textContent = `${formatDateTime(sale.confirmada_em)} · ${sale.status}`;
  renderCompactTable(saleDetailsContent, [
    { label: 'Item', render: (item) => item.descricao },
    { label: 'Qtd.', render: (item) => formatQuantity(item.quantidade), className: 'numeric-cell' },
    { label: 'Unitário', render: (item) => toCurrency(item.preco_unitario), className: 'numeric-cell' },
    { label: 'Total', render: (item) => toCurrency(item.total_item), className: 'numeric-cell' }
  ], sale.itens || [], 'Venda sem itens.');
  saleDetailsDialog.showModal();
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const formatCsvMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0,00';
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const fetchAllPages = async (loader, filters) => {
  const firstPage = await loader({ ...filters, page: 1, pageSize: 100 });
  const items = [...(firstPage.items || [])];
  const totalPages = Number(firstPage.pagination?.totalPages || 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await loader({ ...filters, page, pageSize: 100 });
    items.push(...(nextPage.items || []));
  }

  return items;
};

const downloadCsv = async () => {
  exportExcelButton.disabled = true;
  showMessage('Gerando arquivo para Excel...');
  const baseFilters = getFilters();
  try {
    const [allSales, allProducts] = await Promise.all([
      fetchAllPages(reportsApi.getSales, baseFilters),
      fetchAllPages(reportsApi.getProducts, baseFilters)
    ]);

    const rows = [
      ['Relatório Cantina', `${formatDate(startDate.value)} a ${formatDate(endDate.value)}`],
      [],
      ['Resumo'],
      ['Vendas', formatCsvMoney(currentReport.summary?.cards?.vendas_periodo?.total)],
      ['Recebido', formatCsvMoney(currentReport.summary?.cards?.recebido_periodo?.total)],
      ['Fiado em aberto', formatCsvMoney(currentReport.summary?.cards?.fiado_em_aberto?.total)],
      ['Lucro estimado', formatCsvMoney(currentReport.summary?.cards?.lucro_estimado?.total)],
      [],
      ['Vendas do período'],
      ['Número', 'Data/hora', 'Cliente', 'Forma', 'Total', 'Status', 'Operador'],
      ...allSales.map((sale) => [
        sale.id,
        formatDateTime(sale.confirmada_em),
        sale.cliente || 'Cliente avulso',
        sale.tipo_venda === 'FIADO' ? 'Fiado' : sale.formas_pagamento || '',
        formatCsvMoney(sale.total),
        sale.status,
        sale.operador || ''
      ]),
      [],
      ['Fiado em aberto'],
      ['Cliente', 'CPF', 'Ciclo', 'Saldo', 'Status'],
      ...(currentReport.fiado?.debtors || []).map((item) => [
        item.nome,
        item.cpf_mascarado,
        item.ciclo_mais_antigo,
        formatCsvMoney(item.saldo_aberto),
        statusLabels[item.status] || item.status
      ]),
      [],
      ['Recebimentos de fiado'],
      ['Cliente', 'Valor', 'Forma', 'Data/hora', 'Operador'],
      ...(currentReport.fiado?.receipts || []).map((item) => [
        item.cliente,
        formatCsvMoney(item.valor),
        item.forma_pagamento,
        formatDateTime(item.confirmado_em),
        item.operador || ''
      ]),
      [],
      ['Produtos vendidos'],
      ['Produto', 'Categoria', 'Quantidade', 'Total vendido', 'Custo estimado', 'Lucro estimado'],
      ...allProducts.map((item) => [
        item.produto,
        item.categoria || '',
        formatQuantity(item.quantidade_vendida),
        formatCsvMoney(item.total_vendido),
        formatCsvMoney(item.custo_estimado),
        formatCsvMoney(item.lucro_estimado)
      ])
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-cantina-${startDate.value}-a-${endDate.value}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    exportExcelButton.disabled = currentUser?.role?.slug === 'CONSULTA';
  }
};

const configureExportPermissions = async () => {
  const response = await authApi.me();
  currentUser = response.user;
  if (currentUser?.role?.slug === 'CONSULTA') {
    exportPdfButton.disabled = true;
    exportExcelButton.disabled = true;
    exportPdfButton.title = 'Usuário de consulta não exporta relatórios.';
    exportExcelButton.title = 'Usuário de consulta não exporta relatórios.';
  }
};

reportsFilters.addEventListener('submit', async (event) => {
  event.preventDefault();
  salesPage = 1;
  productsPage = 1;
  await loadReport();
});

reportsFilters.addEventListener('reset', () => {
  window.setTimeout(async () => {
    startDate.value = today();
    endDate.value = today();
    salesPage = 1;
    productsPage = 1;
    await loadReport();
  }, 0);
});

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((tab) => {
      tab.classList.toggle('active', tab === button);
    });
    document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === button.dataset.tab);
    });
  });
});

salesPaginationButtons.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.disabled) return;
  salesPage = Number(button.dataset.page || 1);
  await loadReport();
});

productsPaginationButtons.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.disabled) return;
  productsPage = Number(button.dataset.page || 1);
  await loadReport();
});

salesTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-sale-id]');
  if (button) openSaleDetails(button.dataset.saleId);
});

printReportButton.addEventListener('click', () => window.print());
exportPdfButton.addEventListener('click', () => window.print());
exportExcelButton.addEventListener('click', downloadCsv);
closeSaleDetailsButton.addEventListener('click', () => saleDetailsDialog.close());

window.addEventListener('DOMContentLoaded', async () => {
  try {
    startDate.value = today();
    endDate.value = today();
    await configureExportPermissions();
    const options = await reportsApi.getOptions();
    populateSelect(clientFilter, options.clients || [], (client) => client.id, (client) => `${client.nome} · ${client.codigo}`, 'Todos');
    populateSelect(productFilter, options.products || [], (product) => product.id, (product) => product.nome, 'Todos');
    await loadReport();
  } catch (error) {
    showMessage(error.message, true);
  }
});
