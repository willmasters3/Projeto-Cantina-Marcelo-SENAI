import fiadoApi from './fiadoApi.js';
import {
  bindCurrencyInput,
  formatBRLCurrency,
  formattedCurrencyToDecimal
} from './currencyInput.js';

const fiadoMessage = document.getElementById('fiadoMessage');
const summaryOpenBalance = document.getElementById('summaryOpenBalance');
const summaryOverdue = document.getElementById('summaryOverdue');
const summaryReceived = document.getElementById('summaryReceived');
const summaryPendingCustomers = document.getElementById('summaryPendingCustomers');
const customerSearchForm = document.getElementById('customerSearchForm');
const customerSearch = document.getElementById('customerSearch');
const customerLookupResult = document.getElementById('customerLookupResult');
const paymentForm = document.getElementById('paymentForm');
const paymentCustomer = document.getElementById('paymentCustomer');
const paymentCycle = document.getElementById('paymentCycle');
const cycleBalance = document.getElementById('cycleBalance');
const paymentAmount = document.getElementById('paymentAmount');
const paymentMethod = document.getElementById('paymentMethod');
const paymentNote = document.getElementById('paymentNote');
const paymentSubmitButton = document.getElementById('paymentSubmitButton');
const paymentHistoryButton = document.getElementById('paymentHistoryButton');
const pendingCustomersTable = document.getElementById('pendingCustomersTable');
const statementDialog = document.getElementById('statementDialog');
const statementTitle = document.getElementById('statementTitle');
const statementSubtitle = document.getElementById('statementSubtitle');
const statementContent = document.getElementById('statementContent');
const closeStatementButton = document.getElementById('closeStatementButton');

const statusLabels = new Map([
  ['EM_DIA', { label: 'Em dia', className: 'em_dia' }],
  ['EM_ABERTO', { label: 'Em aberto', className: 'em_aberto' }],
  ['PARCIAL', { label: 'Parcial', className: 'parcial' }],
  ['VENCIDO', { label: 'Vencido', className: 'vencido' }],
  ['ATRASADO', { label: 'Atrasado', className: 'atrasado' }],
  ['QUITADO', { label: 'Quitado', className: 'quitado' }]
]);

const originLabels = new Map([
  ['VENDA_FIADO', 'Compra fiado'],
  ['PAGAMENTO_CLIENTE', 'Pagamento'],
  ['CANCELAMENTO_VENDA', 'Cancelamento de venda'],
  ['ESTORNO_PAGAMENTO', 'Estorno de pagamento'],
  ['AJUSTE', 'Ajuste']
]);

let pendingCustomers = [];
let selectedCustomer = null;
let submittingConfirmedExtraCredit = false;

bindCurrencyInput(paymentAmount);

const showMessage = (message, isError = false) => {
  fiadoMessage.textContent = message;
  fiadoMessage.className = message
    ? `message ${isError ? 'error' : 'success'}`
    : 'message';
};

const createEmpty = (message) => {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
};

