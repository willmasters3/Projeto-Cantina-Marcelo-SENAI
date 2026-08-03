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
const pairingScreen = document.getElementById('pairingScreen');
const pairingForm = document.getElementById('pairingForm');
const pairingToken = document.getElementById('pairingToken');
const pairingButton = document.getElementById('pairingButton');
const pairingMessage = document.getElementById('pairingMessage');
const pairingStatus = document.getElementById('pairingStatus');
const pairedTerminal = document.getElementById('pairedTerminal');
const fullscreenPrompt = document.getElementById('fullscreenPrompt');
const fullscreenButton = document.getElementById('fullscreenButton');

const accountTimeoutMilliseconds = 30_000;
const pairingStorageKey = 'cantina.monitor.pairing';
let accountTimeout = null;
let accountRequestSequence = 0;
let currentMode = 'CONSULTA';
let monitorEvents = null;
let activePairing = null;

const updateFullscreenPrompt = () => {
  fullscreenPrompt.hidden = !activePairing || Boolean(document.fullscreenElement);
};

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

const showPairingMessage = (message = '', isError = false) => {
  pairingMessage.textContent = message;
  pairingMessage.className = message
    ? `monitor-message ${isError ? 'error' : 'success'}`
    : 'monitor-message';
};

const normalizePairingToken = (value) => String(value || '')
  .replace(/\s+/g, '')
  .trim()
  .toUpperCase();

const savePairing = (pairing) => {
  try {
    sessionStorage.setItem(pairingStorageKey, JSON.stringify({
      terminal: pairing.terminal,
      token: pairing.token
    }));
  } catch {
    // sessionStorage may be blocked in kiosk browsers; pairing still works for the current page.
  }
};

const loadStoredPairing = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(pairingStorageKey) || 'null');
    if (!stored?.token || !stored?.terminal) return null;
    const token = normalizePairingToken(stored.token);
    if (!/^[A-Z0-9]{6,8}$/.test(token)) return null;
    return { terminal: String(stored.terminal).trim().toUpperCase(), token };
  } catch {
    return null;
  }
};

const clearStoredPairing = () => {
  try {
    sessionStorage.removeItem(pairingStorageKey);
  } catch {
    // Ignore storage cleanup failures; the server-side token still expires shortly.
  }
};

const requestMonitorFullscreen = async () => {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return false;
  try {
    await document.documentElement.requestFullscreen();
    updateFullscreenPrompt();
    return true;
  } catch {
    updateFullscreenPrompt();
    return false;
  }
};

const exitMonitorFullscreen = async () => {
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  try {
    await document.exitFullscreen();
  } catch {
    // Browser may deny the exit request; the user can still press Esc if a keyboard exists.
  } finally {
    updateFullscreenPrompt();
  }
};

const requestPairing = async (token, { force = false } = {}) => {
  const response = await fetch('/api/v1/monitor/pair', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token, force })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || 'Não foi possível conectar o monitor.');
    error.status = response.status;
    error.code = payload?.code || null;
    throw error;
  }
  return payload.data;
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

const renderPairingState = () => {
  const isSaleMode = currentMode === 'COMPRA_EM_ANDAMENTO';
  const isPaired = Boolean(activePairing);
  pairingScreen.hidden = isPaired || isSaleMode;
  pairingStatus.hidden = !isPaired || isSaleMode;
  if (isPaired) pairedTerminal.textContent = activePairing.terminal;
};

const showAccountMode = () => {
  currentMode = 'CONSULTA';
  accountScreen.hidden = false;
  saleScreen.hidden = true;
  monitorHint.hidden = false;
  monitorModeLabel.textContent = 'Consulta de conta';
  renderPairingState();
  returnToInitialAccountScreen();
};

