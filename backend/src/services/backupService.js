import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import backupConfig from '../config/backup.js';
import env from '../config/env.js';
import backupsRepository from '../repositories/backupsRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import HttpError from '../utils/httpError.js';
import {
  defaultSettings,
  getNextAutomaticBackupDate,
  logAudit
} from './settingsService.js';

const backupFilenamePattern = /^backup-(manual|automatico|seguranca-restauracao|upload-restauracao)-\d{8}-\d{6}-[a-f0-9]{8}\.sql$/;
const typeToFilenamePart = {
  MANUAL: 'manual',
  AUTOMATICO: 'automatico',
  SEGURANCA_RESTAURACAO: 'seguranca-restauracao',
  UPLOAD_RESTAURACAO: 'upload-restauracao'
};

const settingKeys = {
  autoEnabled: 'backup.auto_enabled',
  autoTime: 'backup.auto_time',
  retentionDays: 'backup.retention_days'
};

const mysqlEnvironment = () => ({
  ...process.env,
  MYSQL_PWD: env.database.password
});

const timestampForFilename = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

const buildBackupFilename = (type) => (
  `backup-${typeToFilenamePart[type]}-${timestampForFilename()}-${crypto.randomBytes(4).toString('hex')}.sql`
);

const getSafeBackupPath = (filename) => {
  if (!backupFilenamePattern.test(filename)) {
    throw new HttpError(400, 'Nome de backup inválido');
  }
  const resolvedPath = path.resolve(backupConfig.storageDirectory, filename);
  if (path.dirname(resolvedPath) !== backupConfig.storageDirectory) {
    throw new HttpError(400, 'Caminho de backup inválido');
  }
  return resolvedPath;
};

const removeFileQuietly = async (filePath) => {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const createProcessErrorMessage = (command, code, stderr) => {
  if (code === 'ENOENT') return `${command} não foi encontrado no servidor`;
  const cleanStderr = String(stderr || '').trim().replace(/\s+/g, ' ');
  if (!cleanStderr) return `${command} terminou com falha`;
  return cleanStderr.slice(0, 500);
};

const runMysqlProcess = async ({
  command,
  args,
  inputFile = null,
  outputFile = null
}) => {
  let stderr = '';
  const child = spawn(command, args, {
    env: mysqlEnvironment(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  child.stderr.on('data', (chunk) => {
    if (stderr.length < 4000) stderr += chunk.toString('utf8');
  });

  const closePromise = new Promise((resolve, reject) => {
    child.on('error', (error) => {
      reject(new Error(createProcessErrorMessage(command, error.code, stderr || error.message)));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(createProcessErrorMessage(command, code, stderr)));
    });
  });

  const streams = [];
  if (inputFile) {
    streams.push(pipeline(fs.createReadStream(inputFile), child.stdin));
  } else {
    child.stdin.end();
  }

  if (outputFile) {
    streams.push(pipeline(child.stdout, fs.createWriteStream(outputFile, { flags: 'wx' })));
  } else {
    child.stdout.resume();
  }

  await Promise.all([closePromise, ...streams]);
};

const runDump = async (outputFile) => {
  await runMysqlProcess({
    command: 'mysqldump',
    outputFile,
    args: [
      '--host', env.database.host,
      '--port', String(env.database.port),
      '--user', env.database.user,
      '--single-transaction',
      '--routines',
      '--events',
      '--triggers',
      '--default-character-set=utf8mb4',
      '--databases',
      env.database.database
    ]
  });
};

const runRestore = async (inputFile) => {
  await runMysqlProcess({
    command: 'mysql',
    inputFile,
    args: [
      '--host', env.database.host,
      '--port', String(env.database.port),
      '--user', env.database.user,
      '--default-character-set=utf8mb4',
      '--binary-mode=1',
      env.database.database
    ]
  });
};

const validateSqlBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new HttpError(422, 'Arquivo SQL vazio ou inválido');
  }
  if (buffer.length > backupConfig.maxUploadSizeBytes) {
    throw new HttpError(413, 'O backup deve ter no máximo 200 MB');
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 64 * 1024));
  if (sample.includes(0)) {
    throw new HttpError(415, 'O backup deve ser um arquivo SQL em texto');
  }
  const source = sample.toString('utf8');
  if (!/\b(CREATE|INSERT|ALTER|DROP|LOCK|SET|USE)\b/i.test(source)) {
    throw new HttpError(422, 'O arquivo não parece ser um backup SQL compatível');
  }
};

