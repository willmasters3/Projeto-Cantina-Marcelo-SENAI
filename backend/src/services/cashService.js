import crypto from 'node:crypto';
import authConfig from '../config/auth.js';
import cashRepository from '../repositories/cashRepository.js';
import monitorStateService from './monitorStateService.js';
import {
  decimalFactor,
  formatFixedDecimal,
  multiplyFixedDecimal,
  parseFixedDecimal
} from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const terminalCode = 'CAIXA-01';
const allowedPaymentMethods = new Set(['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTROS']);
const maximumStoredAmount = 999999999999999n;

const normalizeOptionalText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `Texto deve ter no máximo ${maxLength} caracteres`);
  }
  return normalized;
};

const normalizeId = (value, fieldName) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized) || BigInt(normalized) === 0n) {
    throw new HttpError(400, `${fieldName} inválido`);
  }
  return normalized;
};

const normalizeQuantity = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new HttpError(400, 'A quantidade deve ser um número inteiro');
  }
  const quantity = BigInt(normalized);
  if (quantity <= 0n || quantity > 999999n) {
    throw new HttpError(400, 'A quantidade deve ser maior que zero');
  }
  return quantity;
};

const normalizeAmount = (value, fieldName, { allowZero = false } = {}) => {
  if (typeof value !== 'string' && typeof value !== 'bigint') {
    throw new HttpError(400, `${fieldName} deve ser enviado em formato decimal`);
  }
  try {
    const units = parseFixedDecimal(value);
    if (allowZero ? units < 0n : units <= 0n) {
      throw new HttpError(400, `${fieldName} deve ser ${allowZero ? 'zero ou positivo' : 'maior que zero'}`);
    }
    if (units > maximumStoredAmount) {
      throw new HttpError(400, `${fieldName} excede o limite permitido`);
    }
    return units;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, `${fieldName} inválido`);
  }
};

const addExpectedAmount = async (session, executor = undefined) => {
  if (!session) return null;
  const expected = await cashRepository.calculateExpectedCash(session.id, executor);
  return { ...session, valor_esperado_atual: expected };
};

const getCurrentSession = async () => {
  const session = await cashRepository.findOpenSession(terminalCode);
  return addExpectedAmount(session);
};

const openSession = async (payload, user) => {
  const openingAmount = normalizeAmount(
    payload.valor_abertura ?? '0',
    'Valor de abertura',
    { allowZero: true }
  );
  const notes = normalizeOptionalText(payload.observacoes);

  try {
    const sessionId = await cashRepository.createSession({
      terminalCode,
      userId: user.id,
      openingAmount: formatFixedDecimal(openingAmount),
      notes
    });
    return cashRepository.findSessionById(sessionId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Já existe um caixa aberto neste terminal');
    }
    throw error;
  }
};

const createMonitorPairing = async (payload = {}) => {
  const session = await cashRepository.findOpenSession(terminalCode);
  if (!session) {
    throw new HttpError(409, 'Abra o caixa antes de abrir o Monitor da Cantina');
  }

  const sessionTerminal = monitorStateService.normalizeTerminal(
    session.terminal_codigo || terminalCode
  );
  const requestedTerminal = monitorStateService.normalizeTerminal(
    payload?.terminal || sessionTerminal
  );
  if (requestedTerminal !== sessionTerminal) {
    throw new HttpError(409, 'A chave deve ser gerada para o caixa em operação');
  }

  return monitorStateService.createPairingToken(sessionTerminal);
};

const closeSession = async (payload, user) => {
  const informedAmount = normalizeAmount(
    payload.valor_fechamento_informado,
    'Valor informado no fechamento',
    { allowZero: true }
  );
  const differenceReason = normalizeOptionalText(payload.justificativa_diferenca);
  const notes = normalizeOptionalText(payload.observacoes);

  try {
    const closedSession = await cashRepository.withTransaction(async (connection) => {
      const session = await cashRepository.findOpenSession(terminalCode, connection, true);
      if (!session) throw new HttpError(409, 'Não existe caixa aberto para fechamento');

      const expectedValue = await cashRepository.calculateExpectedCash(session.id, connection);
      const expectedAmount = parseFixedDecimal(expectedValue);
      const difference = informedAmount - expectedAmount;
      if (difference !== 0n && !differenceReason) {
        throw new HttpError(400, 'Informe uma justificativa para a diferença de caixa');
      }

      const affectedRows = await cashRepository.closeSession(session.id, {
        userId: user.id,
        expectedAmount: formatFixedDecimal(expectedAmount),
        informedAmount: formatFixedDecimal(informedAmount),
        differenceReason,
        notes
      }, connection);
      if (!affectedRows) throw new HttpError(409, 'O caixa já foi fechado');
      return cashRepository.findSessionById(session.id, connection);
    });
    monitorStateService.releaseTerminal(terminalCode);
    return closedSession;
  } catch (error) {
    const isUnsignedDifferenceError = error?.code === 'ER_DATA_OUT_OF_RANGE'
      && /valor_fechamento_informado.*valor_fechamento_esperado/.test(String(error.message));
    if (isUnsignedDifferenceError) {
      throw new HttpError(
        409,
        'Não foi possível registrar a diferença negativa. A estrutura do caixa precisa ser corrigida pelo administrador.'
      );
    }
    throw error;
  }
};

