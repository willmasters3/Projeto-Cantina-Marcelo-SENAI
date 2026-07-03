import { pool } from '../config/database.js';

const logAttempt = async ({ user_id, email, source_ip, successful, reason }) => {
  await pool.query(
    `INSERT INTO login_attempts (user_id, email, source_ip, successful, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, email, source_ip, successful ? 1 : 0, reason]
  );
};

const countRecentFailedAttempts = async ({ email, source_ip, windowMs }) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS failed_count
     FROM login_attempts
     WHERE successful = 0
       AND attempted_at >= DATE_SUB(NOW(), INTERVAL ? MICROSECOND)
       AND (email = ? OR source_ip = ?)`,
    [windowMs * 1000, email, source_ip]
  );
  return rows[0]?.failed_count || 0;
};

export default { logAttempt, countRecentFailedAttempts };
