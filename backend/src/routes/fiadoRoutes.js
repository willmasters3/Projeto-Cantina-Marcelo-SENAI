import { Router } from 'express';
import fiadoController from '../controllers/fiadoController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { validateFiadoPayment } from '../validators/fiadoValidator.js';

const router = Router();
const fiadoRoles = [authConfig.roles.admin, authConfig.roles.cashier];
const requireFiadoAccess = requireRole(fiadoRoles, 'Você não tem permissão para acessar o fiado.');
const requireFiadoPayment = requireRole(fiadoRoles, 'Você não tem permissão para registrar pagamento.');

router.use(requireAuth);

router.get('/summary', requireFiadoAccess, fiadoController.getSummary);
router.get('/customers', requireFiadoAccess, fiadoController.listCustomers);
router.get('/customers/:id', requireFiadoAccess, fiadoController.getCustomer);
router.get('/customers/:id/statement', requireFiadoAccess, fiadoController.getCustomerStatement);
router.get('/customers/:id/cycles', requireFiadoAccess, fiadoController.getCustomerCycles);
router.post('/payments', requireFiadoPayment, validateFiadoPayment, fiadoController.registerPayment);

export default router;