const getProductByBarcode = async (barcode) => {
  const normalized = String(barcode ?? '').trim();
  if (!normalized) throw new HttpError(400, 'Código de barras é obrigatório');
  const product = await cashRepository.findProductByBarcode(normalized);
  if (!product) throw new HttpError(404, 'Produto ativo não encontrado');
  return product;
};

const searchProducts = async (search) => {
  const normalized = String(search ?? '').trim();
  return cashRepository.searchProducts(normalized);
};

const searchClients = async (search) => {
  const normalized = String(search ?? '').trim();
  if (normalized.length < 2) return [];
  return cashRepository.searchActiveClients(normalized);
};

const normalizeItems = (items, saleType) => {
  if (!Array.isArray(items) || !items.length) {
    throw new HttpError(400, 'Adicione pelo menos um item ao carrinho');
  }

  const productItems = new Map();
  const miscellaneousItems = [];

  items.forEach((item) => {
    const itemType = String(item?.tipo_item ?? '').trim().toUpperCase();
    const quantity = normalizeQuantity(item?.quantidade);

    if (itemType === 'PRODUTO') {
      const productId = normalizeId(item.produto_id, 'Produto');
      const current = productItems.get(productId);
      if (current) {
        current.quantity += quantity;
      } else {
        productItems.set(productId, { productId, quantity });
      }
      return;
    }

    if (itemType !== 'DIVERSOS') {
      throw new HttpError(400, 'Tipo de item inválido');
    }

    const description = normalizeOptionalText(item.descricao, 255);
    if (saleType === 'FIADO' && !description) {
      throw new HttpError(400, 'A descrição do item Diversos é obrigatória na venda fiado');
    }
    const unitPrice = normalizeAmount(item.preco_unitario, 'Valor do item Diversos');
    miscellaneousItems.push({ description, quantity, unitPrice });
  });

  return { productItems: [...productItems.values()], miscellaneousItems };
};

const normalizePayment = (payment) => {
  if (!payment || typeof payment !== 'object') {
    throw new HttpError(400, 'Selecione uma forma de pagamento');
  }
  const method = String(payment.forma_pagamento ?? '').trim().toUpperCase();
  if (!allowedPaymentMethods.has(method)) {
    throw new HttpError(400, 'Forma de pagamento inválida');
  }
  return {
    method,
    externalProvider: normalizeOptionalText(payment.provedor_externo, 100),
    externalId: normalizeOptionalText(payment.identificador_externo, 150),
    nsu: normalizeOptionalText(payment.nsu, 100),
    authorizationCode: normalizeOptionalText(payment.codigo_autorizacao, 100),
    transactionReference: normalizeOptionalText(payment.referencia_transacao, 150)
  };
};

