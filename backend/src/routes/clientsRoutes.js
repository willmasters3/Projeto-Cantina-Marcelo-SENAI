import { Router } from 'express';
import authConfig from '../config/auth.js';
import clientsController from '../controllers/clientsController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { validateClientPayload, validateClientStatus } from '../validators/clientsValidator.js';

const router = Router();

router.use(requireAuth, requireRole([authConfig.roles.admin, authConfig.roles.cashier]));

router.get('/', clientsController.listClients);
router.get('/:id', clientsController.getClientById);
router.post('/', validateClientPayload, clientsController.createClient);
router.put('/:id', validateClientPayload, clientsController.updateClient);
router.patch('/:id/status', validateClientStatus, clientsController.updateClientStatus);

export default router;
