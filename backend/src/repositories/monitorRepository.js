import { pool } from '../config/database.js';

const findClientByCpf = async (cpf) => {
  const [rows] = await pool.query(
    `SELECT id, nome, cpf
     FROM clients
     WHERE cpf = ?
     LIMIT 1`,
    [cpf]
  );
  return rows[0] || null;
};

const getAccountTotals = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN natureza = 'DEBITO' THEN valor ELSE 0 END), 0.0000) AS debitos,
       COALESCE(SUM(CASE WHEN natureza = 'CREDITO' THEN valor ELSE 0 END), 0.0000) AS creditos
     FROM customer_account_entries
     WHERE cliente_id = ?`,
    [clientId]
  );
  return rows[0] || { debitos: '0.0000', creditos: '0.0000' };
};

const listRecentAccountEntries = async (clientId, limit = 10) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 10);
  const [rows] = await pool.query(
    `SELECT
       cae.natureza,
       cae.origem,
       cae.valor,
       cae.descricao,
       cae.criado_em,
       (
         SELECT GROUP_CONCAT(si.descricao ORDER BY si.id SEPARATOR ', ')
         FROM sale_items si
         WHERE si.sale_id = cae.sale_id
       ) AS itens_venda
     FROM customer_account_entries cae
     WHERE cae.cliente_id = ?
     ORDER BY cae.criado_em DESC, cae.id DESC
     LIMIT ${safeLimit}`,
    [clientId]
  );
  return rows;
};

export default { findClientByCpf, getAccountTotals, listRecentAccountEntries };