const validateSqlFile = async (filePath) => {
  const handle = await fsp.open(filePath, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0) {
      throw new HttpError(422, 'Arquivo de backup inválido');
    }
    if (stat.size > backupConfig.maxUploadSizeBytes) {
      throw new HttpError(413, 'O backup deve ter no máximo 200 MB');
    }
    const buffer = Buffer.alloc(Math.min(stat.size, 64 * 1024));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    validateSqlBuffer(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
};

const toPublicBackup = (backup) => ({
  id: backup.id,
  tipo: backup.tipo,
  status: backup.status,
  nome_arquivo: backup.nome_arquivo,
  nome_original: backup.nome_original,
  tamanho_bytes: backup.tamanho_bytes,
  criado_por_nome: backup.criado_por_nome || null,
  erro_mensagem: backup.erro_mensagem || null,
  iniciado_em: backup.iniciado_em,
  concluido_em: backup.concluido_em,
  pode_baixar: backup.status === 'SUCESSO' && !backup.excluido_em,
  pode_restaurar: backup.status === 'SUCESSO' && !backup.excluido_em
});

const listBackups = async () => {
  const backups = await backupsRepository.listBackups();
  const lastSuccessful = await backupsRepository.findLastSuccessful();
  return {
    backups: backups.map(toPublicBackup),
    ultimo_sucesso: lastSuccessful ? toPublicBackup(lastSuccessful) : null
  };
};

const createBackupRecordSafely = async (record) => {
  try {
    return await backupsRepository.createBackupRecord(record);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && record.autoRunKey) {
      return null;
    }
    throw error;
  }
};

const generateBackup = async ({
  type = 'MANUAL',
  userId = null,
  autoRunKey = null,
  context = null
} = {}) => {
  if (!typeToFilenamePart[type]) throw new HttpError(400, 'Tipo de backup inválido');

  await fsp.mkdir(backupConfig.storageDirectory, { recursive: true });
  const filename = buildBackupFilename(type);
  const storagePath = getSafeBackupPath(filename);
  const recordId = await createBackupRecordSafely({
    type,
    filename,
    storagePath,
    autoRunKey,
    createdById: userId
  });
  if (!recordId) return null;

  try {
    await runDump(storagePath);
    const stat = await fsp.stat(storagePath);
    if (!stat.isFile() || stat.size <= 0) {
      throw new Error('O backup gerado está vazio');
    }
    await backupsRepository.markBackupSuccess(recordId, { sizeBytes: stat.size });
    const backup = await backupsRepository.findById(recordId);
    await logAudit(context, type === 'AUTOMATICO' ? 'BACKUP_AUTOMATICO_GERADO' : 'BACKUP_GERADO', {
      backup_id: recordId,
      tipo: type,
      nome_arquivo: filename,
      tamanho_bytes: stat.size
    });
    return toPublicBackup(backup);
  } catch (error) {
    await removeFileQuietly(storagePath).catch(() => {});
    await backupsRepository.markBackupFailure(recordId, error.message);
    await logAudit(context, 'BACKUP_GERACAO_FALHOU', {
      backup_id: recordId,
      tipo: type,
      nome_arquivo: filename,
      erro: error.message
    }, 'FALHA').catch(() => {});
    throw new HttpError(500, 'Não foi possível gerar o backup');
  }
};

