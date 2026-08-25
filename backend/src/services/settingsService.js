import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import authConfig from '../config/auth.js';
import env from '../config/env.js';
import monitorAssetsConfig from '../config/monitorAssets.js';
import softwareInfo from '../config/softwareInfo.js';
import { testConnection } from '../config/database.js';
import auditRepository from '../repositories/auditRepository.js';
import authSessionsRepository from '../repositories/authSessionsRepository.js';
import backupsRepository from '../repositories/backupsRepository.js';
import cashRepository from '../repositories/cashRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import usersRepository from '../repositories/usersRepository.js';
import authService from './authService.js';
import monitorStateService from './monitorStateService.js';
import HttpError from '../utils/httpError.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPackage = require('../../package.json');
const licenseFilePath = path.resolve(__dirname, '../../../LICENSE.txt');
const licenseSectionTitle = '# LICENÇA DE USO DO SISTEMA CANTINA';

const manageableRoles = [authConfig.roles.admin, authConfig.roles.cashier];
const generatedScreensaverPattern = /^screensaver-[a-f0-9]{12}\.(?:jpg|png|webp)$/;
const defaultSettings = {
  terminalCode: 'CAIXA-01',
  terminalDisplayName: 'CAIXA-01',
  terminalActive: true,
  screensaverEnabled: false,
  screensaverImageFilename: '',
  screensaverImageMime: '',
  screensaverImageSize: 0,
  screensaverIdleSeconds: 60,
  screensaverMessage: 'Toque na tela para consultar sua conta',
  privacyClearSeconds: 30,
  backupAutoEnabled: false,
  backupAutoTime: '23:00',
  backupRetentionDays: 15
};

const settingKeys = {
  terminalCode: 'terminal.codigo',
  terminalDisplayName: 'terminal.nome_exibicao',
  terminalActive: 'terminal.ativo',
  screensaverEnabled: 'monitor.screensaver_enabled',
  screensaverImageFilename: 'monitor.screensaver_image_filename',
  screensaverImageMime: 'monitor.screensaver_image_mime',
  screensaverImageSize: 'monitor.screensaver_image_size',
  screensaverIdleSeconds: 'monitor.screensaver_idle_seconds',
  screensaverMessage: 'monitor.screensaver_message',
  privacyClearSeconds: 'monitor.privacy_clear_seconds',
  backupAutoEnabled: 'backup.auto_enabled',
  backupAutoTime: 'backup.auto_time',
  backupRetentionDays: 'backup.retention_days'
};

const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const parseBooleanSetting = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 1;
};

const normalizeBooleanInput = (value, fieldName = 'Campo') => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new HttpError(400, `${fieldName} inválido`);
};

const parseIntegerSetting = (value, fallback, allowedValues = null) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (allowedValues && !allowedValues.includes(parsed)) return fallback;
  return parsed;
};

const applyDefaults = (rows = {}) => ({
  terminalCode: String(rows[settingKeys.terminalCode] || defaultSettings.terminalCode).trim().toUpperCase(),
  terminalDisplayName: String(rows[settingKeys.terminalDisplayName] || defaultSettings.terminalDisplayName).trim(),
  terminalActive: parseBooleanSetting(rows[settingKeys.terminalActive], defaultSettings.terminalActive),
  screensaverEnabled: parseBooleanSetting(
    rows[settingKeys.screensaverEnabled],
    defaultSettings.screensaverEnabled
  ),
  screensaverImageFilename: String(rows[settingKeys.screensaverImageFilename] || '').trim(),
  screensaverImageMime: String(rows[settingKeys.screensaverImageMime] || '').trim(),
  screensaverImageSize: parseIntegerSetting(
    rows[settingKeys.screensaverImageSize],
    defaultSettings.screensaverImageSize
  ),
  screensaverIdleSeconds: parseIntegerSetting(
    rows[settingKeys.screensaverIdleSeconds],
    defaultSettings.screensaverIdleSeconds,
    [30, 60, 120, 300, 600]
  ),
  screensaverMessage: String(
    rows[settingKeys.screensaverMessage] || defaultSettings.screensaverMessage
  ).trim() || defaultSettings.screensaverMessage,
  privacyClearSeconds: parseIntegerSetting(
    rows[settingKeys.privacyClearSeconds],
    defaultSettings.privacyClearSeconds,
    [15, 30, 60, 120]
  ),
  backupAutoEnabled: parseBooleanSetting(
    rows[settingKeys.backupAutoEnabled],
    defaultSettings.backupAutoEnabled
  ),
  backupAutoTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(rows[settingKeys.backupAutoTime] || ''))
    ? String(rows[settingKeys.backupAutoTime])
    : defaultSettings.backupAutoTime,
  backupRetentionDays: parseIntegerSetting(
    rows[settingKeys.backupRetentionDays],
    defaultSettings.backupRetentionDays,
    [7, 15, 30]
  )
});