const createCell = (value) => {
  const cell = document.createElement('td');
  cell.textContent = value || '—';
  return cell;
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const getStatusInfo = (status) => (
  statusLabels.get(status) || statusLabels.get('EM_ABERTO')
);

const createStatusBadge = (status) => {
  const info = getStatusInfo(status);
  const badge = document.createElement('span');
  badge.className = `fiado-status ${info.className}`;
  badge.textContent = info.label;
  return badge;
};

const getCycleByKey = (customer, cycleKey) => (
  customer?.ciclos_abertos?.find((cycle) => cycle.cycle_key === cycleKey) || null
);

const setSelectedCustomer = async (customerId, { focusPayment = false } = {}) => {
  if (!customerId) {
    selectedCustomer = null;
    renderSelectedCustomer();
    populatePaymentForm();
    return;
  }

  selectedCustomer = await fiadoApi.getCustomer(customerId);
  renderSelectedCustomer();
  populatePaymentForm();
  if (focusPayment) {
    paymentAmount.focus();
  }
};

const renderSummary = (summary) => {
  summaryOpenBalance.textContent = formatBRLCurrency(summary.saldo_total_aberto);
  summaryOverdue.textContent = formatBRLCurrency(summary.vencido_mes_anterior);
  summaryReceived.textContent = formatBRLCurrency(summary.recebido_mes_atual);
  summaryPendingCustomers.textContent = Number(summary.clientes_com_pendencia || 0);
};

const renderSelectedCustomer = () => {
  customerLookupResult.replaceChildren();
  if (!selectedCustomer) {
    customerLookupResult.appendChild(createEmpty('Busque um cliente para ver dívidas e ciclos em aberto.'));
    return;
  }

  const card = document.createElement('article');
  card.className = 'customer-card';
  const avatar = document.createElement('div');
  avatar.className = 'customer-avatar';
  avatar.textContent = selectedCustomer.nome?.charAt(0)?.toUpperCase() || 'C';

  const main = document.createElement('div');
  main.className = 'customer-main';
  const header = document.createElement('div');
  header.className = 'customer-header';
  const title = document.createElement('div');
  const name = document.createElement('h3');
  name.textContent = selectedCustomer.nome;
  const meta = document.createElement('div');
  meta.className = 'customer-meta';
  [
    `Código ${selectedCustomer.codigo || '—'}`,
    `CPF ${selectedCustomer.cpf_mascarado}`,
    selectedCustomer.matricula ? `Matrícula ${selectedCustomer.matricula}` : null
  ].filter(Boolean).forEach((item) => {
    const span = document.createElement('span');
    span.textContent = item;
    meta.appendChild(span);
  });
  title.append(name, meta);

  const status = document.createElement('div');
  status.appendChild(createStatusBadge(selectedCustomer.situacao));
  header.append(title, status);

  const balance = document.createElement('p');
  balance.className = 'customer-balance';
  const balanceLabel = document.createElement('strong');
  balanceLabel.textContent = 'Saldo atual:';
  balance.append(balanceLabel, document.createTextNode(` ${formatBRLCurrency(selectedCustomer.saldo_aberto)}`));

  const cycles = document.createElement('div');
  cycles.className = 'cycle-list';
  if (selectedCustomer.ciclos_abertos?.length) {
    selectedCustomer.ciclos_abertos.forEach((cycle) => {
      const chip = document.createElement('span');
      chip.className = 'cycle-chip';
      chip.textContent = `${cycle.label} — ${formatBRLCurrency(cycle.saldo)}`;
      cycles.appendChild(chip);
    });
  } else {
    cycles.appendChild(createEmpty('Cliente sem pendências.'));
  }

  main.append(header, balance, cycles);
  card.append(avatar, main);
  customerLookupResult.appendChild(card);
};

const populatePaymentCustomers = () => {
  const currentValue = selectedCustomer ? String(selectedCustomer.id) : paymentCustomer.value;
  const customers = [...pendingCustomers];
  if (
    selectedCustomer
    && !customers.some((customer) => String(customer.id) === String(selectedCustomer.id))
  ) {
    customers.unshift(selectedCustomer);
  }

  paymentCustomer.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = customers.length ? 'Selecione um cliente' : 'Nenhum cliente com pendência';
  paymentCustomer.appendChild(placeholder);

  if (!customers.length) {
    return;
  }

  customers.forEach((customer) => {
    const option = document.createElement('option');
    option.value = customer.id;
    option.textContent = customer.nome;
    paymentCustomer.appendChild(option);
  });

  paymentCustomer.value = customers.some((customer) => String(customer.id) === String(currentValue))
    ? currentValue
    : '';
};

const populatePaymentCycles = () => {
  paymentCycle.replaceChildren();

  if (!selectedCustomer) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Selecione um cliente';
    paymentCycle.appendChild(option);
    cycleBalance.value = formatBRLCurrency(0);
    paymentCycle.disabled = true;
    paymentSubmitButton.disabled = true;
    paymentHistoryButton.disabled = true;
    return;
  }

  paymentCycle.disabled = false;
  paymentHistoryButton.disabled = false;
  const cycles = selectedCustomer?.ciclos_abertos || [];

  if (!cycles.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Sem ciclo em aberto';
    paymentCycle.appendChild(option);
    cycleBalance.value = formatBRLCurrency(0);
    paymentSubmitButton.disabled = true;
    return;
  }

  paymentSubmitButton.disabled = false;

  cycles.forEach((cycle) => {
    const option = document.createElement('option');
    option.value = cycle.cycle_key;
    option.textContent = `${cycle.label} — ${formatBRLCurrency(cycle.saldo)}`;
    paymentCycle.appendChild(option);
  });

  updateCycleBalance();
};

const populatePaymentForm = () => {
  populatePaymentCustomers();
  if (selectedCustomer) paymentCustomer.value = String(selectedCustomer.id);
  populatePaymentCycles();
};

function updateCycleBalance() {
  const cycle = getCycleByKey(selectedCustomer, paymentCycle.value);
  cycleBalance.value = formatBRLCurrency(cycle?.saldo || 0);
}

