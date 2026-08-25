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

const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nome, u.email, u.password_hash, u.role_id, u.ativo, u.locked_until,
            r.slug AS role_slug, r.nome AS role_nome
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const findById = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT u.id, u.nome, u.email, u.role_id, u.ativo, u.locked_until,
            r.slug AS role_slug, r.nome AS role_nome
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findPasswordById = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT u.id, u.nome, u.email, u.password_hash, u.role_id, u.ativo, u.locked_until,
            r.slug AS role_slug, r.nome AS role_nome
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
};

const listRoles = async (slugs = [], executor = pool) => {
  const parameters = [];
  let whereClause = '';
  if (slugs.length) {
    whereClause = `WHERE slug IN (${slugs.map(() => '?').join(', ')})`;
    parameters.push(...slugs);
  }
  const [rows] = await executor.query(
    `SELECT id, slug, nome, descricao
     FROM roles
     ${whereClause}
     ORDER BY id ASC`,
    parameters
  );
  return rows;
};

const findRoleBySlug = async (slug, executor = pool) => {
  const [rows] = await executor.query(
    'SELECT id, slug, nome, descricao FROM roles WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
};

const listInternalUsers = async ({ search = '', role = '', status = 'all' } = {}, executor = pool) => {
  const where = ["r.slug IN ('ADMINISTRADOR', 'OPERADOR_CAIXA')"];
  const parameters = [];
  const term = String(search || '').trim();

  if (term) {
    where.push('(u.nome LIKE ? OR u.email LIKE ?)');
    parameters.push(`%${term}%`, `%${term}%`);
  }

  if (role) {
    where.push('r.slug = ?');
    parameters.push(role);
  }

  if (status === 'active') {
    where.push('u.ativo = 1');
  } else if (status === 'inactive') {
    where.push('u.ativo = 0');
  }

  const [rows] = await executor.query(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.role_id,
       u.ativo,
       u.last_login_at,
       u.created_at,
       u.updated_at,
       r.slug AS role_slug,
       r.nome AS role_nome
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE ${where.join(' AND ')}
     ORDER BY u.nome ASC, u.id ASC`,
    parameters
  );
  return rows;
};

const findInternalUserById = async (id, executor = pool, forUpdate = false) => {
  const [rows] = await executor.query(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.password_hash,
       u.role_id,
       u.ativo,
       u.last_login_at,
       u.created_at,
       u.updated_at,
       r.slug AS role_slug,
       r.nome AS role_nome
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
       AND r.slug IN ('ADMINISTRADOR', 'OPERADOR_CAIXA')
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
};

const createUser = async ({ name, login, passwordHash, roleId, active }, executor = pool) => {
  const [result] = await executor.query(
    `INSERT INTO users (nome, email, password_hash, role_id, ativo)
     VALUES (?, ?, ?, ?, ?)`,
    [name, login, passwordHash, roleId, active ? 1 : 0]
  );
  return result.insertId;
};

const updateUser = async (id, { name, login, roleId }, executor = pool) => {
  const [result] = await executor.query(
    `UPDATE users
     SET nome = ?,
         email = ?,
         role_id = ?
     WHERE id = ?`,
    [name, login, roleId, id]
  );
  return result.affectedRows;
};

const updatePassword = async (id, passwordHash, executor = pool) => {
  const [result] = await executor.query(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ?`,
    [passwordHash, id]
  );
  return result.affectedRows;
};

const updateStatus = async (id, active, executor = pool) => {
  const [result] = await executor.query(
    `UPDATE users
     SET ativo = ?
     WHERE id = ?`,
    [active ? 1 : 0, id]
  );
  return result.affectedRows;
};

const countActiveAdmins = async ({ excludeUserId = null } = {}, executor = pool) => {
  const parameters = [];
  let excludeClause = '';
  if (excludeUserId !== null && excludeUserId !== undefined) {
    excludeClause = ' AND u.id <> ?';
    parameters.push(excludeUserId);
  }

  const [[row]] = await executor.query(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.ativo = 1
       AND r.slug = 'ADMINISTRADOR'${excludeClause}`,
    parameters
  );
  return Number(row?.total || 0);
};

const countActiveInternalUsers = async (executor = pool) => {
  const [[row]] = await executor.query(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.ativo = 1
       AND r.slug IN ('ADMINISTRADOR', 'OPERADOR_CAIXA')`
  );
  return Number(row?.total || 0);
};

export default {
  countActiveAdmins,
  countActiveInternalUsers,
  createUser,
  findByEmail,
  findById,
  findInternalUserById,
  findPasswordById,
  findRoleBySlug,
  listInternalUsers,
  listRoles,
  updateLastLogin,
  updatePassword,
  updateStatus,
  updateUser,
  withTransaction
};
