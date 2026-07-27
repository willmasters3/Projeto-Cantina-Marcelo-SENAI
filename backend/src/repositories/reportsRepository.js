import { pool } from '../config/database.js';

const paymentMethods = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTROS'];

const addPeriodCondition = (conditions, params, column, filters) => {
  conditions.push(`${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
  params.push(filters.startDate, filters.endDate);
};

const addSaleFilters = (
  conditions,
  params,
  filters,
  { forceConfirmed = false, includePeriod = true } = {}
) => {
  if (includePeriod) addPeriodCondition(conditions, params, 's.confirmada_em', filters);

  if (forceConfirmed) {
    conditions.push("s.status = 'CONFIRMADA'");
  } else if (filters.status && filters.status !== 'ALL') {
    conditions.push('s.status = ?');
    params.push(filters.status);
  }

  if (filters.clientId) {
    conditions.push('s.cliente_id = ?');
    params.push(filters.clientId);
  }

  if (filters.productId) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM sale_items si_filter
      WHERE si_filter.sale_id = s.id
        AND si_filter.produto_id = ?
    )`);
    params.push(filters.productId);
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
    if (filters.paymentMethod === 'FIADO') {
      conditions.push("s.tipo_venda = 'FIADO'");
    } else {
      conditions.push(`EXISTS (
        SELECT 1
        FROM payments p_filter
        WHERE p_filter.sale_id = s.id
          AND p_filter.tipo_operacao = 'PAGAMENTO'
          AND p_filter.status = 'CONFIRMADO'
          AND p_filter.forma_pagamento = ?
      )`);
      params.push(filters.paymentMethod);
    }
  }
};

const addPaymentFilters = (conditions, params, filters, alias = 'p') => {
  addPeriodCondition(conditions, params, `${alias}.confirmado_em`, filters);
  conditions.push(`${alias}.status = 'CONFIRMADO'`);

  if (filters.paymentMethod && filters.paymentMethod !== 'ALL' && filters.paymentMethod !== 'FIADO') {
    conditions.push(`${alias}.forma_pagamento = ?`);
    params.push(filters.paymentMethod);
  } else if (filters.paymentMethod === 'FIADO') {
    conditions.push(`${alias}.finalidade = 'RECEBIMENTO_FIADO'`);
  }

  if (filters.clientId) {
    conditions.push(`${alias}.cliente_id = ?`);
    params.push(filters.clientId);
  }

  if (filters.productId) {
    conditions.push(`(
      ${alias}.sale_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM sale_items si_filter
        WHERE si_filter.sale_id = ${alias}.sale_id
          AND si_filter.produto_id = ?
      )
    )`);
    params.push(filters.productId);
  }
};

const paginate = async ({ countQuery, countParams, dataQuery, dataParams, page, pageSize }) => {
  const [countRows] = await pool.query(countQuery, countParams);
  const totalItems = Number(countRows[0]?.totalItems || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [items] = await pool.query(`${dataQuery} LIMIT ? OFFSET ?`, [
    ...dataParams,
    pageSize,
    (page - 1) * pageSize
  ]);
  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };
};

const listOptions = async () => {
  const [clients] = await pool.query(
    `SELECT id, nome, codigo
     FROM clients
     ORDER BY nome ASC
     LIMIT 300`
  );
  const [products] = await pool.query(
    `SELECT id, nome, codigo_barras
     FROM products
     WHERE ativo = 1
     ORDER BY nome ASC
     LIMIT 500`
  );
  return {
    clients,
    products,
    paymentMethods: [...paymentMethods, 'FIADO'],
    statuses: ['ALL', 'CONFIRMADA', 'CANCELADA']
  };
};

