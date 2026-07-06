import { pool } from '../config/database.js';

const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findOpenSession = async (terminalCode, executor = pool, forUpdate = false) => {
  const [rows] = await executor.query(
    `SELECT
       cs.id,
       cs.terminal_codigo,
       cs.usuario_abertura_id,
       u.nome AS usuario_abertura_nome,
       cs.status,
       cs.valor_abertura,
       cs.aberto_em,
       cs.observacoes_abertura
     FROM cash_sessions cs
     INNER JOIN users u ON u.id = cs.usuario_abertura_id
     WHERE cs.terminal_codigo = ?
       AND cs.status = 'ABERTA'
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [terminalCode]
  );
  return rows[0] || null;
};

const createSession = async (session, executor = pool) => {
  const [result] = await executor.query(
    `INSERT INTO cash_sessions
       (terminal_codigo, usuario_abertura_id, valor_abertura, observacoes_abertura)
     VALUES (?, ?, ?, ?)`,
    [
      session.terminalCode,
      session.userId,
      session.openingAmount,
      session.notes
    ]
  );
  return result.insertId;
};

const calculateExpectedCash = async (sessionId, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT
       cs.valor_abertura
       + COALESCE(SUM(
           CASE
             WHEN p.id IS NULL THEN 0
             WHEN p.tipo_operacao = 'PAGAMENTO' THEN p.valor
             ELSE -p.valor
           END
         ), 0) AS valor_esperado
     FROM cash_sessions cs
     LEFT JOIN payments p
       ON p.cash_session_id = cs.id
      AND p.forma_pagamento = 'DINHEIRO'
      AND p.status = 'CONFIRMADO'
     WHERE cs.id = ?
     GROUP BY cs.id, cs.valor_abertura`,
    [sessionId]
  );
  return rows[0]?.valor_esperado ?? null;
};

const closeSession = async (id, closing, executor = pool) => {
  const [result] = await executor.query(
    `UPDATE cash_sessions
     SET status = 'FECHADA',
         usuario_fechamento_id = ?,
         valor_fechamento_esperado = ?,
         valor_fechamento_informado = ?,
         justificativa_diferenca = ?,
         observacoes_fechamento = ?,
         fechado_em = CURRENT_TIMESTAMP(6)
     WHERE id = ?
       AND status = 'ABERTA'`,
    [
      closing.userId,
      closing.expectedAmount,
      closing.informedAmount,
      closing.differenceReason,
      closing.notes,
      id
    ]
  );
  return result.affectedRows;
};

const findSessionById = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT
       cs.*,
       ua.nome AS usuario_abertura_nome,
       uf.nome AS usuario_fechamento_nome
     FROM cash_sessions cs
     INNER JOIN users ua ON ua.id = cs.usuario_abertura_id
     LEFT JOIN users uf ON uf.id = cs.usuario_fechamento_id
     WHERE cs.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findProductByBarcode = async (barcode, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT
       p.id, p.codigo_barras, p.nome, p.preco_venda, p.custo,
       p.estoque_atual, p.ativo, pi.caminho_publico AS imagem_url
     FROM products p
     LEFT JOIN product_images pi
       ON pi.produto_id = p.id
      AND pi.imagem_principal = 1
      AND pi.removida_em IS NULL
     WHERE p.codigo_barras = ?
       AND p.ativo = 1
     LIMIT 1`,
    [barcode]
  );
  return rows[0] || null;
};

const searchProducts = async (search, executor = pool) => {
  const term = `%${search}%`;
  const [rows] = await executor.query(
    `SELECT
       p.id, p.codigo_barras, p.nome, p.preco_venda, p.custo,
       p.estoque_atual, p.ativo, pi.caminho_publico AS imagem_url
     FROM products p
     LEFT JOIN product_images pi
       ON pi.produto_id = p.id
      AND pi.imagem_principal = 1
      AND pi.removida_em IS NULL
     WHERE p.ativo = 1
       AND (p.nome LIKE ? OR p.codigo_barras LIKE ?)
     ORDER BY p.nome ASC
     LIMIT 20`,
    [term, term]
  );
  return rows;
};

const searchActiveClients = async (search, executor = pool) => {
  const term = `%${search}%`;
  const digits = search.replace(/\D/g, '');
  const isCpfLikeSearch = digits && /^[\d.\-\s]+$/.test(search);
  const cpfTerm = `%${isCpfLikeSearch ? digits : search}%`;
  const [rows] = await executor.query(
    `SELECT id, nome, matricula, telefone, codigo, ativo
     FROM clients
     WHERE ativo = 1
       AND (
         nome LIKE ?
         OR matricula LIKE ?
         OR telefone LIKE ?
         OR codigo LIKE ?
         OR cpf LIKE ?
       )
     ORDER BY nome ASC
     LIMIT 20`,
    [term, term, term, term, cpfTerm]
  );
  return rows;
};

const lockClientById = async (id, executor) => {
  const [rows] = await executor.query(
    `SELECT id, nome, codigo, ativo
     FROM clients
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
};