const createSale = async (payload, user) => {
  const saleType = String(payload.tipo_venda ?? '').trim().toUpperCase();
  if (!['A_VISTA', 'FIADO'].includes(saleType)) {
    throw new HttpError(400, 'Tipo de venda inválido');
  }

  const normalizedItems = normalizeItems(payload.itens, saleType);
  const clientId = saleType === 'FIADO'
    ? normalizeId(payload.cliente_id, 'Cliente')
    : null;
  const payment = saleType === 'A_VISTA' ? normalizePayment(payload.pagamento) : null;
  const notes = normalizeOptionalText(payload.observacoes);

  return cashRepository.withTransaction(async (connection) => {
    const session = await cashRepository.findOpenSession(terminalCode, connection, true);
    if (!session) throw new HttpError(409, 'Abra o caixa antes de finalizar uma venda');

    let client = null;
    if (saleType === 'FIADO') {
      client = await cashRepository.lockClientById(clientId, connection);
      if (!client) throw new HttpError(404, 'Cliente não encontrado');
      if (!client.ativo) throw new HttpError(409, 'Cliente inativo não pode realizar nova venda fiado');
    }

    const productIds = normalizedItems.productItems
      .map((item) => item.productId)
      .sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
    const products = await cashRepository.lockProductsByIds(productIds, connection);
    const productsById = new Map(products.map((product) => [String(product.id), product]));

    let subtotal = 0n;
    const preparedItems = [];

    normalizedItems.productItems.forEach((item) => {
      const product = productsById.get(item.productId);
      if (!product || !product.ativo) {
        throw new HttpError(409, `O produto ${item.productId} não está disponível para venda`);
      }

      const stockBefore = parseFixedDecimal(product.estoque_atual);
      const requestedStock = item.quantity * decimalFactor;
      if (stockBefore < requestedStock) {
        throw new HttpError(
          409,
          `Estoque insuficiente para ${product.nome}. Disponível: ${product.estoque_atual}.`
        );
      }

      const unitPrice = parseFixedDecimal(product.preco_venda);
      const total = multiplyFixedDecimal(unitPrice, item.quantity);
      subtotal += total;
      preparedItems.push({
        itemType: 'PRODUTO',
        productId: String(product.id),
        description: product.nome,
        barcode: product.codigo_barras,
        quantity: item.quantity,
        unitPrice,
        unitCost: product.custo === null ? null : parseFixedDecimal(product.custo),
        total,
        movesStock: true,
        stockBefore,
        stockAfter: stockBefore - requestedStock
      });
    });

    normalizedItems.miscellaneousItems.forEach((item) => {
      const total = multiplyFixedDecimal(item.unitPrice, item.quantity);
      subtotal += total;
      preparedItems.push({
        itemType: 'DIVERSOS',
        productId: null,
        description: item.description,
        barcode: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: null,
        total,
        movesStock: false
      });
    });

    if (subtotal <= 0n) throw new HttpError(400, 'O total da venda deve ser maior que zero');
    if (subtotal > maximumStoredAmount) {
      throw new HttpError(400, 'O total da venda excede o limite permitido');
    }
    const totalAsDecimal = formatFixedDecimal(subtotal);

    const saleId = await cashRepository.createSale({
      sessionId: session.id,
      operatorId: user.id,
      clientId,
      saleType,
      subtotal: totalAsDecimal,
      total: totalAsDecimal,
      notes
    }, connection);

    for (const item of preparedItems) {
      const saleItemId = await cashRepository.createSaleItem({
        saleId,
        productId: item.productId,
        itemType: item.itemType,
        description: item.description,
        barcode: item.barcode,
        quantity: formatFixedDecimal(item.quantity * decimalFactor),
        unitPrice: formatFixedDecimal(item.unitPrice),
        unitCost: item.unitCost === null ? null : formatFixedDecimal(item.unitCost),
        total: formatFixedDecimal(item.total),
        movesStock: item.movesStock
      }, connection);

      if (item.movesStock) {
        await cashRepository.updateProductStock(
          item.productId,
          formatFixedDecimal(item.stockAfter),
          connection
        );
        await cashRepository.createStockMovement({
          productId: item.productId,
          saleId,
          saleItemId,
          originalMovementId: null,
          direction: 'SAIDA',
          origin: 'VENDA',
          quantity: formatFixedDecimal(item.quantity * decimalFactor),
          stockBefore: formatFixedDecimal(item.stockBefore),
          stockAfter: formatFixedDecimal(item.stockAfter),
          reason: `Venda #${saleId}`,
          idempotencyKey: `sale-stock-${saleId}-${saleItemId}`,
          userId: user.id
        }, connection);
      }
    }

    if (saleType === 'A_VISTA') {
      await cashRepository.createPayment({
        sessionId: session.id,
        saleId,
        clientId: null,
        originalPaymentId: null,
        operationType: 'PAGAMENTO',
        purpose: 'VENDA',
        method: payment.method,
        amount: totalAsDecimal,
        externalProvider: payment.externalProvider,
        externalId: payment.externalId,
        nsu: payment.nsu,
        authorizationCode: payment.authorizationCode,
        transactionReference: payment.transactionReference,
        idempotencyKey: `sale-payment-${saleId}-${crypto.randomUUID()}`,
        userId: user.id
      }, connection);
    } else {
      await cashRepository.createAccountEntry({
        clientId,
        saleId,
        paymentId: null,
        originalEntryId: null,
        direction: 'DEBITO',
        origin: 'VENDA_FIADO',
        amount: totalAsDecimal,
        description: `Venda fiado #${saleId}`,
        idempotencyKey: `sale-debt-${saleId}`,
        userId: user.id
      }, connection);
    }

    return cashRepository.findSaleById(saleId, connection);
  });
};