const renderPendingCustomers = (customers) => {
  pendingCustomersTable.replaceChildren();
  if (!customers.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Nenhum cliente com pendência.';
    row.appendChild(cell);
    pendingCustomersTable.appendChild(row);
    return;
  }

  customers.forEach((customer) => {
    const row = document.createElement('tr');
    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatusBadge(customer.situacao));

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'table-action-group';

    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'secondary-action compact-button';
    detailsButton.textContent = 'Detalhes';
    detailsButton.addEventListener('click', () => openStatement(customer.id));

    const payButton = document.createElement('button');
    payButton.type = 'button';
    payButton.className = 'compact-button';
    payButton.textContent = 'Pagar';
    payButton.addEventListener('click', async () => {
      await setSelectedCustomer(customer.id, { focusPayment: true });
      paymentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const historyButton = document.createElement('button');
    historyButton.type = 'button';
    historyButton.className = 'secondary-action compact-button';
    historyButton.textContent = 'Histórico';
    historyButton.addEventListener('click', () => openStatement(customer.id));

    actions.append(detailsButton, payButton, historyButton);
    actionsCell.appendChild(actions);

    row.append(
      createCell(customer.nome),
      createCell(customer.cpf_mascarado),
      createCell(customer.ciclo_mais_antigo),
      createCell(formatBRLCurrency(customer.saldo_aberto)),
      statusCell,
      actionsCell
    );
    pendingCustomersTable.appendChild(row);
  });
};

const renderStatement = (statement) => {
  statementTitle.textContent = `Extrato de ${statement.cliente.nome}`;
  statementSubtitle.textContent = `${statement.cliente.codigo || 'Sem código'} · ${statement.cliente.cpf_mascarado}`;
  statementContent.replaceChildren();

  const cyclesSection = document.createElement('section');
  cyclesSection.className = 'statement-section';
  const cyclesTitle = document.createElement('h3');
  cyclesTitle.textContent = 'Ciclos';
  const cyclesList = document.createElement('div');
  cyclesList.className = 'statement-list';
  if (statement.ciclos.length) {
    statement.ciclos.forEach((cycle) => {
      const item = document.createElement('div');
      item.className = 'statement-item';
      const title = document.createElement('strong');
      title.textContent = cycle.label;
      const meta = document.createElement('small');
      meta.textContent = `Débitos ${formatBRLCurrency(cycle.debitos)} · Créditos ${formatBRLCurrency(cycle.creditos)} · Saldo ${formatBRLCurrency(cycle.saldo)}`;
      item.append(title, meta);
      cyclesList.appendChild(item);
    });
  } else {
    cyclesList.appendChild(createEmpty('Nenhum ciclo registrado.'));
  }
  cyclesSection.append(cyclesTitle, cyclesList);

  const entriesSection = document.createElement('section');
  entriesSection.className = 'statement-section';
  const entriesTitle = document.createElement('h3');
  entriesTitle.textContent = 'Lançamentos';
  const entriesList = document.createElement('div');
  entriesList.className = 'statement-list';
  if (statement.lancamentos.length) {
    statement.lancamentos.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'statement-item';
      const valueClass = entry.natureza === 'DEBITO' ? 'debit' : 'credit';
      const signal = entry.natureza === 'DEBITO' ? '+' : '-';
      const title = document.createElement('strong');
      title.textContent = `${originLabels.get(entry.origem) || entry.origem} · ${entry.ciclo}`;
      const value = document.createElement('span');
      value.className = `statement-value ${valueClass}`;
      value.textContent = `${signal} ${formatBRLCurrency(entry.valor)}`;
      const meta = document.createElement('small');
      meta.textContent = `${formatDateTime(entry.criado_em)} · Saldo após: ${formatBRLCurrency(entry.saldo_apos)}`;
      item.append(title, value, meta);
      if (entry.descricao) {
        const description = document.createElement('small');
        description.textContent = entry.descricao;
        item.appendChild(description);
      }
      entriesList.appendChild(item);
    });
  } else {
    entriesList.appendChild(createEmpty('Nenhum lançamento encontrado.'));
  }
  entriesSection.append(entriesTitle, entriesList);

  const purchasesSection = document.createElement('section');
  purchasesSection.className = 'statement-section';
  const purchasesTitle = document.createElement('h3');
  purchasesTitle.textContent = 'Compras fiado';
  const purchasesList = document.createElement('div');
  purchasesList.className = 'statement-list';
  if (statement.compras.length) {
    statement.compras.forEach((purchase) => {
      const item = document.createElement('div');
      item.className = 'statement-item';
      const title = document.createElement('strong');
      title.textContent = `${purchase.descricao} · ${purchase.ciclo}`;
      const meta = document.createElement('small');
      meta.textContent = `${formatDateTime(purchase.confirmada_em)} · Quantidade ${purchase.quantidade} · Total ${formatBRLCurrency(purchase.total_item)}`;
      item.append(title, meta);
      purchasesList.appendChild(item);
    });
  } else {
    purchasesList.appendChild(createEmpty('Nenhuma compra fiado encontrada.'));
  }
  purchasesSection.append(purchasesTitle, purchasesList);

  statementContent.append(cyclesSection, entriesSection, purchasesSection);
};

