import { pool } from '../config/database.js';

const createBackupRecord = async ({
  type,
  status = 'EM_ANDAMENTO',
  filename,
  originalName = null,
  storagePath,
  sizeBytes = null,
  autoRunKey = null,
  createdById = null
}, executor = pool) => {
  const [result] = await executor.query(
    `INSERT INTO backup_records
       (tipo, status, nome_arquivo, nome_original, caminho_armazenamento,
        tamanho_bytes, auto_run_key, criado_por_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      type,
      status,
      filename,
      originalName,
      storagePath,
      sizeBytes,
      autoRunKey,
      createdById
    ]
  );
  return result.insertId;
};

const markBackupSuccess = async (id, { sizeBytes }, executor = pool) => {
  await executor.query(
    `UPDATE backup_records
     SET status = 'SUCESSO',
         tamanho_bytes = ?,
         erro_mensagem = NULL,
         concluido_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sizeBytes, id]
  );
};

const markBackupFailure = async (id, errorMessage, executor = pool) => {
  await executor.query(
    `UPDATE backup_records
     SET status = 'FALHA',
         erro_mensagem = ?,
         concluido_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [String(errorMessage || 'Falha ao gerar backup').slice(0, 1000), id]
  );
};

const listBackups = async ({ limit = 50 } = {}, executor = pool) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const [rows] = await executor.query(
    `SELECT
       br.id,
       br.tipo,
       br.status,
       br.nome_arquivo,
       br.nome_original,
       br.tamanho_bytes,
       br.auto_run_key,
       br.criado_por_id,
       u.nome AS criado_por_nome,
       br.erro_mensagem,
       br.iniciado_em,
       br.concluido_em,
       br.excluido_em
     FROM backup_records br
     LEFT JOIN users u ON u.id = br.criado_por_id
     WHERE br.excluido_em IS NULL
     ORDER BY br.iniciado_em DESC, br.id DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows;
};

const findById = async (id, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT *
     FROM backup_records
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findLastSuccessful = async (executor = pool) => {
  const [rows] = await executor.query(
    `SELECT
       id, tipo, status, nome_arquivo, tamanho_bytes, concluido_em
     FROM backup_records
     WHERE status = 'SUCESSO'
       AND excluido_em IS NULL
     ORDER BY concluido_em DESC, id DESC
     LIMIT 1`
  );
  return rows[0] || null;
};

const findByAutoRunKey = async (autoRunKey, executor = pool) => {
  const [rows] = await executor.query(
    'SELECT * FROM backup_records WHERE auto_run_key = ? LIMIT 1',
    [autoRunKey]
  );
  return rows[0] || null;
};

const markDeleted = async (id, userId = null, executor = pool) => {
  await executor.query(
    `UPDATE backup_records
     SET excluido_em = CURRENT_TIMESTAMP,
         excluido_por_id = ?
     WHERE id = ?
       AND excluido_em IS NULL`,
    [userId, id]
  );
};

const listAutomaticBackupsForPrune = async (retentionDays, executor = pool) => {
  const [rows] = await executor.query(
    `SELECT *
     FROM backup_records
     WHERE tipo = 'AUTOMATICO'
       AND status = 'SUCESSO'
       AND excluido_em IS NULL
       AND concluido_em < DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY concluido_em ASC`,
    [retentionDays]
  );
  return rows;
};

const createRestoreRecord = async ({
  backupRecordId = null,
  safetyBackupRecordId = null,
  sourceFile,
  performedById
}, executor = pool) => {
  const [result] = await executor.query(
    `INSERT INTO backup_restore_records
       (backup_record_id, safety_backup_record_id, arquivo_origem, realizado_por_id)
     VALUES (?, ?, ?, ?)`,
    [backupRecordId, safetyBackupRecordId, sourceFile, performedById]
  );
  return result.insertId;
};

const markRestoreSuccess = async (id, executor = pool) => {
  await executor.query(
    `UPDATE backup_restore_records
     SET status = 'SUCESSO',
         erro_mensagem = NULL,
         concluido_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id]
  );
};

const markRestoreFailure = async (id, errorMessage, executor = pool) => {
  await executor.query(
    `UPDATE backup_restore_records
     SET status = 'FALHA',
         erro_mensagem = ?,
         concluido_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [String(errorMessage || 'Falha ao restaurar backup').slice(0, 1000), id]
  );
};

export default {
  createBackupRecord,
  createRestoreRecord,
  findByAutoRunKey,
  findById,
  findLastSuccessful,
  listAutomaticBackupsForPrune,
  listBackups,
  markBackupFailure,
  markBackupSuccess,
  markDeleted,
  markRestoreFailure,
  markRestoreSuccess
};