const listRecentSales = async () => cashRepository.listRecentSales(20);

const cancelSale = async (saleIdValue, payload, user) => {
  if (user?.role?.slug !== authConfig.roles.admin) {
    throw new HttpError(403, 'Somente administradores podem cancelar vendas');
  }
  const saleId = normalizeId(saleIdValue, 'Venda');
  const reason = normalizeOptionalText(payload.motivo, 500);
  if (!reason) throw new HttpError(400, 'Informe o motivo do cancelamento');

  return cashRepository.withTransaction(async (connection) => {
    const sale = await cashRepository.findSaleById(saleId, connection, true);
    if (!sale) throw new HttpError(404, 'Venda não encontrada');
    if (sale.status === 'CANCELADA') throw new HttpError(409, 'A venda já está cancelada');

    const stockMovements = await cashRepository.findSaleStockMovements(saleId, connection);
    const productIds = [...new Set(stockMovements.map((movement) => String(movement.produto_id)))]
      .sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
    const products = await cashRepository.lockProductsByIds(productIds, connection);
    const productsById = new Map(products.map((product) => [String(product.id), product]));

    for (const movement of stockMovements) {
      const product = productsById.get(String(movement.produto_id));
      if (!product) throw new HttpError(409, 'Produto da venda não foi encontrado para reversão');
      const stockBefore = parseFixedDecimal(product.estoque_atual);
      const quantity = parseFixedDecimal(movement.quantidade);
      const stockAfter = stockBefore + quantity;
      await cashRepository.updateProductStock(product.id, formatFixedDecimal(stockAfter), connection);
      await cashRepository.createStockMovement({
        productId: product.id,
        saleId,
        saleItemId: movement.sale_item_id,
        originalMovementId: movement.id,
        direction: 'ENTRADA',
        origin: 'CANCELAMENTO_VENDA',
        quantity: movement.quantidade,
        stockBefore: formatFixedDecimal(stockBefore),
        stockAfter: formatFixedDecimal(stockAfter),
        reason,
        idempotencyKey: `cancel-stock-${saleId}-${movement.id}`,
        userId: user.id
      }, connection);
    }

    const payments = await cashRepository.findConfirmedSalePayments(saleId, connection);
    for (const payment of payments) {
      await cashRepository.createPayment({
        sessionId: payment.cash_session_id,
        saleId,
        clientId: payment.cliente_id,
        originalPaymentId: payment.id,
        operationType: 'ESTORNO',
        purpose: payment.finalidade,
        method: payment.forma_pagamento,
        amount: payment.valor,
        externalProvider: null,
        externalId: null,
        nsu: null,
        authorizationCode: null,
        transactionReference: `Cancelamento da venda #${saleId}`,
        idempotencyKey: `cancel-payment-${saleId}-${payment.id}`,
        userId: user.id
      }, connection);
    }

    if (sale.tipo_venda === 'FIADO') {
      const debtEntry = await cashRepository.findSaleDebtEntry(saleId, connection);
      if (!debtEntry) throw new HttpError(409, 'Débito da venda fiado não foi encontrado');
      await cashRepository.createAccountEntry({
        clientId: sale.cliente_id,
        saleId,
        paymentId: null,
        originalEntryId: debtEntry.id,
        direction: 'CREDITO',
        origin: 'CANCELAMENTO_VENDA',
        amount: debtEntry.valor,
        description: `Cancelamento da venda fiado #${saleId}: ${reason}`,
        idempotencyKey: `cancel-debt-${saleId}-${debtEntry.id}`,
        userId: user.id
      }, connection);
    }

    const affectedRows = await cashRepository.cancelSale(saleId, user.id, reason, connection);
    if (!affectedRows) throw new HttpError(409, 'Não foi possível cancelar a venda');
    return cashRepository.findSaleById(saleId, connection);
  });
};

export default {
  cancelSale,
  closeSession,
  createMonitorPairing,
  createSale,
  getCurrentSession,
  getProductByBarcode,
  listRecentSales,
  openSession,
  searchClients,
  searchProducts
};