async function openStatement(customerId) {
  try {
    const statement = await fiadoApi.getCustomerStatement(customerId);
    renderStatement(statement);
    statementDialog.showModal();
  } catch (error) {
    showMessage(error.message, true);
  }
}

const loadPageData = async () => {
  try {
    const [summary, customers] = await Promise.all([
      fiadoApi.getSummary(),
      fiadoApi.listCustomers()
    ]);
    pendingCustomers = customers;
    renderSummary(summary);
    renderPendingCustomers(customers);

    if (selectedCustomer?.id) {
      await setSelectedCustomer(selectedCustomer.id);
    } else {
      populatePaymentForm();
    }
  } catch (error) {
    showMessage(error.message, true);
  }
};

customerSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const customers = await fiadoApi.listCustomers(customerSearch.value.trim());
    if (!customers.length) {
      selectedCustomer = null;
      renderSelectedCustomer();
      populatePaymentForm();
      showMessage('Cliente não encontrado.', true);
      return;
    }
    await setSelectedCustomer(customers[0].id);
    showMessage(customers[0].ciclos_abertos?.length ? '' : 'Cliente sem pendências.');
  } catch (error) {
    showMessage(error.message, true);
  }
});

paymentCustomer.addEventListener('change', async () => {
  if (paymentCustomer.value) {
    await setSelectedCustomer(paymentCustomer.value);
  } else {
    await setSelectedCustomer(null);
  }
});

paymentCycle.addEventListener('change', updateCycleBalance);

paymentHistoryButton.addEventListener('click', () => {
  if (selectedCustomer) openStatement(selectedCustomer.id);
});

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedCustomer) {
    showMessage('Cliente não encontrado.', true);
    return;
  }

  paymentSubmitButton.disabled = true;
  try {
    const payload = {
      cliente_id: selectedCustomer.id,
      ciclo: paymentCycle.value,
      valor_recebido: formattedCurrencyToDecimal(paymentAmount.value),
      forma_pagamento: paymentMethod.value,
      observacao: paymentNote.value.trim() || null,
      confirmar_credito_adicional: submittingConfirmedExtraCredit
    };

    const result = await fiadoApi.registerPayment(payload);
    submittingConfirmedExtraCredit = false;
    paymentForm.reset();
    paymentAmount.dataset.currencyDigits = '';
    await loadPageData();
    if (selectedCustomer?.id) await setSelectedCustomer(selectedCustomer.id);
    const wasDistributed = (result.aplicacoes || []).length > 1;
    const hasRemainingBalance = parseFloat(result.saldo_total_restante || result.saldo_restante) > 0;
    const hasExtraCredit = parseFloat(result.credito_adicional || 0) > 0;
    showMessage([
      wasDistributed ? 'Pagamento registrado e distribuído entre ciclos.' : 'Pagamento registrado com sucesso.',
      hasRemainingBalance ? 'Saldo restante mantido em aberto.' : null,
      hasExtraCredit ? 'Crédito adicional lançado no extrato.' : null
    ].filter(Boolean).join(' '));
  } catch (error) {
    if (error.status === 409 && error.data?.code === 'FIADO_OVERPAYMENT_REQUIRES_CONFIRMATION') {
      const confirmed = window.confirm(error.message);
      if (confirmed) {
        submittingConfirmedExtraCredit = true;
        paymentForm.requestSubmit();
        return;
      }
    }
    submittingConfirmedExtraCredit = false;
    showMessage(error.message, true);
  } finally {
    if (!submittingConfirmedExtraCredit) {
      paymentSubmitButton.disabled = !selectedCustomer?.ciclos_abertos?.length;
    }
  }
});

closeStatementButton.addEventListener('click', () => statementDialog.close());

window.addEventListener('DOMContentLoaded', async () => {
  renderSelectedCustomer();
  await loadPageData();
});
