import { pool } from '../config/database.js';

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

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nome, u.email, u.role_id, u.ativo, u.locked_until,
            r.slug AS role_slug, r.nome AS role_nome
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
};

export default { findByEmail, findById, updateLastLogin };