const getSalesPeriodSummary = async (filters) => {
  const conditions = [];
  const params = [];
  addSaleFilters(conditions, params, filters, { forceConfirmed: true });

  const [rows] = await pool.query(
    `SELECT
       COUNT(DISTINCT s.id) AS quantidade_vendas,
       COALESCE(SUM(s.total), 0) AS total_vendido
     FROM sales s
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0] || { quantidade_vendas: 0, total_vendido: 0 };
};

const getCanceledSalesSummary = async (filters) => {
  const conditions = [];
  const params = [];
  addPeriodCondition(conditions, params, 's.cancelada_em', filters);
  conditions.push("s.status = 'CANCELADA'");
  addSaleFilters(conditions, params, { ...filters, status: 'ALL' }, { includePeriod: false });

  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS quantidade_cancelada,
       COALESCE(SUM(s.total), 0) AS valor_cancelado
     FROM sales s
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0] || { quantidade_cancelada: 0, valor_cancelado: 0 };
};

const getReceivedPeriodSummary = async (filters) => {
  const conditions = [];
  const params = [];
  addPaymentFilters(conditions, params, filters);
  conditions.push("p.tipo_operacao = 'PAGAMENTO'");

  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS quantidade_recebimentos,
       COALESCE(SUM(p.valor), 0) AS total_recebido
     FROM payments p
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0] || { quantidade_recebimentos: 0, total_recebido: 0 };
};

const getFiadoOpenSummary = async () => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS clientes_com_pendencia,
       COALESCE(SUM(saldo), 0) AS total_em_aberto
     FROM (
       SELECT
         cliente_id,
         SUM(CASE WHEN natureza = 'DEBITO' THEN valor ELSE -valor END) AS saldo
       FROM customer_account_entries
       GROUP BY cliente_id
       HAVING saldo > 0
     ) pending`
  );
  return rows[0] || { clientes_com_pendencia: 0, total_em_aberto: 0 };
};

const getEstimatedProfit = async (filters) => {
  const conditions = [];
  const params = [];
  addSaleFilters(conditions, params, filters, { forceConfirmed: true });

  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(si.total_item), 0) AS total_itens,
       COALESCE(SUM(COALESCE(si.custo_unitario, p.custo, 0) * si.quantidade), 0) AS custo_estimado
     FROM sales s
     INNER JOIN sale_items si ON si.sale_id = s.id
     LEFT JOIN products p ON p.id = si.produto_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0] || { total_itens: 0, custo_estimado: 0 };
};

const getPaymentBreakdown = async (
  filters,
  { includeRefunds = true, salePaymentsOnly = false } = {}
) => {
  const paymentConditions = [];
  const paymentParams = [];
  addPaymentFilters(paymentConditions, paymentParams, filters);
  if (!includeRefunds) paymentConditions.push("p.tipo_operacao = 'PAGAMENTO'");
  if (salePaymentsOnly) paymentConditions.push("p.finalidade = 'VENDA'");

  const [payments] = await pool.query(
    `SELECT
       p.forma_pagamento,
       p.finalidade,
       p.tipo_operacao,
       COUNT(*) AS quantidade,
       COALESCE(SUM(p.valor), 0) AS total
     FROM payments p
     WHERE ${paymentConditions.join(' AND ')}
     GROUP BY p.forma_pagamento, p.finalidade, p.tipo_operacao
     ORDER BY p.forma_pagamento ASC, p.finalidade ASC`,
    paymentParams
  );

  let fiadoRows = [];
  if (!filters.paymentMethod || filters.paymentMethod === 'ALL' || filters.paymentMethod === 'FIADO') {
    const saleConditions = [];
    const saleParams = [];
    addSaleFilters(saleConditions, saleParams, { ...filters, paymentMethod: 'FIADO' }, { forceConfirmed: true });
    [fiadoRows] = await pool.query(
      `SELECT
         'FIADO' AS forma_pagamento,
         'VENDA_FIADO' AS finalidade,
         'LANCAMENTO' AS tipo_operacao,
         COUNT(*) AS quantidade,
         COALESCE(SUM(s.total), 0) AS total
       FROM sales s
       WHERE ${saleConditions.join(' AND ')}`,
      saleParams
    );
  }

  return [...payments, ...(Number(fiadoRows[0]?.quantidade || 0) ? fiadoRows : [])];
};

