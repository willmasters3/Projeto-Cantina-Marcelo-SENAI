import { Router } from 'express';
import productsController from '../controllers/productsController.js';
import productImagesController from '../controllers/productImagesController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  validateProductPayload,
  validateProductStatus
} from '../validators/productsValidator.js';
import productImageUploadMiddleware from '../middlewares/productImageUploadMiddleware.js';

const router = Router();

const requireAdmin = requireRole([authConfig.roles.admin]);
const requireProductDeletePermission = requireRole(
  [authConfig.roles.admin],
  'Somente administradores podem excluir produto.'
);

router.use(requireAuth);

router.get('/', requireAdmin, productsController.listProducts);
router.get('/barcode/:barcode', requireAdmin, productsController.getProductByBarcode);
router.get('/:id', requireAdmin, productsController.getProductById);
router.post('/', requireAdmin, validateProductPayload, productsController.createProduct);
router.put('/:id', requireAdmin, validateProductPayload, productsController.updateProduct);
router.patch('/:id/status', requireAdmin, validateProductStatus, productsController.updateProductStatus);
router.post(
  '/:id/image',
  requireAdmin,
  productImageUploadMiddleware,
  productImagesController.uploadPrimaryImage
);
router.delete('/:id/image', requireAdmin, productImagesController.removePrimaryImage);
router.delete('/:id', requireProductDeletePermission, productsController.deleteProduct);

export default router;
