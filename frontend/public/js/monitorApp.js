import { bindCpfInput, formatCpf, isValidCpf, onlyCpfDigits } from './cpfInput.js';
import { decimalToUnits, formatBRL } from './fixedMoney.js';
import { formatQuantity } from './quantityFormat.js';

const accountScreen = document.getElementById('accountScreen');
const saleScreen = document.getElementById('saleScreen');
const monitorModeLabel = document.getElementById('monitorModeLabel');
const monitorHint = document.getElementById('monitorHint');
const monitorTime = document.getElementById('monitorTime');
const monitorDate = document.getElementById('monitorDate');
const accountForm = document.getElementById('accountForm');
const accountCpf = document.getElementById('accountCpf');
const cpfKeypad = document.getElementById('cpfKeypad');
const consultAccountButton = document.getElementById('consultAccountButton');
const clearAccountButton = document.getElementById('clearAccountButton');
const accountMessage = document.getElementById('accountMessage');
const accountResult = document.getElementById('accountResult');
const accountInitials = document.getElementById('accountInitials');
const accountGreeting = document.getElementById('accountGreeting');
const accountMaskedCpf = document.getElementById('accountMaskedCpf');
const accountBalance = document.getElementById('accountBalance');
const accountEntries = document.getElementById('accountEntries');
const accountTotal = document.getElementById('accountTotal');
const saleMonitorItems = document.getElementById('saleMonitorItems');
const saleMonitorSubtotal = document.getElementById('saleMonitorSubtotal');
const saleMonitorTotal = document.getElementById('saleMonitorTotal');
const saleMonitorStatus = document.getElementById('saleMonitorStatus');

const accountTimeoutMilliseconds = 30_000;
let accountTimeout = null;
let accountRequestSequence = 0;
let currentMode = 'CONSULTA';

bindCpfInput(accountCpf);

const createCell = (value) => {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
};

const showAccountMessage = (message = '', isError = false) => {
  accountMessage.textContent = message;
  accountMessage.className = message
    ? `monitor-message ${isError ? 'error' : 'success'}`
    : 'monitor-message';
};

const clearAccountTimeout = () => {
  if (accountTimeout) clearTimeout(accountTimeout);
  accountTimeout = null;
};

const clearSensitiveAccountData = ({ clearInput = true, invalidateRequest = true } = {}) => {
  if (invalidateRequest) accountRequestSequence += 1;
  clearAccountTimeout();
  accountResult.hidden = true;
  accountEntries.replaceChildren();
  accountGreeting.textContent = 'Olá';
  accountMaskedCpf.textContent = '***.***.***-**';
  accountBalance.textContent = formatBRL('0');
  accountTotal.textContent = formatBRL('0');
  accountInitials.textContent = 'C';
  if (clearInput) accountCpf.value = '';
};

const returnToInitialAccountScreen = () => {
  clearSensitiveAccountData();
  consultAccountButton.disabled = false;
  showAccountMessage();
  if (currentMode === 'CONSULTA') accountCpf.focus();
};

const scheduleAccountExpiration = () => {
  if (accountResult.hidden || currentMode !== 'CONSULTA') return;
  clearAccountTimeout();
  accountTimeout = setTimeout(returnToInitialAccountScreen, accountTimeoutMilliseconds);
};

const showAccountMode = () => {
  currentMode = 'CONSULTA';
  accountScreen.hidden = false;
  saleScreen.hidden = true;
  monitorHint.hidden = false;
  monitorModeLabel.textContent = 'Consulta de conta';
  returnToInitialAccountScreen();
};

const showSaleMode = () => {
  currentMode = 'COMPRA_EM_ANDAMENTO';
  clearSensitiveAccountData();
  showAccountMessage();
  accountScreen.hidden = true;
  saleScreen.hidden = false;
  monitorHint.hidden = true;
  monitorModeLabel.textContent = 'Acompanhe sua compra';
};

const renderAccountEntries = (entries) => {
  accountEntries.replaceChildren();
  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = createCell('Nenhum lançamento encontrado.');
    cell.colSpan = 5;
    cell.className = 'monitor-empty-cell';
    row.appendChild(cell);
    accountEntries.appendChild(row);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement('tr');
    const valueCell = createCell(
      `${entry.natureza === 'CREDITO' ? '- ' : ''}${formatBRL(entry.valor)}`
    );
    valueCell.className = `account-entry-value ${entry.natureza === 'CREDITO' ? 'credit' : 'debit'}`;
    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = 'account-entry-status';
    status.textContent = entry.status;
    statusCell.appendChild(status);
    row.append(
      createCell(new Date(entry.data).toLocaleDateString('pt-BR')),
      createCell(entry.descricao),
      createCell(entry.tipo),
      valueCell,
      statusCell
    );
    accountEntries.appendChild(row);
  });
};

