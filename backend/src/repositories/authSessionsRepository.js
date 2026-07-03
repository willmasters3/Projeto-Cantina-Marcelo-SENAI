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
    `SELECT * FROM auth_sessions WHERE token_hash = ? AND invalidated_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
};

const invalidateSession = async (tokenHash) => {
  await pool.query(
    `UPDATE auth_sessions SET invalidated_at = CURRENT_TIMESTAMP WHERE token_hash = ?`,
    [tokenHash]
  );
};

const invalidateUserSessions = async (userId) => {
  await pool.query(
    `UPDATE auth_sessions SET invalidated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
    [userId]
  );
};

export default {
  createSession,
  findByTokenHash,
  invalidateSession,
  invalidateUserSessions
};