const lockProductsByIds = async (ids, executor) => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await executor.query(
    `SELECT id, codigo_barras, nome, preco_venda, custo, estoque_atual, ativo
     FROM products
     WHERE id IN (${placeholders})
     ORDER BY id ASC
     FOR UPDATE`,
    ids
  );
  return rows;
};

const createSale = async (sale, executor) => {
  const [result] = await executor.query(
    `INSERT INTO sales
       (cash_session_id, operador_id, cliente_id, tipo_venda, subtotal,
        desconto, acrescimo, total, observacoes)
     VALUES (?, ?, ?, ?, ?, 0.0000, 0.0000, ?, ?)`,
    [
      sale.sessionId,
      sale.operatorId,
      sale.clientId,
      sale.saleType,
      sale.subtotal,
      sale.total,
      sale.notes
    ]
  );
  return result.insertId;
};

const createSaleItem = async (item, executor) => {
  const [result] = await executor.query(
    `INSERT INTO sale_items
       (sale_id, produto_id, tipo_item, descricao, codigo_barras, quantidade,
        preco_unitario, custo_unitario, desconto, total_item, movimenta_estoque)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?)`,
    [
      item.saleId,
      item.productId,
      item.itemType,
      item.description,
      item.barcode,
      item.quantity,
      item.unitPrice,
      item.unitCost,
      item.total,
      item.movesStock ? 1 : 0
    ]
  );
  return result.insertId;
};

const updateProductStock = async (productId, stock, executor) => {
  const [result] = await executor.query(
    `UPDATE products
     SET estoque_atual = ?, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [stock, productId]
  );
  return result.affectedRows;
};

const createStockMovement = async (movement, executor) => {
  const [result] = await executor.query(
    `INSERT INTO stock_movements
       (produto_id, sale_id, sale_item_id, movimento_original_id, natureza,
        origem, quantidade, estoque_antes, estoque_depois, motivo,
        chave_idempotencia, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.productId,
      movement.saleId,
      movement.saleItemId,
      movement.originalMovementId,
      movement.direction,
      movement.origin,
      movement.quantity,
      movement.stockBefore,
      movement.stockAfter,
      movement.reason,
      movement.idempotencyKey,
      movement.userId
    ]
  );
  return result.insertId;
};

const createPayment = async (payment, executor) => {
  const [result] = await executor.query(
    `INSERT INTO payments
       (cash_session_id, sale_id, cliente_id, pagamento_original_id,
        tipo_operacao, finalidade, forma_pagamento, status, valor,
        provedor_externo, identificador_externo, nsu, codigo_autorizacao,
        referencia_transacao, chave_idempotencia, usuario_registro_id,
        usuario_confirmacao_id, confirmado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMADO', ?, ?, ?, ?, ?, ?, ?, ?, ?,
             CURRENT_TIMESTAMP(6))`,
    [
      payment.sessionId,
      payment.saleId,
      payment.clientId,
      payment.originalPaymentId,
      payment.operationType,
      payment.purpose,
      payment.method,
      payment.amount,
      payment.externalProvider,
      payment.externalId,
      payment.nsu,
      payment.authorizationCode,
      payment.transactionReference,
      payment.idempotencyKey,
      payment.userId,
      payment.userId
    ]
  );
  return result.insertId;
};

