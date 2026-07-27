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

const getSummary = async () => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS produtos_cadastrados,
       SUM(CASE WHEN estoque_atual > 0 THEN 1 ELSE 0 END) AS em_estoque,
       SUM(CASE WHEN estoque_atual > 0 AND estoque_atual <= estoque_minimo THEN 1 ELSE 0 END)
         AS baixo_estoque,
       COALESCE(SUM(estoque_atual * COALESCE(custo, 0)), 0) AS valor_estimado
     FROM products
     WHERE ativo = 1`
  );
  return rows[0] || {
    produtos_cadastrados: 0,
    em_estoque: 0,
    baixo_estoque: 0,
    valor_estimado: 0
  };
};

const findProducts = async ({
  search = '',
  categoryId = null,
  supplierId = null,
  status = 'all',
  page = 1,
  pageSize = 10,
  offset = 0
} = {}) => {
  const params = [];
  const conditions = ['p.ativo = 1'];
  let query = `SELECT
    p.id,
    p.categoria_id,
    c.nome AS categoria,
    p.supplier_id,
    s.nome AS fornecedor,
    p.codigo_barras,
    p.nome,
    p.preco_venda,
    p.custo,
    p.estoque_atual,
    p.estoque_minimo,
    p.ativo,
    pi.caminho_publico AS imagem_url,
    CASE
      WHEN p.estoque_atual <= 0 THEN 'SEM_ESTOQUE'
      WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
      ELSE 'OK'
    END AS status_estoque
  FROM products p
  LEFT JOIN categories c ON c.id = p.categoria_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN product_images pi
    ON pi.produto_id = p.id
   AND pi.imagem_principal = 1
   AND pi.removida_em IS NULL`;

  if (search) {
    conditions.push('(p.nome LIKE ? OR p.codigo_barras LIKE ? OR CAST(p.id AS CHAR) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (categoryId !== null) {
    conditions.push('p.categoria_id = ?');
    params.push(categoryId);
  }

  if (supplierId !== null) {
    conditions.push('p.supplier_id = ?');
    params.push(supplierId);
  }

  if (status === 'in_stock') {
    conditions.push('p.estoque_atual > 0');
  } else if (status === 'ok') {
    conditions.push('p.estoque_atual > p.estoque_minimo');
  } else if (status === 'low') {
    conditions.push('p.estoque_atual > 0 AND p.estoque_atual <= p.estoque_minimo');
  } else if (status === 'out') {
    conditions.push('p.estoque_atual <= 0');
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS totalItems
     FROM products p${whereClause}`,
    params
  );
  const totalItems = Number(countRows[0]?.totalItems || 0);

  query += whereClause;
  query += ' ORDER BY p.nome ASC, p.id ASC LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...params, pageSize, offset]);
  return {
    items: rows,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    }
  };
};

const findLowStockProducts = async (limit = 8) => {
  const [rows] = await pool.query(
    `SELECT
       p.id,
       p.nome,
       p.estoque_atual,
       p.estoque_minimo,
       pi.caminho_publico AS imagem_url
     FROM products p
     LEFT JOIN product_images pi
       ON pi.produto_id = p.id
      AND pi.imagem_principal = 1
      AND pi.removida_em IS NULL
     WHERE p.ativo = 1
       AND p.estoque_atual > 0
       AND p.estoque_atual <= p.estoque_minimo
     ORDER BY p.estoque_atual ASC, p.nome ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

const findMovements = async ({ page = 1, pageSize = 4, offset = 0 } = {}) => {
  const [countRows] = await pool.query('SELECT COUNT(*) AS totalItems FROM stock_movements');
  const totalItems = Number(countRows[0]?.totalItems || 0);
  const [rows] = await pool.query(
    `SELECT
       sm.id,
       sm.produto_id,
       p.nome AS produto,
       sm.supplier_id,
       s.nome AS fornecedor,
       sm.sale_id,
       sm.sale_item_id,
       sm.movimento_original_id,
       sm.natureza,
       sm.origem,
       sm.quantidade,
       sm.estoque_antes,
       sm.estoque_depois,
       sm.motivo,
       sm.usuario_id,
       u.nome AS usuario,
       sm.criado_em
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.produto_id
     LEFT JOIN suppliers s ON s.id = sm.supplier_id
     LEFT JOIN users u ON u.id = sm.usuario_id
     ORDER BY sm.criado_em DESC, sm.id DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  return {
    items: rows,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    }
  };
};

const lockProductById = async (id, executor) => {
  const [rows] = await executor.query(
    `SELECT id, nome, supplier_id, custo, estoque_atual, estoque_minimo, ativo
     FROM products
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
};

const findSupplierById = async (id, executor) => {
  const [rows] = await executor.query(
    `SELECT id, nome, ativo
     FROM suppliers
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const updateProductAfterEntry = async (id, product, executor) => {
  const [result] = await executor.query(
    `UPDATE products SET
       estoque_atual = ?,
       custo = COALESCE(?, custo),
       supplier_id = COALESCE(?, supplier_id),
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      product.stockAfter,
      product.unitCost,
      product.supplierId,
      id
    ]
  );
  return result.affectedRows;
};

const updateProductStock = async (id, stockAfter, executor) => {
  const [result] = await executor.query(
    `UPDATE products
     SET estoque_atual = ?,
         atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [stockAfter, id]
  );
  return result.affectedRows;
};

const createStockMovement = async (movement, executor) => {
  const [result] = await executor.query(
    `INSERT INTO stock_movements
       (produto_id, supplier_id, sale_id, sale_item_id, movimento_original_id,
        natureza, origem, quantidade, estoque_antes, estoque_depois, motivo,
        chave_idempotencia, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.productId,
      movement.supplierId,
      movement.saleId,
      movement.saleItemId,
      movement.originalMovementId,
      movement.nature,
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

export default {
  createStockMovement,
  findLowStockProducts,
  findMovements,
  findProducts,
  findSupplierById,
  getSummary,
  lockProductById,
  updateProductAfterEntry,
  updateProductStock,
  withTransaction
};