const getBackupForFileOperation = async (idValue) => {
  const id = String(idValue || '').trim();
  if (!/^\d+$/.test(id) || BigInt(id) <= 0n) throw new HttpError(400, 'Backup inválido');
  const backup = await backupsRepository.findById(id);
  if (!backup || backup.excluido_em) throw new HttpError(404, 'Backup não encontrado');
  if (backup.status !== 'SUCESSO') throw new HttpError(409, 'Backup ainda não está disponível');
  const storagePath = getSafeBackupPath(backup.nome_arquivo);
  if (path.resolve(backup.caminho_armazenamento) !== storagePath) {
    throw new HttpError(409, 'Registro de backup inconsistente');
  }
  return { backup, storagePath };
};

const getBackupDownload = async (id) => {
  const { backup, storagePath } = await getBackupForFileOperation(id);
  await validateSqlFile(storagePath);
  return {
    filename: backup.nome_arquivo,
    storagePath
  };
};

const deleteBackup = async (id, context) => {
  const { backup, storagePath } = await getBackupForFileOperation(id);
  await removeFileQuietly(storagePath);
  await backupsRepository.markDeleted(backup.id, context.user.id);
  await logAudit(context, 'BACKUP_EXCLUIDO', {
    backup_id: backup.id,
    nome_arquivo: backup.nome_arquivo
  });
  return { excluido: true };
};

const requireRestoreConfirmation = (confirmation) => {
  if (String(confirmation || '').trim() !== 'RESTAURAR') {
    throw new HttpError(400, 'Digite RESTAURAR para confirmar a restauração');
  }
};

const createRestoreSafetyBackup = async (context) => {
  const backup = await generateBackup({
    type: 'SEGURANCA_RESTAURACAO',
    userId: context.user.id,
    context
  });
  if (!backup?.id) {
    throw new HttpError(500, 'Não foi possível criar o backup de segurança');
  }
  return backupsRepository.findById(backup.id);
};

const restoreFromRecord = async ({ backup, storagePath, context }) => {
  await validateSqlFile(storagePath);
  const safetyBackup = await createRestoreSafetyBackup(context);
  const safetyPath = getSafeBackupPath(safetyBackup.nome_arquivo);
  const restoreId = await backupsRepository.createRestoreRecord({
    backupRecordId: backup.id,
    safetyBackupRecordId: safetyBackup.id,
    sourceFile: backup.nome_arquivo,
    performedById: context.user.id
  });

  try {
    await runRestore(storagePath);
    await backupsRepository.markRestoreSuccess(restoreId);
    await logAudit(context, 'BACKUP_RESTAURADO', {
      restore_id: restoreId,
      backup_id: backup.id,
      safety_backup_id: safetyBackup.id,
      arquivo: backup.nome_arquivo
    });
    return { restaurado: true, backup_seguranca_id: safetyBackup.id };
  } catch (error) {
    let rollbackError = null;
    try {
      await runRestore(safetyPath);
    } catch (recoveryError) {
      rollbackError = recoveryError;
    }

    const message = rollbackError
      ? 'A restauração falhou e a reversão automática também falhou'
      : 'A restauração falhou e o backup de segurança foi reaplicado';
    await backupsRepository.markRestoreFailure(restoreId, `${message}: ${error.message}`);
    await logAudit(context, 'BACKUP_RESTAURACAO_FALHOU', {
      restore_id: restoreId,
      backup_id: backup.id,
      safety_backup_id: safetyBackup.id,
      erro: error.message,
      reversao_erro: rollbackError?.message || null
    }, 'FALHA').catch(() => {});
    throw new HttpError(500, message);
  }
};

const restoreBackup = async ({ backupId, confirmation }, context) => {
  requireRestoreConfirmation(confirmation);
  const { backup, storagePath } = await getBackupForFileOperation(backupId);
  return restoreFromRecord({ backup, storagePath, context });
};

const restoreUploadedBackup = async ({ upload, confirmation }, context) => {
  requireRestoreConfirmation(confirmation);
  validateSqlBuffer(upload.buffer);
  await fsp.mkdir(backupConfig.storageDirectory, { recursive: true });
  const filename = buildBackupFilename('UPLOAD_RESTAURACAO');
  const storagePath = getSafeBackupPath(filename);
  await fsp.writeFile(storagePath, upload.buffer, { flag: 'wx' });

  let recordId;
  try {
    recordId = await backupsRepository.createBackupRecord({
      type: 'UPLOAD_RESTAURACAO',
      status: 'SUCESSO',
      filename,
      originalName: upload.originalName,
      storagePath,
      sizeBytes: upload.size,
      createdById: context.user.id
    });
  } catch (error) {
    await removeFileQuietly(storagePath).catch(() => {});
    throw error;
  }

  const backup = await backupsRepository.findById(recordId);
  return restoreFromRecord({ backup, storagePath, context });
};

