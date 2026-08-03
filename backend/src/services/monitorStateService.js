import crypto from 'node:crypto';
import { formatFixedDecimal, parseFixedDecimal } from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const terminalCode = 'CAIXA-01';
const allowedStatuses = new Set(['IDLE', 'SALE_ACTIVE', 'SALE_COMPLETED', 'SALE_CANCELLED']);
const pairingAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const pairingTokenLength = 6;
const pairingTokenTtlMilliseconds = 10 * 60 * 1000;
const reconnectGraceMilliseconds = 60 * 1000;
const terminalStates = new Map();
const listenersByTerminal = new Map();
const resetTimers = new Map();
const pairingsByToken = new Map();
const pairingTokenByTerminal = new Map();
const activeMonitorByTerminal = new Map();

const idleState = (terminal = terminalCode) => ({
  terminal,
  status: 'IDLE',
  itens: [],
  subtotal: '0.0000',
  total: '0.0000',
  atualizado_em: new Date().toISOString()
});

const normalizeTerminal = (value) => {
  const normalized = String(value || terminalCode).trim().toUpperCase();
  if (!/^CAIXA-\d{2,}$/.test(normalized)) throw new HttpError(400, 'Terminal inválido');
  return normalized;
};

const normalizePairingToken = (value) => {
  const normalized = String(value || '').replace(/\s+/g, '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,8}$/.test(normalized)) {
    throw new HttpError(400, 'Chave do monitor inválida');
  }
  return normalized;
};

const removePairing = (token) => {
  const pairing = pairingsByToken.get(token);
  if (!pairing) return;
  pairingsByToken.delete(token);
  if (pairingTokenByTerminal.get(pairing.terminal) === token) {
    pairingTokenByTerminal.delete(pairing.terminal);
  }
};

const cleanupExpiredPairings = () => {
  const now = Date.now();
  pairingsByToken.forEach((pairing, token) => {
    if (pairing.expiresAt <= now && !activeMonitorByTerminal.has(pairing.terminal)) {
      removePairing(token);
    }
  });
};

const generateTokenValue = () => Array.from(
  { length: pairingTokenLength },
  () => pairingAlphabet[crypto.randomInt(pairingAlphabet.length)]
).join('');

const getPairingByToken = (tokenValue) => {
  cleanupExpiredPairings();
  const token = normalizePairingToken(tokenValue);
  const pairing = pairingsByToken.get(token);
  if (!pairing) {
    throw new HttpError(404, 'Chave do monitor inválida ou expirada');
  }
  return pairing;
};

const closeMonitorConnection = (terminal, reason) => {
  const activeMonitor = activeMonitorByTerminal.get(terminal);
  if (!activeMonitor) return;
  activeMonitorByTerminal.delete(terminal);
  activeMonitor.disconnect(reason);
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length > 100) {
    throw new HttpError(400, 'Itens do monitor inválidos');
  }

  return items.map((item) => {
    const descricao = String(item?.descricao || '').trim();
    const quantityText = String(item?.quantidade ?? '').trim();
    if (!descricao || descricao.length > 255 || !/^\d+$/.test(quantityText)) {
      throw new HttpError(400, 'Item do monitor inválido');
    }
    const quantidade = BigInt(quantityText);
    if (quantidade < 1n || quantidade > 999999n) {
      throw new HttpError(400, 'Quantidade do monitor inválida');
    }

    let unitPrice;
    try {
      unitPrice = parseFixedDecimal(item.preco_unitario);
    } catch {
      throw new HttpError(400, 'Preço do item do monitor inválido');
    }

    return {
      descricao,
      quantidade: quantityText,
      preco_unitario: formatFixedDecimal(unitPrice),
      total_item: formatFixedDecimal(unitPrice * quantidade)
    };
  });
};

const notify = (terminal, state) => {
  const listeners = listenersByTerminal.get(terminal);
  if (!listeners) return;
  listeners.forEach((listener) => listener(state));
};

const clearResetTimer = (terminal) => {
  const timer = resetTimers.get(terminal);
  if (timer) clearTimeout(timer);
  resetTimers.delete(terminal);
};

const publishState = (payload) => {
  const terminal = normalizeTerminal(payload?.terminal);
  const status = String(payload?.status || '').trim().toUpperCase();
  if (!allowedStatuses.has(status)) throw new HttpError(400, 'Estado do monitor inválido');

  clearResetTimer(terminal);
  if (status === 'IDLE' || status === 'SALE_CANCELLED') {
    const state = { ...idleState(terminal), status };
    terminalStates.set(terminal, state);
    notify(terminal, state);

    if (status === 'SALE_CANCELLED') {
      const timer = setTimeout(() => publishState({ terminal, status: 'IDLE' }), 800);
      timer.unref?.();
      resetTimers.set(terminal, timer);
    }
    return state;
  }

  const itens = normalizeItems(payload.itens);
  if (!itens.length) throw new HttpError(400, 'Venda ativa deve possuir itens');
  const total = itens.reduce(
    (sum, item) => sum + parseFixedDecimal(item.total_item),
    0n
  );
  const state = {
    terminal,
    status,
    itens,
    subtotal: formatFixedDecimal(total),
    total: formatFixedDecimal(total),
    atualizado_em: new Date().toISOString()
  };
  terminalStates.set(terminal, state);
  notify(terminal, state);

  if (status === 'SALE_COMPLETED') {
    const timer = setTimeout(() => publishState({ terminal, status: 'IDLE' }), 2500);
    timer.unref?.();
    resetTimers.set(terminal, timer);
  }
  return state;
};

