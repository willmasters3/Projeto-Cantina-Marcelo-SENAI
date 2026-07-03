import { pool } from '../config/database.js';

const findAll = async ({ activeOnly = true, search = '' } = {}) => {
  let query = 'SELECT id, nome, ativo, criado_em, atualizado_em FROM categories';
  const params = [];
  const conditions = [];

  if (activeOnly) {
    conditions.push('ativo = 1');
  }

  if (search) {
    conditions.push('nome LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY nome ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nome, ativo, criado_em, atualizado_em FROM categories WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const findByName = async (nome) => {
  const [rows] = await pool.query(
    `SELECT id, nome, ativo
     FROM categories
     WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
     LIMIT 1`,
    [nome]
  );
  return rows[0] || null;
};

const findByNameExcludingId = async (nome, id) => {
  const [rows] = await pool.query(
    `SELECT id, nome, ativo
     FROM categories
     WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
       AND id != ?
     LIMIT 1`,
    [nome, id]
  );
  return rows[0] || null;
};

const createCategory = async (nome) => {
  const [result] = await pool.query('INSERT INTO categories (nome) VALUES (?)', [nome]);
  return result.insertId;
};

const updateCategory = async (id, nome) => {
  await pool.query('UPDATE categories SET nome = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [nome, id]);
};

const updateStatus = async (id, ativo) => {
  await pool.query('UPDATE categories SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [ativo ? 1 : 0, id]);
};

export default {
  findAll,
  findById,
  findByName,
  findByNameExcludingId,
  createCategory,
  updateCategory,
  updateStatus
};