const getSettings = async (executor = undefined) => {
  const rows = await settingsRepository.getSettings(Object.values(settingKeys), executor);
  return applyDefaults(rows);
};

const getPackageVersion = () => String(backendPackage.version || '').trim() || 'Não informado';

const normalizeLicenseField = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const readLicenseText = async () => {
  try {
    const fileContent = (await fs.readFile(licenseFilePath, 'utf8')).trim();
    const sectionStart = fileContent.indexOf(licenseSectionTitle);
    return sectionStart >= 0 ? fileContent.slice(sectionStart).trim() : fileContent;
  } catch {
    return 'Licença de uso não disponível nesta instalação.';
  }
};

const getAboutLicense = async () => {
  const version = getPackageVersion();
  return {
    sistema: {
      nome: softwareInfo.name,
      descricao: softwareInfo.description,
      versao: version
    },
    desenvolvedor: {
      nome: softwareInfo.developer.name,
      email: softwareInfo.developer.email,
      linkedin: softwareInfo.developer.linkedin,
      ano: softwareInfo.developer.year,
      direitos_autorais: softwareInfo.developer.copyright
    },
    licenca: {
      licenciado_para: normalizeLicenseField(env.license.licensedTo),
      identificacao_instalacao: normalizeLicenseField(env.license.installationId),
      versao_licenciada: version,
      data_entrega: normalizeLicenseField(env.license.deliveryDate),
      validade_tecnica_versao: normalizeLicenseField(env.license.technicalValidUntil),
      situacao: softwareInfo.licenseStatus,
      texto: await readLicenseText()
    }
  };
};

const toPublicImageUrl = (filename) => (
  generatedScreensaverPattern.test(filename)
    ? `${monitorAssetsConfig.publicPrefix}${filename}`
    : null
);

const toPublicMonitorSettings = (settings) => ({
  privacy_clear_seconds: settings.privacyClearSeconds,
  screensaver: {
    enabled: settings.screensaverEnabled,
    idle_seconds: settings.screensaverIdleSeconds,
    message: settings.screensaverMessage,
    image_url: toPublicImageUrl(settings.screensaverImageFilename)
  }
});

const toTerminalSettings = (settings) => ({
  codigo: settings.terminalCode,
  nome_exibicao: settings.terminalDisplayName,
  ativo: settings.terminalActive
});

const toMonitorSettings = (settings) => ({
  screensaver_ativo: settings.screensaverEnabled,
  screensaver_tempo_inatividade: settings.screensaverIdleSeconds,
  screensaver_mensagem: settings.screensaverMessage,
  privacidade_limpar_apos: settings.privacyClearSeconds,
  imagem: settings.screensaverImageFilename
    ? {
        nome_arquivo: settings.screensaverImageFilename,
        mime_type: settings.screensaverImageMime,
        tamanho_bytes: settings.screensaverImageSize,
        url: toPublicImageUrl(settings.screensaverImageFilename)
      }
    : null
});

const logAudit = async (context, action, details = {}, result = 'SUCESSO', executor = undefined) => {
  await auditRepository.createLog({
    userId: context?.user?.id || null,
    action,
    result,
    details,
    ipAddress: context?.ipAddress || null,
    userAgent: context?.userAgent || null
  }, executor);
};

