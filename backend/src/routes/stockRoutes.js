import { Router } from 'express';
import stockController from '../controllers/stockController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  validateStockAdjustment,
  validateStockEntry
} from '../validators/stockValidator.js';

const router = Router();

router.use(
  requireAuth,
  requireRole([authConfig.roles.admin], 'Você não tem permissão para esta ação.')
);

router.get('/summary', stockController.getSummary);
router.get('/products', stockController.listProducts);
router.get('/movements', stockController.listMovements);
router.get('/low-stock', stockController.listLowStockProducts);
router.post('/entries', validateStockEntry, stockController.createStockEntry);
router.post('/adjustments', validateStockAdjustment, stockController.createStockAdjustment);

export default router;