const createAccountEntry = async (entry, executor) => {
  const [result] = await executor.query(
    `INSERT INTO customer_account_entries
       (cliente_id, sale_id, payment_id, lancamento_original_id, natureza,
        origem, valor, descricao, chave_idempotencia, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.clientId,
      entry.saleId,
      entry.paymentId,
      entry.originalEntryId,
      entry.direction,
      entry.origin,
      entry.amount,
      entry.description,
      entry.idempotencyKey,
      entry.userId
    ]
  );
  return result.insertId;
};

const findSaleById = async (id, executor = pool, forUpdate = false) => {
  const [rows] = await executor.query(
    `SELECT
       s.id, s.cash_session_id, s.operador_id, s.cliente_id, s.tipo_venda,
       s.status, s.subtotal, s.desconto, s.acrescimo, s.total,
       s.observacoes, s.confirmada_em, s.cancelada_em, s.motivo_cancelamento,
       c.nome AS cliente_nome, u.nome AS operador_nome
     FROM sales s
     LEFT JOIN clients c ON c.id = s.cliente_id
     INNER JOIN users u ON u.id = s.operador_id
     WHERE s.id = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
};

const listRecentSales = async (limit = 20, executor = pool) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [rows] = await executor.query(
    `SELECT
       s.id, s.tipo_venda, s.status, s.total, s.confirmada_em,
       s.cancelada_em, s.motivo_cancelamento,
       c.nome AS cliente_nome,
       u.nome AS operador_nome,
       (
         SELECT GROUP_CONCAT(DISTINCT p.forma_pagamento ORDER BY p.id SEPARATOR ', ')
         FROM payments p
         WHERE p.sale_id = s.id
           AND p.tipo_operacao = 'PAGAMENTO'
           AND p.status = 'CONFIRMADO'
       ) AS formas_pagamento
     FROM sales s
     LEFT JOIN clients c ON c.id = s.cliente_id
     INNER JOIN users u ON u.id = s.operador_id
     ORDER BY s.confirmada_em DESC, s.id DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows;
};

const findSaleItems = async (saleId, executor) => {
  const [rows] = await executor.query(
    'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC',
    [saleId]
  );
  return rows;
};

const findConfirmedSalePayments = async (saleId, executor) => {
  const [rows] = await executor.query(
    `SELECT *
     FROM payments
     WHERE sale_id = ?
       AND tipo_operacao = 'PAGAMENTO'
       AND status = 'CONFIRMADO'
     ORDER BY id ASC
     FOR UPDATE`,
    [saleId]
  );
  return rows;
};

const findSaleDebtEntry = async (saleId, executor) => {
  const [rows] = await executor.query(
    `SELECT *
     FROM customer_account_entries
     WHERE sale_id = ?
       AND origem = 'VENDA_FIADO'
       AND natureza = 'DEBITO'
     ORDER BY id ASC
     LIMIT 1
     FOR UPDATE`,
    [saleId]
  );
  return rows[0] || null;
};

const findSaleStockMovements = async (saleId, executor) => {
  const [rows] = await executor.query(
    `SELECT *
     FROM stock_movements
     WHERE sale_id = ?
       AND origem = 'VENDA'
       AND natureza = 'SAIDA'
     ORDER BY produto_id ASC, id ASC
     FOR UPDATE`,
    [saleId]
  );
  return rows;
};

const cancelSale = async (saleId, userId, reason, executor) => {
  const [result] = await executor.query(
    `UPDATE sales
     SET status = 'CANCELADA',
         cancelada_em = CURRENT_TIMESTAMP(6),
         cancelada_por_id = ?,
         motivo_cancelamento = ?
     WHERE id = ?
       AND status = 'CONFIRMADA'`,
    [userId, reason, saleId]
  );
  return result.affectedRows;
};

export default {
  calculateExpectedCash,
  cancelSale,
  closeSession,
  createAccountEntry,
  createPayment,
  createSale,
  createSaleItem,
  createSession,
  createStockMovement,
  findConfirmedSalePayments,
  findOpenSession,
  findProductByBarcode,
  findSaleById,
  findSaleDebtEntry,
  findSaleItems,
  findSaleStockMovements,
  findSessionById,
  listRecentSales,
  lockClientById,
  lockProductsByIds,
  searchActiveClients,
  searchProducts,
  updateProductStock,
  withTransaction
};
