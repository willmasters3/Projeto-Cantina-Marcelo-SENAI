import crypto from 'node:crypto';
import stockRepository from '../repositories/stockRepository.js';
import {
  formatFixedDecimal,
  parseFixedDecimal
} from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const adjustmentTypes = new Map([
  ['perda', 'Perda'],
  ['vencimento', 'Vencimento'],
  ['consumo_interno', 'Consumo interno'],
  ['erro_contagem', 'Erro de contagem'],
  ['correcao', 'Correção']
]);

const normalizeId = (value, fieldName) => {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} inválido`);
  }
  return normalized;
};

const normalizeOptionalId = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  return normalizeId(value, fieldName);
};

const normalizeDecimal = (value, fieldName, { allowZero = false } = {}) => {
  try {
    const units = parseFixedDecimal(value);
    if (allowZero ? units < 0n : units <= 0n) {
      throw new HttpError(
        400,
        allowZero ? `${fieldName} não pode ser negativo` : `${fieldName} inválida`
      );
    }
    return units;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, `${fieldName} inválida`);
  }
};

const normalizeOptionalMoney = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  return normalizeDecimal(value, fieldName, { allowZero: true });
};

const normalizeOptionalText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `Texto deve ter no máximo ${maxLength} caracteres`);
  }
  return normalized;
};

const normalizeStatusFilter = (value) => {
  const normalized = String(value ?? 'all').trim().toLowerCase();
  if (['all', 'ok', 'low', 'out'].includes(normalized)) return normalized;
  throw new HttpError(400, 'Status de estoque inválido');
};

const normalizeLimit = (value, fallback, max) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(Math.max(Math.trunc(normalized), 1), max);
};

const formatMovementReason = (type, reason) => {
  const typeLabel = adjustmentTypes.get(type);
  return typeLabel ? `${typeLabel}: ${reason}` : reason;
};

const listSummary = async () => stockRepository.getSummary();

const listProducts = async (filters = {}) => stockRepository.findProducts({
  search: String(filters.search ?? '').trim(),
  categoryId: normalizeOptionalId(filters.categoryId, 'Categoria'),
  supplierId: normalizeOptionalId(filters.supplierId, 'Fornecedor'),
  status: normalizeStatusFilter(filters.status),
  limit: normalizeLimit(filters.limit, 200, 500)
});

const listMovements = async ({ limit } = {}) => (
  stockRepository.findMovements(normalizeLimit(limit, 20, 100))
);

const listLowStockProducts = async ({ limit } = {}) => (
  stockRepository.findLowStockProducts(normalizeLimit(limit, 8, 50))
);

const createStockEntry = async (payload, user) => {
  const productId = normalizeId(payload.produto_id, 'Produto');
  const supplierId = normalizeOptionalId(payload.supplier_id, 'Fornecedor');
  const quantity = normalizeDecimal(payload.quantidade, 'Quantidade');
  const unitCost = normalizeOptionalMoney(payload.custo_unitario, 'Custo unitário');
  const reason = normalizeOptionalText(payload.motivo, 500);

  return stockRepository.withTransaction(async (connection) => {
    const product = await stockRepository.lockProductById(productId, connection);
    if (!product) throw new HttpError(404, 'Produto não encontrado.');
    if (!product.ativo) throw new HttpError(409, 'Produto inativo.');

    if (supplierId) {
      const supplier = await stockRepository.findSupplierById(supplierId, connection);
      if (!supplier) throw new HttpError(404, 'Fornecedor não encontrado.');
      if (!supplier.ativo) throw new HttpError(409, 'Fornecedor inativo.');
    }

    const stockBefore = parseFixedDecimal(product.estoque_atual);
    const stockAfter = stockBefore + quantity;
    const stockAfterValue = formatFixedDecimal(stockAfter);

    await stockRepository.updateProductAfterEntry(productId, {
      stockAfter: stockAfterValue,
      unitCost: unitCost === null ? null : formatFixedDecimal(unitCost),
      supplierId
    }, connection);

    const movementId = await stockRepository.createStockMovement({
      productId,
      supplierId,
      saleId: null,
      saleItemId: null,
      originalMovementId: null,
      nature: 'ENTRADA',
      origin: 'ENTRADA_ESTOQUE',
      quantity: formatFixedDecimal(quantity),
      stockBefore: formatFixedDecimal(stockBefore),
      stockAfter: stockAfterValue,
      reason,
      idempotencyKey: `stock-entry-${productId}-${crypto.randomUUID()}`,
      userId: user.id
    }, connection);

    return {
      movement_id: movementId,
      produto_id: Number(productId),
      estoque_antes: formatFixedDecimal(stockBefore),
      estoque_depois: stockAfterValue
    };
  });
};

const createStockAdjustment = async (payload, user) => {
  const productId = normalizeId(payload.produto_id, 'Produto');
  const finalStock = normalizeDecimal(payload.estoque_final, 'Estoque final', { allowZero: true });
  const type = String(payload.tipo_ajuste ?? '').trim().toLowerCase();
  if (!adjustmentTypes.has(type)) {
    throw new HttpError(400, 'Tipo de ajuste inválido');
  }

  const reason = normalizeOptionalText(payload.motivo, 500);
  if (!reason) throw new HttpError(400, 'Motivo obrigatório para ajuste.');

  return stockRepository.withTransaction(async (connection) => {
    const product = await stockRepository.lockProductById(productId, connection);
    if (!product) throw new HttpError(404, 'Produto não encontrado.');
    if (!product.ativo) throw new HttpError(409, 'Produto inativo.');

    const stockBefore = parseFixedDecimal(product.estoque_atual);
    if (stockBefore === finalStock) {
      return {
        alterado: false,
        mensagem: 'Não houve alteração no estoque.'
      };
    }

    const nature = finalStock > stockBefore ? 'ENTRADA' : 'SAIDA';
    const quantity = finalStock > stockBefore
      ? finalStock - stockBefore
      : stockBefore - finalStock;
    const finalStockValue = formatFixedDecimal(finalStock);

    await stockRepository.updateProductStock(productId, finalStockValue, connection);

    const movementId = await stockRepository.createStockMovement({
      productId,
      supplierId: null,
      saleId: null,
      saleItemId: null,
      originalMovementId: null,
      nature,
      origin: 'AJUSTE',
      quantity: formatFixedDecimal(quantity),
      stockBefore: formatFixedDecimal(stockBefore),
      stockAfter: finalStockValue,
      reason: formatMovementReason(type, reason),
      idempotencyKey: `stock-adjustment-${productId}-${crypto.randomUUID()}`,
      userId: user.id
    }, connection);

    return {
      alterado: true,
      movement_id: movementId,
      produto_id: Number(productId),
      natureza: nature,
      quantidade: formatFixedDecimal(quantity),
      estoque_antes: formatFixedDecimal(stockBefore),
      estoque_depois: finalStockValue
    };
  });
};

export default {
  createStockAdjustment,
  createStockEntry,
  listLowStockProducts,
  listMovements,
  listProducts,
  listSummary
};