const normalizeId = (value, label = 'Registro') => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized) || BigInt(normalized) <= 0n) {
    throw new HttpError(400, `${label} inválido`);
  }
  return normalized;
};

const normalizeName = (value) => {
  if (typeof value !== 'string') throw new HttpError(400, 'Nome completo é obrigatório');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3) throw new HttpError(400, 'Nome completo deve ter ao menos 3 caracteres');
  if (normalized.length > 150) throw new HttpError(400, 'Nome completo deve ter no máximo 150 caracteres');
  return normalized;
};

const normalizeLogin = (value) => {
  if (typeof value !== 'string') throw new HttpError(400, 'Login é obrigatório');
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 255) {
    throw new HttpError(400, 'Login deve ter entre 3 e 255 caracteres');
  }
  if (!/^[a-z0-9._@-]+$/.test(normalized)) {
    throw new HttpError(400, 'Login deve conter apenas letras, números, ponto, hífen, underline ou @');
  }
  return normalized;
};

const normalizePassword = (value, fieldName = 'Senha') => {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, `${fieldName} deve ter pelo menos 8 caracteres`);
  }
  if (value.length > 128) {
    throw new HttpError(400, `${fieldName} deve ter no máximo 128 caracteres`);
  }
  return value;
};

const normalizeRoleSlug = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!manageableRoles.includes(normalized)) {
    throw new HttpError(400, 'Perfil inválido');
  }
  return normalized;
};

const toManagedUser = (user) => ({
  id: user.id,
  nome: user.nome,
  login: user.email,
  perfil: {
    slug: user.role_slug,
    nome: user.role_nome
  },
  ativo: Boolean(user.ativo),
  ultimo_acesso_em: user.last_login_at,
  criado_em: user.created_at,
  atualizado_em: user.updated_at
});

const listUsers = async (filters = {}) => {
  const role = filters.role ? normalizeRoleSlug(filters.role) : '';
  const status = ['active', 'inactive', 'all'].includes(filters.status) ? filters.status : 'all';
  const users = await usersRepository.listInternalUsers({
    search: String(filters.search || '').trim(),
    role,
    status
  });
  return users.map(toManagedUser);
};

const listRoles = async () => {
  const roles = await usersRepository.listRoles(manageableRoles);
  return roles.map((role) => ({
    id: role.id,
    slug: role.slug,
    nome: role.nome,
    descricao: role.descricao
  }));
};

const getRoleOrFail = async (roleSlug, executor) => {
  const role = await usersRepository.findRoleBySlug(roleSlug, executor);
  if (!role) throw new HttpError(422, 'Perfil não encontrado no banco de dados');
  return role;
};

