import { pool } from '../config/database.js';

const clientFields = `
  id,
  nome,
  cpf,
  matricula,
  telefone,
  email,
  codigo,
  ativo,
  observacoes,
  criado_em,
  atualizado_em`;

const findAll = async ({ search = '' } = {}) => {
  const normalizedSearch = typeof search === 'string' ? search.trim() : '';
  const params = [];
  let query = `SELECT ${clientFields} FROM clients`;

  if (normalizedSearch) {
    const term = `%${normalizedSearch}%`;
    const cpfDigits = normalizedSearch.replace(/\D/g, '');
    const isCpfLikeSearch = cpfDigits && /^[\d.\-\s]+$/.test(normalizedSearch);
    const cpfTerm = `%${isCpfLikeSearch ? cpfDigits : normalizedSearch}%`;
    query += `
      WHERE nome LIKE ?
         OR cpf LIKE ?
         OR matricula LIKE ?
         OR telefone LIKE ?
         OR codigo LIKE ?`;
    params.push(term, cpfTerm, term, term, term);
  }

  query += ' ORDER BY ativo DESC, nome ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${clientFields} FROM clients WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findByMatricula = async (matricula) => {
  const [rows] = await pool.query(
    `SELECT id, nome, matricula
     FROM clients
     WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))
     LIMIT 1`,
    [matricula]
  );
  return rows[0] || null;
};

const findByCpf = async (cpf) => {
  const [rows] = await pool.query(
    `SELECT id, nome, cpf
     FROM clients
     WHERE cpf = ?
     LIMIT 1`,
    [cpf]
  );
  return rows[0] || null;
};

const findByCpfExcludingId = async (cpf, id) => {
  const [rows] = await pool.query(
    `SELECT id, nome, cpf
     FROM clients
     WHERE cpf = ?
       AND id != ?
     LIMIT 1`,
    [cpf, id]
  );
  return rows[0] || null;
};

const findByMatriculaExcludingId = async (matricula, id) => {
  const [rows] = await pool.query(
    `SELECT id, nome, matricula
     FROM clients
     WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))
       AND id != ?
     LIMIT 1`,
    [matricula, id]
  );
  return rows[0] || null;
};

const getNextCodeNumber = async () => {
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0) + 1 AS next_number
     FROM clients
     WHERE codigo REGEXP '^CLI-[0-9]+$'`
  );
  return Number(rows[0]?.next_number || 1);
};

const createClient = async (client) => {
  const [result] = await pool.query(
    `INSERT INTO clients
      (nome, cpf, matricula, telefone, email, codigo, ativo, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client.nome,
      client.cpf,
      client.matricula,
      client.telefone,
      client.email,
      client.codigo,
      client.ativo ? 1 : 0,
      client.observacoes
    ]
  );
  return result.insertId;
};

const updateClient = async (id, client) => {
  await pool.query(
    `UPDATE clients SET
       nome = ?,
       cpf = ?,
       matricula = ?,
       telefone = ?,
       email = ?,
       observacoes = ?,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      client.nome,
      client.cpf,
      client.matricula,
      client.telefone,
      client.email,
      client.observacoes,
      id
    ]
  );
};

const updateStatus = async (id, ativo) => {
  await pool.query(
    `UPDATE clients
     SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [ativo ? 1 : 0, id]
  );
};

export default {
  findAll,
  findById,
  findByCpf,
  findByCpfExcludingId,
  findByMatricula,
  findByMatriculaExcludingId,
  getNextCodeNumber,
  createClient,
  updateClient,
  updateStatus
};
