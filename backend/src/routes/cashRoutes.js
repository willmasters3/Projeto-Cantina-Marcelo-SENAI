import { Router } from 'express';
import authConfig from '../config/auth.js';
import cashController from '../controllers/cashController.js';
import monitorController from '../controllers/monitorController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  validateCancellation,
  validateCloseSession,
  validateOpenSession,
  validateSale
} from '../validators/cashValidator.js';

const router = Router();
const cashRoles = [authConfig.roles.admin, authConfig.roles.cashier];

router.use(requireAuth, requireRole(cashRoles));

router.get('/session', cashController.getCurrentSession);
router.post('/session/open', validateOpenSession, cashController.openSession);
router.post('/session/close', validateCloseSession, cashController.closeSession);
router.post('/monitor-pairing', cashController.createMonitorPairing);
router.put('/monitor-state', monitorController.updateState);

router.get('/products', cashController.searchProducts);
router.get('/products/barcode/:barcode', cashController.getProductByBarcode);
router.get('/clients', cashController.searchClients);

router.get('/sales', cashController.listRecentSales);
router.post('/sales', validateSale, cashController.createSale);
router.post(
  '/sales/:id/cancel',
  requireRole([authConfig.roles.admin]),
  validateCancellation,
  cashController.cancelSale
);

export default router;