const createUser = async (payload, context) => {
  const name = normalizeName(payload.nome);
  const login = normalizeLogin(payload.login);
  const password = normalizePassword(payload.senha);
  if (password !== payload.confirmacao_senha) {
    throw new HttpError(400, 'A confirmação da senha não confere');
  }
  const roleSlug = normalizeRoleSlug(payload.perfil);
  const active = payload.ativo === undefined ? true : normalizeBooleanInput(payload.ativo, 'Status');

  try {
    return await usersRepository.withTransaction(async (connection) => {
      const role = await getRoleOrFail(roleSlug, connection);
      const passwordHash = await authService.hashPassword(password);
      const userId = await usersRepository.createUser({
        name,
        login,
        passwordHash,
        roleId: role.id,
        active
      }, connection);
      const user = await usersRepository.findInternalUserById(userId, connection);
      await logAudit(context, 'USUARIO_CRIADO', {
        usuario_id: userId,
        login,
        perfil: roleSlug,
        ativo: active
      }, 'SUCESSO', connection);
      return toManagedUser(user);
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Já existe um usuário com esse login');
    }
    throw error;
  }
};

const updateUser = async (idValue, payload, context) => {
  const id = normalizeId(idValue, 'Usuário');
  const name = normalizeName(payload.nome);
  const login = normalizeLogin(payload.login);
  const roleSlug = normalizeRoleSlug(payload.perfil);

  try {
    return await usersRepository.withTransaction(async (connection) => {
      const current = await usersRepository.findInternalUserById(id, connection, true);
      if (!current) throw new HttpError(404, 'Usuário não encontrado');
      const role = await getRoleOrFail(roleSlug, connection);
      const removingLastAdmin = current.ativo
        && current.role_slug === authConfig.roles.admin
        && roleSlug !== authConfig.roles.admin;
      if (removingLastAdmin) {
        const otherAdmins = await usersRepository.countActiveAdmins({ excludeUserId: id }, connection);
        if (otherAdmins === 0) {
          throw new HttpError(409, 'O último administrador ativo não pode perder o perfil de administrador');
        }
      }

      await usersRepository.updateUser(id, { name, login, roleId: role.id }, connection);
      const user = await usersRepository.findInternalUserById(id, connection);
      await logAudit(context, current.role_slug !== roleSlug ? 'USUARIO_PERFIL_ALTERADO' : 'USUARIO_EDITADO', {
        usuario_id: id,
        login_anterior: current.email,
        login_novo: login,
        perfil_anterior: current.role_slug,
        perfil_novo: roleSlug
      }, 'SUCESSO', connection);
      return toManagedUser(user);
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Já existe um usuário com esse login');
    }
    throw error;
  }
};

const updateUserStatus = async (idValue, active, context) => {
  const id = normalizeId(idValue, 'Usuário');
  const normalizedActive = normalizeBooleanInput(active, 'Status');

  return usersRepository.withTransaction(async (connection) => {
    const current = await usersRepository.findInternalUserById(id, connection, true);
    if (!current) throw new HttpError(404, 'Usuário não encontrado');
    if (!normalizedActive && Number(context.user.id) === Number(id)) {
      throw new HttpError(409, 'Você não pode inativar a própria conta');
    }
    if (!normalizedActive && current.ativo && current.role_slug === authConfig.roles.admin) {
      const otherAdmins = await usersRepository.countActiveAdmins({ excludeUserId: id }, connection);
      if (otherAdmins === 0) {
        throw new HttpError(409, 'O último administrador ativo não pode ser inativado');
      }
    }

    await usersRepository.updateStatus(id, normalizedActive, connection);
    if (!normalizedActive) await authSessionsRepository.invalidateUserSessions(id, {}, connection);
    const user = await usersRepository.findInternalUserById(id, connection);
    await logAudit(context, normalizedActive ? 'USUARIO_REATIVADO' : 'USUARIO_INATIVADO', {
      usuario_id: id,
      login: current.email
    }, 'SUCESSO', connection);
    return toManagedUser(user);
  });
};

const resetUserPassword = async (idValue, payload, context) => {
  const id = normalizeId(idValue, 'Usuário');
  const password = normalizePassword(payload.senha, 'Nova senha');
  if (password !== payload.confirmacao_senha) {
    throw new HttpError(400, 'A confirmação da senha não confere');
  }

  return usersRepository.withTransaction(async (connection) => {
    const user = await usersRepository.findInternalUserById(id, connection, true);
    if (!user) throw new HttpError(404, 'Usuário não encontrado');
    const passwordHash = await authService.hashPassword(password);
    await usersRepository.updatePassword(id, passwordHash, connection);
    await authSessionsRepository.invalidateUserSessions(id, {}, connection);
    await logAudit(context, 'USUARIO_SENHA_REDEFINIDA', {
      usuario_id: id,
      login: user.email
    }, 'SUCESSO', connection);
    return { redefinida: true };
  });
};

const changeOwnPassword = async (payload, context, currentSessionToken = null) => {
  const currentPassword = normalizePassword(payload.senha_atual || '', 'Senha atual');
  const newPassword = normalizePassword(payload.nova_senha, 'Nova senha');
  if (newPassword !== payload.confirmacao_senha) {
    throw new HttpError(400, 'A confirmação da nova senha não confere');
  }
  if (newPassword === currentPassword) {
    throw new HttpError(400, 'A nova senha deve ser diferente da senha atual');
  }

  return usersRepository.withTransaction(async (connection) => {
    const user = await usersRepository.findPasswordById(context.user.id, connection);
    if (!user || !user.ativo) throw new HttpError(404, 'Usuário não encontrado');
    const passwordMatches = await authService.verifyPassword(currentPassword, user.password_hash);
    if (!passwordMatches) throw new HttpError(401, 'Senha atual inválida');

    const passwordHash = await authService.hashPassword(newPassword);
    await usersRepository.updatePassword(user.id, passwordHash, connection);
    const exceptTokenHash = currentSessionToken
      ? authService.getSessionTokenHash(currentSessionToken)
      : null;
    await authSessionsRepository.invalidateUserSessions(user.id, { exceptTokenHash }, connection);
    await logAudit(context, 'PROPRIA_SENHA_ALTERADA', {
      usuario_id: user.id
    }, 'SUCESSO', connection);
    return { alterada: true };
  });
};

const normalizeTerminalDisplayName = (value) => {
  if (typeof value !== 'string') throw new HttpError(400, 'Nome do terminal é obrigatório');
  const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalized.length < 3 || normalized.length > 50) {
    throw new HttpError(400, 'Nome do terminal deve ter entre 3 e 50 caracteres');
  }
  if (!/^[A-Z0-9 _-]+$/.test(normalized)) {
    throw new HttpError(400, 'Nome do terminal deve conter letras, números, espaços, hífen ou underline');
  }
  return normalized;
};

const updateTerminalSettings = async (payload, context) => {
  const terminalDisplayName = normalizeTerminalDisplayName(payload.nome_exibicao);
  await settingsRepository.upsertSettings({
    [settingKeys.terminalDisplayName]: terminalDisplayName
  }, context.user.id);
  await logAudit(context, 'TERMINAL_CONFIGURADO', {
    nome_exibicao: terminalDisplayName
  });
  const settings = await getSettings();
  return toTerminalSettings(settings);
};

const normalizeMonitorSettings = (payload) => {
  const idleSeconds = Number(payload.screensaver_tempo_inatividade);
  const privacySeconds = Number(payload.privacidade_limpar_apos);
  const message = String(payload.screensaver_mensagem || '').trim().replace(/\s+/g, ' ');

  if (![30, 60, 120, 300, 600].includes(idleSeconds)) {
    throw new HttpError(400, 'Tempo de inatividade do protetor inválido');
  }
  if (![15, 30, 60, 120].includes(privacySeconds)) {
    throw new HttpError(400, 'Tempo de privacidade inválido');
  }
  if (message.length < 3 || message.length > 120) {
    throw new HttpError(400, 'Mensagem do protetor deve ter entre 3 e 120 caracteres');
  }

  return {
    screensaverEnabled: normalizeBooleanInput(payload.screensaver_ativo, 'Status do protetor'),
    idleSeconds,
    privacySeconds,
    message
  };
};

const updateMonitorSettings = async (payload, context) => {
  const settings = normalizeMonitorSettings(payload);
  await settingsRepository.upsertSettings({
    [settingKeys.screensaverEnabled]: settings.screensaverEnabled,
    [settingKeys.screensaverIdleSeconds]: settings.idleSeconds,
    [settingKeys.screensaverMessage]: settings.message,
    [settingKeys.privacyClearSeconds]: settings.privacySeconds
  }, context.user.id);
  await logAudit(context, 'MONITOR_PROTETOR_CONFIGURADO', {
    screensaver_ativo: settings.screensaverEnabled,
    screensaver_tempo_inatividade: settings.idleSeconds,
    privacidade_limpar_apos: settings.privacySeconds
  });
  return toMonitorSettings(await getSettings());
};

const getSafeMonitorImagePath = (filename) => {
  if (!generatedScreensaverPattern.test(filename)) {
    throw new HttpError(400, 'Nome de arquivo de protetor inválido');
  }
  const resolvedPath = path.resolve(monitorAssetsConfig.storageDirectory, filename);
  if (path.dirname(resolvedPath) !== monitorAssetsConfig.storageDirectory) {
    throw new HttpError(400, 'Caminho de imagem inválido');
  }
  return resolvedPath;
};

const removeStoredMonitorImage = async (filename) => {
  if (!filename || !generatedScreensaverPattern.test(filename)) return;
  try {
    await fs.unlink(getSafeMonitorImagePath(filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[monitor-assets] Falha ao remover ${filename}: ${error.stack || error.message}`);
    }
  }
};

const uploadScreensaverImage = async (upload, context) => {
  const extension = extensionByMime.get(upload.mimeType);
  if (!extension) throw new HttpError(415, 'Formato de imagem não permitido');

  const settings = await getSettings();
  await fs.mkdir(monitorAssetsConfig.storageDirectory, { recursive: true });
  const filename = `screensaver-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const storagePath = getSafeMonitorImagePath(filename);
  await fs.writeFile(storagePath, upload.buffer, { flag: 'wx' });

  try {
    await settingsRepository.upsertSettings({
      [settingKeys.screensaverImageFilename]: filename,
      [settingKeys.screensaverImageMime]: upload.mimeType,
      [settingKeys.screensaverImageSize]: upload.size
    }, context.user.id);
    await logAudit(context, 'MONITOR_PROTETOR_IMAGEM_ALTERADA', {
      nome_arquivo: filename,
      mime_type: upload.mimeType,
      tamanho_bytes: upload.size
    });
  } catch (error) {
    await removeStoredMonitorImage(filename);
    throw error;
  }

  await removeStoredMonitorImage(settings.screensaverImageFilename);
  return toMonitorSettings(await getSettings());
};

const removeScreensaverImage = async (context) => {
  const settings = await getSettings();
  await settingsRepository.upsertSettings({
    [settingKeys.screensaverImageFilename]: '',
    [settingKeys.screensaverImageMime]: '',
    [settingKeys.screensaverImageSize]: '0'
  }, context.user.id);
  await removeStoredMonitorImage(settings.screensaverImageFilename);
  await logAudit(context, 'MONITOR_PROTETOR_IMAGEM_REMOVIDA', {
    nome_arquivo: settings.screensaverImageFilename || null
  });
  return toMonitorSettings(await getSettings());
};

const getPublicMonitorImage = async (filename) => {
  if (!generatedScreensaverPattern.test(filename)) {
    throw new HttpError(404, 'Imagem não encontrada');
  }
  const settings = await getSettings();
  if (settings.screensaverImageFilename !== filename) {
    throw new HttpError(404, 'Imagem não encontrada');
  }
  return {
    filename,
    mimeType: settings.screensaverImageMime || 'application/octet-stream',
    storageDirectory: monitorAssetsConfig.storageDirectory
  };
};

const getTerminalMonitorInfo = async () => {
  const settings = await getSettings();
  const openSession = await cashRepository.findOpenSession(settings.terminalCode);
  const runtime = monitorStateService.getRuntimeInfo(settings.terminalCode);
  return {
    terminal: {
      ...toTerminalSettings(settings),
      situacao: openSession ? 'CAIXA_ABERTO' : 'SEM_CAIXA_ABERTO',
      caixa_aberto_em: openSession?.aberto_em || null
    },
    monitor: {
      vinculado: runtime.monitor_conectado,
      situacao: runtime.monitor_conectado ? 'CONECTADO' : 'DESCONECTADO',
      estado_atual: runtime.estado_atual,
      ultima_atualizacao_em: runtime.atualizado_em
    },
    configuracoes: toMonitorSettings(settings)
  };
};

const getAutomaticBackupSettings = (settings) => ({
  ativo: settings.backupAutoEnabled,
  horario: settings.backupAutoTime,
  retencao_dias: settings.backupRetentionDays
});

const getNextAutomaticBackupDate = (settings, referenceDate = new Date()) => {
  if (!settings.backupAutoEnabled) return null;
  const [hour, minute] = settings.backupAutoTime.split(':').map(Number);
  const next = new Date(referenceDate);
  next.setHours(hour, minute, 0, 0);
  if (next <= referenceDate) next.setDate(next.getDate() + 1);
  return next.toISOString();
};

const getSystemInfo = async () => {
  const settings = await getSettings();
  const lastBackup = await backupsRepository.findLastSuccessful();
  let databaseStatus = 'unavailable';
  try {
    await testConnection();
    databaseStatus = 'connected';
  } catch {
    databaseStatus = 'unavailable';
  }

  return {
    versao: getPackageVersion(),
    banco: databaseStatus,
    terminal_atual: settings.terminalDisplayName,
    ultimo_backup_sucesso_em: lastBackup?.concluido_em || null,
    backup_automatico: {
      ...getAutomaticBackupSettings(settings),
      proximo_backup_em: getNextAutomaticBackupDate(settings)
    }
  };
};

const getOverview = async () => {
  const settings = await getSettings();
  const [activeUsers, activeAdmins, lastBackup, terminalInfo, systemInfo] = await Promise.all([
    usersRepository.countActiveInternalUsers(),
    usersRepository.countActiveAdmins(),
    backupsRepository.findLastSuccessful(),
    getTerminalMonitorInfo(),
    getSystemInfo()
  ]);

  return {
    resumo: {
      usuarios_ativos: activeUsers,
      administradores: activeAdmins,
      terminal_atual: settings.terminalDisplayName,
      ultimo_backup: lastBackup
        ? {
            status: lastBackup.status,
            concluido_em: lastBackup.concluido_em,
            nome_arquivo: lastBackup.nome_arquivo,
            tamanho_bytes: lastBackup.tamanho_bytes
          }
        : null
    },
    terminal_monitor: terminalInfo,
    sistema: systemInfo
  };
};

const getBackupSettings = async () => {
  const settings = await getSettings();
  return {
    ...getAutomaticBackupSettings(settings),
    proximo_backup_em: getNextAutomaticBackupDate(settings)
  };
};

const updateBackupSettings = async (payload, context) => {
  const time = String(payload.horario || '').trim();
  const retentionDays = Number(payload.retencao_dias);
  const automaticEnabled = normalizeBooleanInput(payload.ativo, 'Status do backup automático');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new HttpError(400, 'Horário do backup automático inválido');
  }
  if (![7, 15, 30].includes(retentionDays)) {
    throw new HttpError(400, 'Retenção de backup inválida');
  }

  await settingsRepository.upsertSettings({
    [settingKeys.backupAutoEnabled]: automaticEnabled,
    [settingKeys.backupAutoTime]: time,
    [settingKeys.backupRetentionDays]: retentionDays
  }, context.user.id);
  await logAudit(context, 'BACKUP_AUTOMATICO_CONFIGURADO', {
    ativo: automaticEnabled,
    horario: time,
    retencao_dias: retentionDays
  });
  return getBackupSettings();
};

const listAudit = async (query = {}) => {
  const result = await auditRepository.listRecent({
    limit: query.limit,
    offset: query.offset
  });
  return {
    ...result,
    items: result.items.map((item) => ({
      id: item.id,
      usuario_nome: item.usuario_nome || 'Sistema',
      usuario_login: item.usuario_login || null,
      acao: item.acao,
      resultado: item.resultado,
      detalhes: item.detalhes_json,
      criado_em: item.criado_em
    }))
  };
};

export {
  defaultSettings,
  generatedScreensaverPattern,
  getNextAutomaticBackupDate,
  getSafeMonitorImagePath,
  logAudit
};

export default {
  changeOwnPassword,
  createUser,
  getAboutLicense,
  getBackupSettings,
  getOverview,
  getPublicMonitorImage,
  getPublicMonitorSettings: async () => toPublicMonitorSettings(await getSettings()),
  getSystemInfo,
  getTerminalMonitorInfo,
  listAudit,
  listRoles,
  listUsers,
  removeScreensaverImage,
  resetUserPassword,
  updateBackupSettings,
  updateMonitorSettings,
  updateTerminalSettings,
  updateUser,
  updateUserStatus,
  uploadScreensaverImage
};
