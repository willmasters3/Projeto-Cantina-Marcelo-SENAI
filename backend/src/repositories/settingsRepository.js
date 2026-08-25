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

const getSettings = async (keys = [], executor = pool) => {
  if (!keys.length) return {};
  const placeholders = keys.map(() => '?').join(', ');
  const [rows] = await executor.query(
    `SELECT setting_key, setting_value
     FROM system_settings
     WHERE setting_key IN (${placeholders})`,
    keys
  );
  return rows.reduce((settings, row) => {
    settings[row.setting_key] = row.setting_value;
    return settings;
  }, {});
};

const getAllSettings = async (executor = pool) => {
  const [rows] = await executor.query(
    'SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key ASC'
  );
  return rows.reduce((settings, row) => {
    settings[row.setting_key] = row.setting_value;
    return settings;
  }, {});
};

const upsertSettings = async (entries, updatedById = null, executor = pool) => {
  for (const [key, value] of Object.entries(entries)) {
    await executor.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         updated_by_id = VALUES(updated_by_id),
         atualizado_em = CURRENT_TIMESTAMP`,
      [key, String(value), updatedById]
    );
  }
};

export default {
  getAllSettings,
  getSettings,
  upsertSettings,
  withTransaction
};
