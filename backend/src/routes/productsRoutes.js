import { Router } from 'express';
import productsController from '../controllers/productsController.js';
import {
  validateProductPayload,
  validateProductStatus
} from '../validators/productsValidator.js';

const router = Router();

router.get('/', productsController.listProducts);
router.get('/:id', productsController.getProductById);
router.get('/barcode/:barcode', productsController.getProductByBarcode);
router.post('/', validateProductPayload, productsController.createProduct);
router.put('/:id', validateProductPayload, productsController.updateProduct);
router.patch('/:id/status', validateProductStatus, productsController.updateProductStatus);

export default router;
