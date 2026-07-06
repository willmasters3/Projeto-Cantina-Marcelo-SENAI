import { formatFixedDecimal, parseFixedDecimal } from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const terminalCode = 'CAIXA-01';
const allowedStatuses = new Set(['IDLE', 'SALE_ACTIVE', 'SALE_COMPLETED', 'SALE_CANCELLED']);
const terminalStates = new Map();
const listenersByTerminal = new Map();
const resetTimers = new Map();

const idleState = () => ({
  terminal: terminalCode,
  status: 'IDLE',
  itens: [],
  subtotal: '0.0000',
  total: '0.0000',
  atualizado_em: new Date().toISOString()
});

const normalizeTerminal = (value) => {
  const normalized = String(value || terminalCode).trim().toUpperCase();
  if (normalized !== terminalCode) throw new HttpError(400, 'Terminal inválido');
  return normalized;
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
    const state = { ...idleState(), terminal, status };
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
  return terminalStates.get(terminal) || idleState();
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

export default { getState, normalizeTerminal, publishState, subscribe };
