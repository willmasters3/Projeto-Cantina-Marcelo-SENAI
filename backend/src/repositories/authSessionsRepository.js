import { pool } from '../config/database.js';

const createSession = async ({ user_id, token_hash, expires_at, ip_address, user_agent }) => {
  const [result] = await pool.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, token_hash, expires_at, ip_address, user_agent]
  );
  return result.insertId;
};

const findByTokenHash = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT id, user_id, expires_at
     FROM auth_sessions
     WHERE token_hash = ? AND invalidated_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
};

const invalidateSession = async (tokenHash) => {
  await pool.query(
    'UPDATE auth_sessions SET invalidated_at = CURRENT_TIMESTAMP WHERE token_hash = ?',
    [tokenHash]
  );
};

const invalidateUserSessions = async (userId, { exceptTokenHash = null } = {}, executor = pool) => {
  const parameters = [userId];
  let exceptionClause = '';
  if (exceptTokenHash) {
    exceptionClause = ' AND token_hash <> ?';
    parameters.push(exceptTokenHash);
  }

  await executor.query(
    `UPDATE auth_sessions
     SET invalidated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND invalidated_at IS NULL${exceptionClause}`,
    parameters
  );
};

export default {
  createSession,
  findByTokenHash,
  invalidateSession,
  invalidateUserSessions
};
