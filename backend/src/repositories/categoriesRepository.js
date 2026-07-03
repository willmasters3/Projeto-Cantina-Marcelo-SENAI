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

const findByNameActive = async (nome) => {
  const [rows] = await pool.query(
    'SELECT id FROM categories WHERE nome_normalized = LOWER(TRIM(?)) AND ativo = 1',
    [nome]
  );
  return rows[0] || null;
};

const findByNameActiveExcludingId = async (nome, id) => {
  const [rows] = await pool.query(
    'SELECT id FROM categories WHERE nome_normalized = LOWER(TRIM(?)) AND ativo = 1 AND id != ?',
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
  findByNameActive,
  findByNameActiveExcludingId,
  createCategory,
  updateCategory,
  updateStatus
};
