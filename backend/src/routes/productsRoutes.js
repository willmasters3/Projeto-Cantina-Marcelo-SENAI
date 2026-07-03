import { Router } from 'express';
import productsController from '../controllers/productsController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  validateProductPayload,
  validateProductStatus
} from '../validators/productsValidator.js';

const router = Router();

router.use(requireAuth, requireRole([authConfig.roles.admin]));

router.get('/', productsController.listProducts);
router.get('/barcode/:barcode', productsController.getProductByBarcode);
router.get('/:id', productsController.getProductById);
router.post('/', validateProductPayload, productsController.createProduct);
router.put('/:id', validateProductPayload, productsController.updateProduct);
router.patch('/:id/status', validateProductStatus, productsController.updateProductStatus);

export default router;
