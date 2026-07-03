import { Router } from 'express';
import categoriesController from '../controllers/categoriesController.js';
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryStatus
} from '../validators/categoriesValidator.js';

const router = Router();

router.get('/', categoriesController.listCategories);
router.post('/', validateCreateCategory, categoriesController.createCategory);
router.put('/:id', validateUpdateCategory, categoriesController.updateCategory);
router.patch('/:id/status', validateCategoryStatus, categoriesController.updateCategoryStatus);

export default router;