const parseAutomaticBackupSettings = (settings) => {
  const enabled = settings[settingKeys.autoEnabled] === 'true' || settings[settingKeys.autoEnabled] === '1';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings[settingKeys.autoTime] || '')
    ? settings[settingKeys.autoTime]
    : defaultSettings.backupAutoTime;
  const retentionDays = [7, 15, 30].includes(Number(settings[settingKeys.retentionDays]))
    ? Number(settings[settingKeys.retentionDays])
    : defaultSettings.backupRetentionDays;
  return {
    backupAutoEnabled: enabled,
    backupAutoTime: time,
    backupRetentionDays: retentionDays
  };
};

const getAutomaticBackupStatus = async () => {
  const settings = parseAutomaticBackupSettings(await settingsRepository.getSettings(Object.values(settingKeys)));
  return {
    ativo: settings.backupAutoEnabled,
    horario: settings.backupAutoTime,
    retencao_dias: settings.backupRetentionDays,
    proximo_backup_em: getNextAutomaticBackupDate(settings)
  };
};

const buildAutoRunKey = (settings, referenceDate = new Date()) => {
  const datePart = [
    referenceDate.getFullYear(),
    String(referenceDate.getMonth() + 1).padStart(2, '0'),
    String(referenceDate.getDate()).padStart(2, '0')
  ].join('-');
  return `${datePart}T${settings.backupAutoTime}`;
};

const isAutomaticBackupDue = (settings, referenceDate = new Date()) => {
  if (!settings.backupAutoEnabled) return false;
  const [hour, minute] = settings.backupAutoTime.split(':').map(Number);
  const scheduled = new Date(referenceDate);
  scheduled.setHours(hour, minute, 0, 0);
  const windowStart = scheduled.getTime();
  const windowEnd = windowStart + 60 * 1000;
  return referenceDate.getTime() >= windowStart && referenceDate.getTime() < windowEnd;
};

const pruneExpiredAutomaticBackups = async (retentionDays, context = null) => {
  const backups = await backupsRepository.listAutomaticBackupsForPrune(retentionDays);
  for (const backup of backups) {
    const storagePath = getSafeBackupPath(backup.nome_arquivo);
    await removeFileQuietly(storagePath).catch(() => {});
    await backupsRepository.markDeleted(backup.id, null);
    await logAudit(context, 'BACKUP_AUTOMATICO_EXPIRADO_REMOVIDO', {
      backup_id: backup.id,
      nome_arquivo: backup.nome_arquivo,
      retencao_dias: retentionDays
    }).catch(() => {});
  }
};

const runDueAutomaticBackup = async () => {
  const settings = parseAutomaticBackupSettings(await settingsRepository.getSettings(Object.values(settingKeys)));
  if (!isAutomaticBackupDue(settings)) return null;

  const autoRunKey = buildAutoRunKey(settings);
  const existingRun = await backupsRepository.findByAutoRunKey(autoRunKey);
  if (existingRun) return null;

  const backup = await generateBackup({
    type: 'AUTOMATICO',
    autoRunKey,
    context: null
  });
  if (backup) await pruneExpiredAutomaticBackups(settings.backupRetentionDays);
  return backup;
};

export {
  backupFilenamePattern,
  getSafeBackupPath,
  pruneExpiredAutomaticBackups,
  runDueAutomaticBackup
};

export default {
  deleteBackup,
  generateBackup,
  getAutomaticBackupStatus,
  getBackupDownload,
  listBackups,
  restoreBackup,
  restoreUploadedBackup,
  runDueAutomaticBackup
};