const showSaleMode = () => {
  currentMode = 'COMPRA_EM_ANDAMENTO';
  clearSensitiveAccountData();
  showAccountMessage();
  accountScreen.hidden = true;
  saleScreen.hidden = false;
  pairingScreen.hidden = true;
  pairingStatus.hidden = true;
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

const closeMonitorEvents = () => {
  if (!monitorEvents) return;
  monitorEvents.close();
  monitorEvents = null;
};

const disconnectMonitor = (message = 'Monitor desconectado.', isError = true) => {
  closeMonitorEvents();
  clearStoredPairing();
  activePairing = null;
  updateFullscreenPrompt();
  showAccountMode();
  renderPairingState();
  showPairingMessage(message, isError);
  pairingToken.focus();
};

const connectMonitorEvents = (pairing) => {
  closeMonitorEvents();
  activePairing = pairing;
  savePairing(pairing);
  renderPairingState();
  updateFullscreenPrompt();
  showPairingMessage(`Monitor vinculado ao ${pairing.terminal}.`);
  const params = new URLSearchParams({ token: pairing.token });
  monitorEvents = new EventSource(`/api/v1/monitor/events?${params.toString()}`);
  monitorEvents.addEventListener('monitor-state', (event) => {
    try {
      handleMonitorState(JSON.parse(event.data));
    } catch {
      showPairingMessage('Aguardando atualização do caixa...');
    }
  });
  monitorEvents.addEventListener('monitor-disconnected', (event) => {
    let reason = null;
    try {
      reason = JSON.parse(event.data)?.reason || null;
    } catch {
      reason = null;
    }
    const message = reason === 'CASH_CLOSED'
      ? 'O caixa foi fechado. Informe uma nova chave quando houver novo atendimento.'
      : 'A conexão deste monitor foi transferida para outra tela.';
    disconnectMonitor(message, true);
  });
  monitorEvents.onerror = () => {
    if (!activePairing) return;
    showPairingMessage('Tentando restabelecer a conexão com o caixa...', true);
  };
};

pairingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = normalizePairingToken(pairingToken.value);
  pairingToken.value = token;
  if (!/^[A-Z0-9]{6,8}$/.test(token)) {
    showPairingMessage('Informe a chave exibida no caixa.', true);
    pairingToken.focus();
    return;
  }

  pairingButton.disabled = true;
  const enteredFullscreen = await requestMonitorFullscreen();
  showPairingMessage('Conectando...');
  try {
    const pairing = await requestPairing(token);
    connectMonitorEvents(pairing);
  } catch (error) {
    if (error.status === 409 && error.code === 'MONITOR_ALREADY_CONNECTED') {
      const shouldTransfer = window.confirm(
        'Já existe um monitor conectado a este caixa. Deseja transferir a conexão para este novo monitor?'
      );
      if (shouldTransfer) {
        try {
          const pairing = await requestPairing(token, { force: true });
          connectMonitorEvents(pairing);
          return;
        } catch (transferError) {
          if (enteredFullscreen) await exitMonitorFullscreen();
          showPairingMessage(transferError.message, true);
          return;
        }
      }
      if (enteredFullscreen) await exitMonitorFullscreen();
      showPairingMessage('Conexão mantida no monitor atual.');
      return;
    }
    if (enteredFullscreen) await exitMonitorFullscreen();
    showPairingMessage(error.message, true);
  } finally {
    pairingButton.disabled = false;
  }
});

pairingToken.addEventListener('input', () => {
  pairingToken.value = normalizePairingToken(pairingToken.value).slice(0, 8);
  showPairingMessage();
});

fullscreenButton.addEventListener('click', () => {
  void requestMonitorFullscreen();
});

document.addEventListener('fullscreenchange', updateFullscreenPrompt);

const restoreStoredPairing = async () => {
  const storedPairing = loadStoredPairing();
  if (!storedPairing) {
    pairingToken.focus();
    return;
  }

  pairingToken.value = storedPairing.token;
  pairingButton.disabled = true;
  showPairingMessage('Reconectando monitor...');
  try {
    const pairing = await requestPairing(storedPairing.token, { force: true });
    connectMonitorEvents(pairing);
    await requestMonitorFullscreen();
  } catch {
    clearStoredPairing();
    activePairing = null;
    showAccountMode();
    showPairingMessage('Não foi possível reconectar. Informe a nova chave do caixa.', true);
    pairingToken.focus();
  } finally {
    pairingButton.disabled = false;
  }
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
updateFullscreenPrompt();
void restoreStoredPairing();