const getState = (terminalValue = terminalCode) => {
  const terminal = normalizeTerminal(terminalValue);
  return terminalStates.get(terminal) || idleState(terminal);
};

const subscribe = (terminalValue, listener) => {
  const terminal = normalizeTerminal(terminalValue);
  const listeners = listenersByTerminal.get(terminal) || new Set();
  listeners.add(listener);
  listenersByTerminal.set(terminal, listeners);
  listener(getState(terminal));

  return () => {
    listeners.delete(listener);
    if (!listeners.size) listenersByTerminal.delete(terminal);
  };
};

const createPairingToken = (terminalValue = terminalCode) => {
  cleanupExpiredPairings();
  const terminal = normalizeTerminal(terminalValue);
  const previousToken = pairingTokenByTerminal.get(terminal);
  if (previousToken) removePairing(previousToken);

  let token = generateTokenValue();
  while (pairingsByToken.has(token)) token = generateTokenValue();

  const now = Date.now();
  const pairing = {
    token,
    terminal,
    createdAt: new Date(now).toISOString(),
    expiresAt: now + pairingTokenTtlMilliseconds,
    pairedAt: null
  };
  pairingsByToken.set(token, pairing);
  pairingTokenByTerminal.set(terminal, token);

  return {
    terminal,
    token,
    expira_em: new Date(pairing.expiresAt).toISOString(),
    expira_em_segundos: pairingTokenTtlMilliseconds / 1000
  };
};

const confirmPairing = (tokenValue, { force = false } = {}) => {
  const pairing = getPairingByToken(tokenValue);
  if (activeMonitorByTerminal.has(pairing.terminal)) {
    if (!force) {
      throw new HttpError(
        409,
        'Já existe um monitor conectado a este caixa',
        { code: 'MONITOR_ALREADY_CONNECTED' }
      );
    }
    closeMonitorConnection(pairing.terminal, 'TRANSFERRED');
  }

  pairing.pairedAt = pairing.pairedAt || new Date().toISOString();
  return {
    terminal: pairing.terminal,
    token: pairing.token,
    status: 'READY'
  };
};

const registerMonitorConnection = (tokenValue, disconnect) => {
  const pairing = getPairingByToken(tokenValue);
  if (activeMonitorByTerminal.has(pairing.terminal)) {
    throw new HttpError(
      409,
      'Já existe um monitor conectado a este caixa',
      { code: 'MONITOR_ALREADY_CONNECTED' }
    );
  }

  pairing.pairedAt = pairing.pairedAt || new Date().toISOString();
  pairing.expiresAt = Number.MAX_SAFE_INTEGER;
  const connectionId = crypto.randomUUID();
  activeMonitorByTerminal.set(pairing.terminal, {
    connectionId,
    token: pairing.token,
    disconnect
  });
  return { connectionId, terminal: pairing.terminal, token: pairing.token };
};

const unregisterMonitorConnection = (terminalValue, tokenValue, connectionId) => {
  const terminal = normalizeTerminal(terminalValue);
  const token = normalizePairingToken(tokenValue);
  const activeMonitor = activeMonitorByTerminal.get(terminal);
  if (activeMonitor?.token !== token || activeMonitor?.connectionId !== connectionId) return;
  activeMonitorByTerminal.delete(terminal);

  const pairing = pairingsByToken.get(token);
  if (pairing) pairing.expiresAt = Date.now() + reconnectGraceMilliseconds;
};

const releaseTerminal = (terminalValue = terminalCode) => {
  const terminal = normalizeTerminal(terminalValue);
  clearResetTimer(terminal);
  const state = idleState(terminal);
  terminalStates.set(terminal, state);
  notify(terminal, state);
  closeMonitorConnection(terminal, 'CASH_CLOSED');

  const token = pairingTokenByTerminal.get(terminal);
  if (token) removePairing(token);
};

const resetForTests = () => {
  [...resetTimers.keys()].forEach(clearResetTimer);
  terminalStates.clear();
  listenersByTerminal.clear();
  pairingsByToken.clear();
  pairingTokenByTerminal.clear();
  activeMonitorByTerminal.clear();
};

export default {
  confirmPairing,
  createPairingToken,
  getState,
  normalizePairingToken,
  normalizeTerminal,
  publishState,
  registerMonitorConnection,
  releaseTerminal,
  resetForTests,
  subscribe,
  unregisterMonitorConnection
};
