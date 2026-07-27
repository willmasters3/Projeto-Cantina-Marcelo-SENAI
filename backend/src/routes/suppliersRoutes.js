import { Router } from 'express';
import suppliersController from '../controllers/suppliersController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  validateSupplierPayload,
  validateSupplierStatus
} from '../validators/suppliersValidator.js';

const router = Router();

router.use(
  requireAuth,
  requireRole([authConfig.roles.admin], 'Você não tem permissão para esta ação.')
);

router.get('/', suppliersController.listSuppliers);
router.post('/', validateSupplierPayload, suppliersController.createSupplier);
router.put('/:id', validateSupplierPayload, suppliersController.updateSupplier);
router.patch('/:id/status', validateSupplierStatus, suppliersController.updateSupplierStatus);

export default router;
