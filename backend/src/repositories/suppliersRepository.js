import { pool } from '../config/database.js';

const findAll = async ({ activeOnly = false, search = '' } = {}) => {
  const params = [];
  const conditions = [];
  let query = `SELECT
    s.id,
    s.nome,
    s.nome_fantasia,
    s.documento,
    s.telefone,
    s.email,
    s.observacoes,
    s.ativo,
    s.criado_em,
    s.atualizado_em,
    COUNT(p.id) AS produtos_vinculados,
    COALESCE(SUM(p.estoque_atual * COALESCE(p.custo, 0)), 0) AS valor_estimado
  FROM suppliers s
  LEFT JOIN products p
    ON p.supplier_id = s.id
   AND p.ativo = 1`;

  if (activeOnly) {
    conditions.push('s.ativo = 1');
  }

  if (search) {
    conditions.push('(s.nome LIKE ? OR s.nome_fantasia LIKE ? OR s.documento LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` GROUP BY
    s.id,
    s.nome,
    s.nome_fantasia,
    s.documento,
    s.telefone,
    s.email,
    s.observacoes,
    s.ativo,
    s.criado_em,
    s.atualizado_em
  ORDER BY s.ativo DESC, s.nome ASC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

const findById = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT id, nome, nome_fantasia, documento, telefone, email, observacoes,
            ativo, criado_em, atualizado_em
     FROM suppliers
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findActiveByName = async (nome, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT id, nome, ativo
     FROM suppliers
     WHERE ativo = 1
       AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
     LIMIT 1`,
    [nome]
  );
  return rows[0] || null;
};

const findActiveByNameExcludingId = async (nome, id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT id, nome, ativo
     FROM suppliers
     WHERE ativo = 1
       AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
       AND id != ?
     LIMIT 1`,
    [nome, id]
  );
  return rows[0] || null;
};

const createSupplier = async (supplier) => {
  const [result] = await pool.query(
    `INSERT INTO suppliers
      (nome, nome_fantasia, documento, telefone, email, observacoes, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      supplier.nome,
      supplier.nome_fantasia,
      supplier.documento,
      supplier.telefone,
      supplier.email,
      supplier.observacoes,
      supplier.ativo ? 1 : 0
    ]
  );
  return result.insertId;
};

const updateSupplier = async (id, supplier) => {
  await pool.query(
    `UPDATE suppliers SET
       nome = ?,
       nome_fantasia = ?,
       documento = ?,
       telefone = ?,
       email = ?,
       observacoes = ?,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      supplier.nome,
      supplier.nome_fantasia,
      supplier.documento,
      supplier.telefone,
      supplier.email,
      supplier.observacoes,
      id
    ]
  );
};

const updateStatus = async (id, ativo) => {
  await pool.query(
    'UPDATE suppliers SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
    [ativo ? 1 : 0, id]
  );
};

export default {
  createSupplier,
  findActiveByName,
  findActiveByNameExcludingId,
  findAll,
  findById,
  updateStatus,
  updateSupplier
};
