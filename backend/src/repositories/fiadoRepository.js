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

const findOpenCashSession = async (terminalCode, executor = pool, forUpdate = false) => {
  const [rows] = await executor.query(
    `SELECT id, terminal_codigo, status
     FROM cash_sessions
     WHERE terminal_codigo = ?
       AND status = 'ABERTA'
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [terminalCode]
  );
  return rows[0] || null;
};

const findClientById = async (id, executor = pool, forUpdate = false) => {
  const [rows] = await executor.query(
    `SELECT id, nome, cpf, matricula, telefone, email, codigo, ativo
     FROM clients
     WHERE id = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
};

const listClients = async ({ search = '' } = {}) => {
  const params = [];
  let query = `SELECT id, nome, cpf, matricula, telefone, email, codigo, ativo
    FROM clients`;

  if (search) {
    const term = `%${search}%`;
    const cpfDigits = search.replace(/\D/g, '');
    const isCpfLikeSearch = cpfDigits && /^[\d.\-\s]+$/.test(search);
    const cpfTerm = `%${isCpfLikeSearch ? cpfDigits : search}%`;
    query += `
      WHERE nome LIKE ?
         OR cpf LIKE ?
         OR matricula LIKE ?
         OR codigo LIKE ?`;
    params.push(term, cpfTerm, term, term);
  }

  query += ' ORDER BY nome ASC LIMIT 100';
  const [rows] = await pool.query(query, params);
  return rows;
};

const listAccountEntries = async ({ clientId = null, search = '' } = {}, executor = pool) => {
  const params = [];
  const conditions = [];
  let query = `SELECT
      cae.id,
      cae.cliente_id,
      c.nome AS cliente_nome,
      c.cpf,
      c.matricula,
      c.codigo,
      c.ativo AS cliente_ativo,
      cae.sale_id,
      cae.payment_id,
      cae.lancamento_original_id,
      cae.natureza,
      cae.origem,
      cae.valor,
      cae.descricao,
      cae.usuario_id,
      u.nome AS usuario,
      cae.criado_em,
      s.confirmada_em AS venda_em,
      p.forma_pagamento,
      p.confirmado_em AS pagamento_em,
      p.referencia_transacao
    FROM customer_account_entries cae
    INNER JOIN clients c ON c.id = cae.cliente_id
    LEFT JOIN sales s ON s.id = cae.sale_id
    LEFT JOIN payments p ON p.id = cae.payment_id
    LEFT JOIN users u ON u.id = cae.usuario_id`;

  if (clientId !== null) {
    conditions.push('cae.cliente_id = ?');
    params.push(clientId);
  }

  if (search) {
    const term = `%${search}%`;
    const cpfDigits = search.replace(/\D/g, '');
    const isCpfLikeSearch = cpfDigits && /^[\d.\-\s]+$/.test(search);
    const cpfTerm = `%${isCpfLikeSearch ? cpfDigits : search}%`;
    conditions.push('(c.nome LIKE ? OR c.cpf LIKE ? OR c.codigo LIKE ? OR c.matricula LIKE ?)');
    params.push(term, cpfTerm, term, term);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY
    c.nome ASC,
    COALESCE(s.confirmada_em, p.confirmado_em, cae.criado_em) ASC,
    cae.id ASC`;

  const [rows] = await executor.query(query, params);
  return rows;
};

const listSaleItemsByClient = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT
       s.id AS sale_id,
       s.confirmada_em,
       s.total AS venda_total,
       s.status,
       si.descricao,
       si.quantidade,
       si.preco_unitario,
       si.total_item
     FROM sales s
     INNER JOIN sale_items si ON si.sale_id = s.id
     WHERE s.cliente_id = ?
       AND s.tipo_venda = 'FIADO'
     ORDER BY s.confirmada_em DESC, s.id DESC, si.id ASC`,
    [clientId]
  );
  return rows;
};

const getReceivedInCurrentMonth = async () => {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS recebido_mes_atual
     FROM payments
     WHERE finalidade = 'RECEBIMENTO_FIADO'
       AND tipo_operacao = 'PAGAMENTO'
       AND status = 'CONFIRMADO'
       AND confirmado_em >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
       AND confirmado_em < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)`
  );
  return rows[0]?.recebido_mes_atual ?? '0.0000';
};

const createPayment = async (payment, executor) => {
  const [result] = await executor.query(
    `INSERT INTO payments
       (cash_session_id, sale_id, cliente_id, pagamento_original_id,
        tipo_operacao, finalidade, forma_pagamento, status, valor,
        provedor_externo, identificador_externo, nsu, codigo_autorizacao,
        referencia_transacao, chave_idempotencia, usuario_registro_id,
        usuario_confirmacao_id, confirmado_em)
     VALUES (?, NULL, ?, NULL, 'PAGAMENTO', 'RECEBIMENTO_FIADO',
             ?, 'CONFIRMADO', ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?,
             CURRENT_TIMESTAMP(6))`,
    [
      payment.cashSessionId,
      payment.clientId,
      payment.method,
      payment.amount,
      payment.reference,
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
     VALUES (?, NULL, ?, NULL, 'CREDITO', 'PAGAMENTO_CLIENTE',
             ?, ?, ?, ?)`,
    [
      entry.clientId,
      entry.paymentId,
      entry.amount,
      entry.description,
      entry.idempotencyKey,
      entry.userId
    ]
  );
  return result.insertId;
};

export default {
  createAccountEntry,
  createPayment,
  findClientById,
  findOpenCashSession,
  getReceivedInCurrentMonth,
  listAccountEntries,
  listClients,
  listSaleItemsByClient,
  withTransaction
};
