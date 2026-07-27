import { Router } from 'express';
import reportsController from '../controllers/reportsController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
const reportRoles = [authConfig.roles.admin, authConfig.roles.viewer];

router.use(
  requireAuth,
  requireRole(reportRoles, 'Você não tem permissão para acessar relatórios.')
);

router.get('/options', reportsController.listOptions);
router.get('/summary', reportsController.getSummary);
router.get('/sales', reportsController.listSales);
router.get('/cash', reportsController.getCashReport);
router.get('/fiado', reportsController.getFiadoReport);
router.get('/payments', reportsController.getPaymentsReport);
router.get('/products', reportsController.getProductsReport);
router.get('/stock', reportsController.getStockReport);

export default router;
