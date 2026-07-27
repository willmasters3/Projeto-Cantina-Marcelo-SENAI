import { pool } from '../config/database.js';

const knownProductReferences = [
  { tableName: 'sale_items', columnName: 'produto_id' },
  { tableName: 'stock_movements', columnName: 'produto_id' },
  { tableName: 'product_images', columnName: 'produto_id' }
];

const escapeIdentifier = (identifier) => `\`${String(identifier).replace(/`/g, '``')}\``;

const referenceKey = ({ tableName, columnName }) => `${tableName}.${columnName}`;

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

const tableHasColumn = async (tableName, columnName, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const findForeignKeyProductReferences = async (executor = pool) => {
  const [rows] = await executor.query(
    `SELECT DISTINCT
       TABLE_NAME AS tableName,
       COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = 'products'
       AND REFERENCED_COLUMN_NAME = 'id'`
  );
  return rows.map((row) => ({
    tableName: row.tableName,
    columnName: row.columnName
  }));
};

const findKnownProductReferences = async (executor = pool) => {
  const existingReferences = [];
  for (const reference of knownProductReferences) {
    if (await tableHasColumn(reference.tableName, reference.columnName, executor)) {
      existingReferences.push(reference);
    }
  }
  return existingReferences;
};

const findProductReferenceColumns = async (executor = pool) => {
  const referencesByKey = new Map();
  const references = [
    ...(await findForeignKeyProductReferences(executor)),
    ...(await findKnownProductReferences(executor))
  ];

  references.forEach((reference) => {
    referencesByKey.set(referenceKey(reference), reference);
  });

  return [...referencesByKey.values()];
};

const countProductReferences = async ({ tableName, columnName }, productId, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT COUNT(*) AS total
     FROM ${escapeIdentifier(tableName)}
     WHERE ${escapeIdentifier(columnName)} = ?`,
    [productId]
  );
  return Number(rows[0]?.total || 0);
};

const findProductAssociations = async (productId, executor = pool) => {
  const references = await findProductReferenceColumns(executor);
  const associations = [];

  for (const reference of references) {
    const count = await countProductReferences(reference, productId, executor);
    if (count > 0) {
      associations.push({
        table: reference.tableName,
        column: reference.columnName,
        count
      });
    }
  }

  return associations.sort((left, right) => left.table.localeCompare(right.table));
};

const findAll = async ({ status = 'active', search = '', barcode = '', categoryId = null } = {}) => {
  const params = [];
  const conditions = [];
  let query = `SELECT
    p.id,
    p.categoria_id,
    c.nome AS categoria,
    p.codigo_barras,
    p.nome,
    p.descricao,
    p.preco_venda,
    p.custo,
    p.estoque_atual,
    p.estoque_minimo,
    p.ativo,
    pi.caminho_publico AS imagem_url,
    p.criado_em,
    p.atualizado_em
  FROM products p
  LEFT JOIN categories c ON p.categoria_id = c.id
  LEFT JOIN product_images pi
    ON pi.produto_id = p.id
   AND pi.imagem_principal = 1
   AND pi.removida_em IS NULL`;

  if (status === 'active') {
    conditions.push('p.ativo = 1');
  } else if (status === 'inactive') {
    conditions.push('p.ativo = 0');
  }

  if (barcode) {
    conditions.push('p.codigo_barras = ?');
    params.push(barcode);
  }

  if (categoryId !== null) {
    conditions.push('p.categoria_id = ?');
    params.push(categoryId);
  }

  if (search) {
    conditions.push('(p.nome LIKE ? OR p.codigo_barras LIKE ? OR c.nome LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY p.ativo DESC, p.nome ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const findForDeletion = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT id, nome, estoque_atual, ativo
     FROM products
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
      p.id,
      p.categoria_id,
      c.nome AS categoria,
      p.codigo_barras,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.custo,
      p.estoque_atual,
      p.estoque_minimo,
      p.ativo,
      pi.caminho_publico AS imagem_url,
      p.criado_em,
      p.atualizado_em
    FROM products p
    LEFT JOIN categories c ON p.categoria_id = c.id
    LEFT JOIN product_images pi
      ON pi.produto_id = p.id
     AND pi.imagem_principal = 1
     AND pi.removida_em IS NULL
    WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const findByBarcode = async (barcode, activeOnly = true) => {
  const params = [barcode];
  let query = `SELECT
    p.id,
    p.categoria_id,
    c.nome AS categoria,
    p.codigo_barras,
    p.nome,
    p.descricao,
    p.preco_venda,
    p.custo,
    p.estoque_atual,
    p.estoque_minimo,
    p.ativo,
    pi.caminho_publico AS imagem_url,
    p.criado_em,
    p.atualizado_em
  FROM products p
  LEFT JOIN categories c ON p.categoria_id = c.id
  LEFT JOIN product_images pi
    ON pi.produto_id = p.id
   AND pi.imagem_principal = 1
   AND pi.removida_em IS NULL
  WHERE p.codigo_barras = ?`;

  if (activeOnly) {
    query += ' AND p.ativo = 1';
  }

  const [rows] = await pool.query(query, params);
  return rows[0] || null;
};

const findByBarcodeExcludingId = async (codigoBarras, id) => {
  const [rows] = await pool.query(
    'SELECT id, nome FROM products WHERE codigo_barras = ? AND id != ?',
    [codigoBarras, id]
  );
  return rows[0] || null;
};

const createProduct = async (product) => {
  const [result] = await pool.query(
    `INSERT INTO products
      (categoria_id, codigo_barras, nome, descricao, preco_venda, custo, estoque_atual, estoque_minimo, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.categoria_id || null,
      product.codigo_barras || null,
      product.nome,
      product.descricao || null,
      product.preco_venda,
      product.custo || null,
      product.estoque_atual,
      product.estoque_minimo,
      product.ativo ? 1 : 0
    ]
  );
  return result.insertId;
};

const updateProduct = async (id, product) => {
  await pool.query(
    `UPDATE products SET
      categoria_id = ?,
      codigo_barras = ?,
      nome = ?,
      descricao = ?,
      preco_venda = ?,
      custo = ?,
      estoque_atual = ?,
      estoque_minimo = ?,
      ativo = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      product.categoria_id || null,
      product.codigo_barras || null,
      product.nome,
      product.descricao || null,
      product.preco_venda,
      product.custo || null,
      product.estoque_atual,
      product.estoque_minimo,
      product.ativo ? 1 : 0,
      id
    ]
  );
};

const updateStatus = async (id, ativo) => {
  await pool.query(
    'UPDATE products SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
    [ativo ? 1 : 0, id]
  );
};

const deleteById = async (id, executor = pool) => {
  const [result] = await executor.query(
    'DELETE FROM products WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

export default {
  deleteById,
  findProductAssociations,
  findAll,
  findForDeletion,
  findById,
  findByBarcode,
  findByBarcodeExcludingId,
  createProduct,
  updateProduct,
  updateStatus,
  withTransaction
};