const renderAccount = (account) => {
  const firstName = account.cliente.primeiro_nome;
  const balanceText = formatBRL(account.saldo_pendente);
  accountGreeting.textContent = `Olá, ${firstName}`;
  accountInitials.textContent = firstName.slice(0, 2).toUpperCase();
  accountMaskedCpf.textContent = account.cliente.cpf_mascarado;
  accountBalance.textContent = balanceText;
  accountTotal.textContent = balanceText;
  renderAccountEntries(account.lancamentos);
  accountResult.hidden = false;

  if (decimalToUnits(account.saldo_pendente) === 0n) {
    showAccountMessage('Nenhum valor pendente no momento.');
  } else {
    showAccountMessage('Resumo da conta localizado.');
  }
  scheduleAccountExpiration();
};

const requestAccount = async (cpf) => {
  const response = await fetch('/api/v1/monitor/account', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cpf })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || 'Não foi possível consultar a conta.');
    error.status = response.status;
    throw error;
  }
  return payload.data;
};

const renderSale = (state) => {
  showSaleMode();
  saleMonitorItems.replaceChildren();
  state.itens.forEach((item) => {
    const row = document.createElement('tr');
    row.append(
      createCell(item.descricao),
      createCell(`${formatQuantity(item.quantidade)} un`),
      createCell(formatBRL(item.preco_unitario)),
      createCell(formatBRL(item.total_item))
    );
    saleMonitorItems.appendChild(row);
  });
  saleMonitorSubtotal.textContent = formatBRL(state.subtotal);
  saleMonitorTotal.textContent = formatBRL(state.total);
  const completed = state.status === 'SALE_COMPLETED';
  saleMonitorStatus.textContent = completed
    ? 'Compra registrada com sucesso. Obrigado!'
    : 'Acompanhe os itens registrados pelo operador.';
  saleMonitorStatus.className = completed
    ? 'sale-monitor-status completed'
    : 'sale-monitor-status';
};

const handleMonitorState = (state) => {
  if (state.status === 'SALE_ACTIVE' || state.status === 'SALE_COMPLETED') {
    renderSale(state);
    return;
  }
  showAccountMode();
};

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cpf = onlyCpfDigits(accountCpf.value);
  if (!isValidCpf(cpf)) {
    clearSensitiveAccountData({ clearInput: false });
    consultAccountButton.disabled = false;
    showAccountMessage('Informe um CPF válido.', true);
    accountCpf.focus();
    return;
  }

  const requestSequence = ++accountRequestSequence;
  consultAccountButton.disabled = true;
  showAccountMessage('Consultando...');
  try {
    const account = await requestAccount(cpf);
    if (requestSequence !== accountRequestSequence || currentMode !== 'CONSULTA') return;
    renderAccount(account);
  } catch (error) {
    if (requestSequence !== accountRequestSequence || currentMode !== 'CONSULTA') return;
    clearSensitiveAccountData({ clearInput: false, invalidateRequest: false });
    showAccountMessage(error.message, true);
  } finally {
    if (requestSequence === accountRequestSequence) consultAccountButton.disabled = false;
  }
});

accountCpf.addEventListener('input', () => {
  if (accountResult.hidden) return;
  clearSensitiveAccountData({ clearInput: false });
  showAccountMessage();
});

cpfKeypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const currentDigits = onlyCpfDigits(accountCpf.value);
  const nextDigits = button.dataset.action === 'backspace'
    ? currentDigits.slice(0, -1)
    : `${currentDigits}${button.dataset.digit || ''}`.slice(0, 11);
  accountCpf.value = formatCpf(nextDigits);
  showAccountMessage();
  accountCpf.focus();
});

clearAccountButton.addEventListener('click', returnToInitialAccountScreen);

document.addEventListener('pointerdown', scheduleAccountExpiration);
document.addEventListener('keydown', scheduleAccountExpiration);

const updateClock = () => {
  const now = new Date();
  monitorTime.textContent = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  monitorDate.textContent = now.toLocaleDateString('pt-BR');
};

updateClock();
setInterval(updateClock, 1000);
showAccountMode();

const monitorEvents = new EventSource('/api/v1/monitor/events?terminal=CAIXA-01');
monitorEvents.addEventListener('monitor-state', (event) => {
  try {
    handleMonitorState(JSON.parse(event.data));
  } catch {
    showAccountMessage('Aguardando atualização do caixa...');
  }
});
