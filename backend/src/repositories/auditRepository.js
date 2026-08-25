import { pool } from '../config/database.js';

const createLog = async ({
  userId = null,
  action,
  result = 'SUCESSO',
  details = null,
  ipAddress = null,
  userAgent = null
}, executor = pool) => {
  await executor.query(
    `INSERT INTO audit_logs
       (usuario_id, acao, resultado, detalhes_json, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      result,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent
    ]
  );
};

const listRecent = async ({ limit = 10, offset = 0 } = {}, executor = pool) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const [rows] = await executor.query(
    `SELECT
       al.id,
       al.usuario_id,
       u.nome AS usuario_nome,
       u.email AS usuario_login,
       al.acao,
       al.resultado,
       al.detalhes_json,
       al.criado_em
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.usuario_id
     ORDER BY al.criado_em DESC, al.id DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );
  const [[countRow]] = await executor.query('SELECT COUNT(*) AS total FROM audit_logs');
  return {
    items: rows,
    total: Number(countRow?.total || 0),
    limit: safeLimit,
    offset: safeOffset
  };
};

export default { createLog, listRecent };
