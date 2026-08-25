import authConfig from '../config/auth.js';
import backupService from '../services/backupService.js';
import settingsService, { logAudit } from '../services/settingsService.js';

const getContext = (req) => ({
  user: req.user,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'] || null
});

const truncateDetail = (value) => String(value || '').trim().slice(0, 255) || null;

const registerFailure = async (req, action, error, details = {}) => {
  await logAudit(getContext(req), action, {
    ...details,
    erro: String(error?.message || 'Falha na operação').slice(0, 500)
  }, 'FALHA').catch(() => {});
};

const statusAction = (value) => {
  const normalized = String(value).trim().toLowerCase();
  return value === true || value === 1 || normalized === 'true' || normalized === '1'
    ? 'USUARIO_REATIVADO'
    : 'USUARIO_INATIVADO';
};

const getOverview = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.getOverview() });
  } catch (error) {
    next(error);
  }
};

const getAboutLicense = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.getAboutLicense() });
  } catch (error) {
    next(error);
  }
};

const listRoles = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.listRoles() });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.listUsers(req.query) });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await settingsService.createUser(req.body, getContext(req));
    res.status(201).json({ data: user });
  } catch (error) {
    await registerFailure(req, 'USUARIO_CRIADO', error, {
      login: truncateDetail(req.body?.login),
      perfil: truncateDetail(req.body?.perfil)
    });
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await settingsService.updateUser(req.params.id, req.body, getContext(req));
    res.status(200).json({ data: user });
  } catch (error) {
    await registerFailure(req, 'USUARIO_EDITADO', error, {
      usuario_id: req.params.id,
      login: truncateDetail(req.body?.login),
      perfil: truncateDetail(req.body?.perfil)
    });
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const user = await settingsService.updateUserStatus(
      req.params.id,
      req.body?.ativo,
      getContext(req)
    );
    res.status(200).json({ data: user });
  } catch (error) {
    await registerFailure(req, statusAction(req.body?.ativo), error, {
      usuario_id: req.params.id
    });
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const result = await settingsService.resetUserPassword(req.params.id, req.body, getContext(req));
    res.status(200).json({ data: result });
  } catch (error) {
    await registerFailure(req, 'USUARIO_SENHA_REDEFINIDA', error, {
      usuario_id: req.params.id
    });
    next(error);
  }
};

const changeOwnPassword = async (req, res, next) => {
  try {
    const currentToken = req.cookies?.[authConfig.cookieName] || null;
    const result = await settingsService.changeOwnPassword(req.body, getContext(req), currentToken);
    res.status(200).json({ data: result });
  } catch (error) {
    await registerFailure(req, 'PROPRIA_SENHA_ALTERADA', error);
    next(error);
  }
};

const getTerminalMonitor = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.getTerminalMonitorInfo() });
  } catch (error) {
    next(error);
  }
};

const updateTerminal = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await settingsService.updateTerminalSettings(req.body, getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'TERMINAL_CONFIGURADO', error, {
      nome_exibicao: truncateDetail(req.body?.nome_exibicao)
    });
    next(error);
  }
};

const updateMonitor = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await settingsService.updateMonitorSettings(req.body, getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'MONITOR_PROTETOR_CONFIGURADO', error, {
      screensaver_ativo: req.body?.screensaver_ativo,
      screensaver_tempo_inatividade: req.body?.screensaver_tempo_inatividade,
      privacidade_limpar_apos: req.body?.privacidade_limpar_apos
    });
    next(error);
  }
};

const uploadScreensaverImage = async (req, res, next) => {
  try {
    res.status(201).json({
      data: await settingsService.uploadScreensaverImage(req.monitorImageUpload, getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'MONITOR_PROTETOR_IMAGEM_ALTERADA', error, {
      nome_original: truncateDetail(req.monitorImageUpload?.originalName)
    });
    next(error);
  }
};

const removeScreensaverImage = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await settingsService.removeScreensaverImage(getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'MONITOR_PROTETOR_IMAGEM_REMOVIDA', error);
    next(error);
  }
};

const getBackupSettings = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.getBackupSettings() });
  } catch (error) {
    next(error);
  }
};

const updateBackupSettings = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await settingsService.updateBackupSettings(req.body, getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'BACKUP_AUTOMATICO_CONFIGURADO', error, {
      ativo: req.body?.ativo,
      horario: truncateDetail(req.body?.horario),
      retencao_dias: req.body?.retencao_dias
    });
    next(error);
  }
};

const listBackups = async (req, res, next) => {
  try {
    res.status(200).json({ data: await backupService.listBackups() });
  } catch (error) {
    next(error);
  }
};

const generateBackup = async (req, res, next) => {
  try {
    const backup = await backupService.generateBackup({
      type: 'MANUAL',
      userId: req.user.id,
      context: getContext(req)
    });
    res.status(201).json({ data: backup });
  } catch (error) {
    next(error);
  }
};

const downloadBackup = async (req, res, next) => {
  try {
    const backup = await backupService.getBackupDownload(req.params.id);
    res.download(backup.storagePath, backup.filename, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
};

const deleteBackup = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await backupService.deleteBackup(req.params.id, getContext(req))
    });
  } catch (error) {
    await registerFailure(req, 'BACKUP_EXCLUIDO', error, {
      backup_id: req.params.id
    });
    next(error);
  }
};

const restoreBackup = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await backupService.restoreBackup(req.body, getContext(req))
    });
  } catch (error) {
    if (error.status !== 500) {
      await registerFailure(req, 'BACKUP_RESTAURADO', error, {
        backup_id: req.body?.backupId
      });
    }
    next(error);
  }
};

const restoreUploadedBackup = async (req, res, next) => {
  try {
    res.status(200).json({
      data: await backupService.restoreUploadedBackup({
        upload: req.backupUpload,
        confirmation: req.query.confirmacao || req.headers['x-restore-confirmation']
      }, getContext(req))
    });
  } catch (error) {
    if (error.status !== 500) {
      await registerFailure(req, 'BACKUP_RESTAURADO', error, {
        nome_original: truncateDetail(req.backupUpload?.originalName)
      });
    }
    next(error);
  }
};

const listAudit = async (req, res, next) => {
  try {
    res.status(200).json({ data: await settingsService.listAudit(req.query) });
  } catch (error) {
    next(error);
  }
};

export default {
  changeOwnPassword,
  createUser,
  deleteBackup,
  downloadBackup,
  generateBackup,
  getAboutLicense,
  getBackupSettings,
  getOverview,
  getTerminalMonitor,
  listAudit,
  listBackups,
  listRoles,
  listUsers,
  removeScreensaverImage,
  resetUserPassword,
  restoreBackup,
  restoreUploadedBackup,
  updateBackupSettings,
  updateMonitor,
  updateTerminal,
  updateUser,
  updateUserStatus,
  uploadScreensaverImage
};
