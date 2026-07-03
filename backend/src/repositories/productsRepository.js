import { pool } from '../config/database.js';

const findAll = async ({ activeOnly = true, search = '', barcode = '', categoryId = null } = {}) => {
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
    p.criado_em,
    p.atualizado_em
  FROM products p
  LEFT JOIN categories c ON p.categoria_id = c.id`;

  if (activeOnly) {
    conditions.push('p.ativo = 1');
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

  query += ' ORDER BY p.nome ASC';
  const [rows] = await pool.query(query, params);
  return rows;
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
      p.criado_em,
      p.atualizado_em
    FROM products p
    LEFT JOIN categories c ON p.categoria_id = c.id
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
    p.criado_em,
    p.atualizado_em
  FROM products p
  LEFT JOIN categories c ON p.categoria_id = c.id
  WHERE p.codigo_barras = ?`;

  if (activeOnly) {
    query += ' AND p.ativo = 1';
  }

  const [rows] = await pool.query(query, params);
  return rows[0] || null;
};

const findByBarcodeExcludingId = async (codigoBarras, id) => {
  const [rows] = await pool.query(
    'SELECT id FROM products WHERE codigo_barras = ? AND id != ?',
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

export default {
  findAll,
  findById,
  findByBarcode,
  findByBarcodeExcludingId,
  createProduct,
  updateProduct,
  updateStatus
};