const getSalesTrend = async (filters) => {
  const conditions = [
    's.confirmada_em >= DATE_SUB(?, INTERVAL 6 DAY)',
    's.confirmada_em < DATE_ADD(?, INTERVAL 1 DAY)'
  ];
  const params = [filters.endDate, filters.endDate];
  addSaleFilters(conditions, params, filters, { forceConfirmed: true, includePeriod: false });

  const [rows] = await pool.query(
    `SELECT
       DATE(s.confirmada_em) AS data,
       COUNT(*) AS quantidade,
       COALESCE(SUM(s.total), 0) AS total
     FROM sales s
     WHERE ${conditions.join(' AND ')}
     GROUP BY DATE(s.confirmada_em)
     ORDER BY data ASC`,
    params
  );
  return rows;
};

const listTopProducts = async (filters, limit = 5) => {
  const conditions = [];
  const params = [];
  addSaleFilters(conditions, params, filters, { forceConfirmed: true });

  const [rows] = await pool.query(
    `SELECT
       si.produto_id,
       si.descricao AS produto,
       c.nome AS categoria,
       SUM(si.quantidade) AS quantidade,
       COALESCE(SUM(si.total_item), 0) AS total
     FROM sales s
     INNER JOIN sale_items si ON si.sale_id = s.id
     LEFT JOIN products p ON p.id = si.produto_id
     LEFT JOIN categories c ON c.id = p.categoria_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY si.produto_id, si.descricao, c.nome
     ORDER BY quantidade DESC, total DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows;
};

const listSales = async (filters) => {
  const conditions = [];
  const params = [];
  addSaleFilters(conditions, params, filters);
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await paginate({
    countQuery: `SELECT COUNT(DISTINCT s.id) AS totalItems FROM sales s ${whereClause}`,
    countParams: params,
    dataQuery: `SELECT
       s.id,
       s.tipo_venda,
       s.status,
       s.total,
       s.subtotal,
       s.desconto,
       s.acrescimo,
       s.observacoes,
       s.confirmada_em,
       s.cancelada_em,
       s.motivo_cancelamento,
       c.nome AS cliente,
       u.nome AS operador,
       GROUP_CONCAT(DISTINCT p.forma_pagamento ORDER BY p.id SEPARATOR ', ') AS formas_pagamento
     FROM sales s
     LEFT JOIN clients c ON c.id = s.cliente_id
     LEFT JOIN users u ON u.id = s.operador_id
     LEFT JOIN payments p
       ON p.sale_id = s.id
      AND p.tipo_operacao = 'PAGAMENTO'
      AND p.status = 'CONFIRMADO'
     ${whereClause}
     GROUP BY
       s.id, s.tipo_venda, s.status, s.total, s.subtotal, s.desconto, s.acrescimo,
       s.observacoes, s.confirmada_em, s.cancelada_em, s.motivo_cancelamento,
       c.nome, u.nome
     ORDER BY s.confirmada_em DESC, s.id DESC`,
    dataParams: params,
    page: filters.page,
    pageSize: filters.pageSize
  });

  const saleIds = result.items.map((sale) => sale.id);
  if (!saleIds.length) return result;

  const placeholders = saleIds.map(() => '?').join(', ');
  const [items] = await pool.query(
    `SELECT
       sale_id,
       descricao,
       quantidade,
       preco_unitario,
       total_item
     FROM sale_items
     WHERE sale_id IN (${placeholders})
     ORDER BY sale_id ASC, id ASC`,
    saleIds
  );
  const itemsBySale = new Map();
  items.forEach((item) => {
    const saleId = String(item.sale_id);
    if (!itemsBySale.has(saleId)) itemsBySale.set(saleId, []);
    itemsBySale.get(saleId).push(item);
  });

  return {
    ...result,
    items: result.items.map((sale) => ({
      ...sale,
      itens: itemsBySale.get(String(sale.id)) || []
    }))
  };
};

const listCashSessions = async (filters) => {
  const conditions = [];
  const params = [];
  addPeriodCondition(conditions, params, 'cs.aberto_em', filters);
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  return paginate({
    countQuery: `SELECT COUNT(*) AS totalItems FROM cash_sessions cs ${whereClause}`,
    countParams: params,
    dataQuery: `SELECT
       cs.id,
       cs.terminal_codigo,
       cs.status,
       cs.valor_abertura,
       cs.valor_fechamento_esperado,
       cs.valor_fechamento_informado,
       cs.diferenca_fechamento,
       cs.aberto_em,
       cs.fechado_em,
       ua.nome AS usuario_abertura,
       uf.nome AS usuario_fechamento
     FROM cash_sessions cs
     LEFT JOIN users ua ON ua.id = cs.usuario_abertura_id
     LEFT JOIN users uf ON uf.id = cs.usuario_fechamento_id
     ${whereClause}
     ORDER BY cs.aberto_em DESC, cs.id DESC`,
    dataParams: params,
    page: filters.page,
    pageSize: filters.pageSize
  });
};

const getCashSummary = async (filters) => {
  const conditions = [];
  const params = [];
  addPaymentFilters(conditions, params, filters);

  const [payments] = await pool.query(
    `SELECT
       p.forma_pagamento,
       p.finalidade,
       p.tipo_operacao,
       COALESCE(SUM(p.valor), 0) AS total
     FROM payments p
     WHERE ${conditions.join(' AND ')}
     GROUP BY p.forma_pagamento, p.finalidade, p.tipo_operacao`,
    params
  );

  const sales = await getSalesPeriodSummary(filters);
  const canceled = await getCanceledSalesSummary(filters);
  return { payments, sales, canceled };
};

const listFiadoDebtors = async (limit = 50) => {
  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.nome,
       c.cpf,
       c.codigo,
       c.matricula,
       SUM(CASE WHEN cae.natureza = 'DEBITO' THEN cae.valor ELSE -cae.valor END) AS saldo_aberto,
       SUM(CASE WHEN cae.natureza = 'CREDITO' THEN cae.valor ELSE 0 END) AS creditos,
       MIN(CASE WHEN cae.natureza = 'DEBITO' THEN COALESCE(s.confirmada_em, cae.criado_em) END) AS ciclo_mais_antigo
     FROM customer_account_entries cae
     INNER JOIN clients c ON c.id = cae.cliente_id
     LEFT JOIN sales s ON s.id = cae.sale_id
     GROUP BY c.id, c.nome, c.cpf, c.codigo, c.matricula
     HAVING saldo_aberto > 0
     ORDER BY saldo_aberto DESC, c.nome ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

const listFiadoReceipts = async (filters, limit = null) => {
  const conditions = [];
  const params = [];
  addPaymentFilters(conditions, params, filters);
  conditions.push("p.finalidade = 'RECEBIMENTO_FIADO'");
  conditions.push("p.tipo_operacao = 'PAGAMENTO'");

  let query = `SELECT
     p.id,
     c.nome AS cliente,
     p.valor,
     p.forma_pagamento,
     p.confirmado_em,
     u.nome AS operador,
     entries.descricao
   FROM payments p
   LEFT JOIN clients c ON c.id = p.cliente_id
   LEFT JOIN users u ON u.id = p.usuario_confirmacao_id
   LEFT JOIN (
     SELECT payment_id, GROUP_CONCAT(descricao ORDER BY id SEPARATOR ' | ') AS descricao
     FROM customer_account_entries
     WHERE origem = 'PAGAMENTO_CLIENTE'
     GROUP BY payment_id
   ) entries ON entries.payment_id = p.id
   WHERE ${conditions.join(' AND ')}
   ORDER BY p.confirmado_em DESC, p.id DESC`;

  if (limit !== null) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const [rows] = await pool.query(query, params);
  return rows;
};

const listProductsSold = async (filters) => {
  const conditions = [];
  const params = [];
  addSaleFilters(conditions, params, filters, { forceConfirmed: true });
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  return paginate({
    countQuery: `SELECT COUNT(*) AS totalItems FROM (
       SELECT si.produto_id, si.descricao
       FROM sales s
       INNER JOIN sale_items si ON si.sale_id = s.id
       ${whereClause}
       GROUP BY si.produto_id, si.descricao
     ) grouped`,
    countParams: params,
    dataQuery: `SELECT
       si.produto_id,
       si.descricao AS produto,
       c.nome AS categoria,
       SUM(si.quantidade) AS quantidade_vendida,
       COALESCE(SUM(si.total_item), 0) AS total_vendido,
       COALESCE(SUM(COALESCE(si.custo_unitario, p.custo, 0) * si.quantidade), 0) AS custo_estimado,
       COALESCE(SUM(si.total_item - (COALESCE(si.custo_unitario, p.custo, 0) * si.quantidade)), 0) AS lucro_estimado,
       p.estoque_atual
     FROM sales s
     INNER JOIN sale_items si ON si.sale_id = s.id
     LEFT JOIN products p ON p.id = si.produto_id
     LEFT JOIN categories c ON c.id = p.categoria_id
     ${whereClause}
     GROUP BY si.produto_id, si.descricao, c.nome, p.estoque_atual
     ORDER BY quantidade_vendida DESC, total_vendido DESC`,
    dataParams: params,
    page: filters.page,
    pageSize: filters.pageSize
  });
};

const getStockReport = async (filters) => {
  const [summaryRows] = await pool.query(
    `SELECT
       COALESCE(SUM(estoque_atual * COALESCE(custo, 0)), 0) AS valor_estimado,
       SUM(CASE WHEN estoque_atual > 0 AND estoque_atual <= estoque_minimo THEN 1 ELSE 0 END) AS baixo_estoque,
       SUM(CASE WHEN estoque_atual <= 0 THEN 1 ELSE 0 END) AS sem_estoque
     FROM products
     WHERE ativo = 1`
  );
  const [lowStock] = await pool.query(
    `SELECT id, nome, estoque_atual, estoque_minimo
     FROM products
     WHERE ativo = 1
       AND estoque_atual > 0
       AND estoque_atual <= estoque_minimo
     ORDER BY estoque_atual ASC, nome ASC
     LIMIT 10`
  );
  const [outOfStock] = await pool.query(
    `SELECT id, nome, estoque_atual, estoque_minimo
     FROM products
     WHERE ativo = 1
       AND estoque_atual <= 0
     ORDER BY nome ASC
     LIMIT 10`
  );
  const [movements] = await pool.query(
    `SELECT
       sm.id,
       p.nome AS produto,
       sm.natureza,
       sm.origem,
       sm.quantidade,
       sm.estoque_antes,
       sm.estoque_depois,
       sm.motivo,
       u.nome AS usuario,
       sm.criado_em
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.produto_id
     LEFT JOIN users u ON u.id = sm.usuario_id
     WHERE sm.criado_em >= ?
       AND sm.criado_em < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY sm.criado_em DESC, sm.id DESC
     LIMIT 10`,
    [filters.startDate, filters.endDate]
  );
  const [movementTotals] = await pool.query(
    `SELECT
       SUM(CASE WHEN natureza = 'ENTRADA' THEN quantidade ELSE 0 END) AS entradas,
       SUM(CASE WHEN natureza = 'SAIDA' THEN quantidade ELSE 0 END) AS saidas
     FROM stock_movements
     WHERE criado_em >= ?
       AND criado_em < DATE_ADD(?, INTERVAL 1 DAY)`,
    [filters.startDate, filters.endDate]
  );

  return {
    summary: summaryRows[0] || {},
    lowStock,
    outOfStock,
    movements,
    movementTotals: movementTotals[0] || {}
  };
};

export default {
  getCanceledSalesSummary,
  getCashSummary,
  getEstimatedProfit,
  getFiadoOpenSummary,
  getPaymentBreakdown,
  getReceivedPeriodSummary,
  getSalesPeriodSummary,
  getSalesTrend,
  getStockReport,
  listCashSessions,
  listFiadoDebtors,
  listFiadoReceipts,
  listOptions,
  listProductsSold,
  listSales,
  listTopProducts
};
