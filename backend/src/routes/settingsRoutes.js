import { Router } from 'express';
import authConfig from '../config/auth.js';
import settingsController from '../controllers/settingsController.js';
import backupUploadMiddleware from '../middlewares/backupUploadMiddleware.js';
import monitorImageUploadMiddleware from '../middlewares/monitorImageUploadMiddleware.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(
  requireAuth,
  requireRole([authConfig.roles.admin], 'Você não tem permissão para acessar Configurações.')
);

router.get('/overview', settingsController.getOverview);
router.get('/roles', settingsController.listRoles);

router.get('/users', settingsController.listUsers);
router.post('/users', settingsController.createUser);
router.put('/users/:id', settingsController.updateUser);
router.patch('/users/:id/status', settingsController.updateUserStatus);
router.post('/users/:id/password', settingsController.resetUserPassword);

router.post('/password', settingsController.changeOwnPassword);

router.get('/terminal-monitor', settingsController.getTerminalMonitor);
router.put('/terminal', settingsController.updateTerminal);
router.put('/monitor', settingsController.updateMonitor);
router.post(
  '/monitor/screensaver-image',
  monitorImageUploadMiddleware,
  settingsController.uploadScreensaverImage
);
router.delete('/monitor/screensaver-image', settingsController.removeScreensaverImage);

router.get('/backup-settings', settingsController.getBackupSettings);
router.put('/backup-settings', settingsController.updateBackupSettings);
router.get('/backups', settingsController.listBackups);
router.post('/backups', settingsController.generateBackup);
router.get('/backups/:id/download', settingsController.downloadBackup);
router.delete('/backups/:id', settingsController.deleteBackup);
router.post('/backups/restore', settingsController.restoreBackup);
router.post(
  '/backups/restore-upload',
  backupUploadMiddleware,
  settingsController.restoreUploadedBackup
);

router.get('/audit', settingsController.listAudit);

export default router;
