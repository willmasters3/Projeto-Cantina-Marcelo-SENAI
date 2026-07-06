import { Router } from 'express';
import productImagesController from '../controllers/productImagesController.js';

const router = Router();

router.get('/products/:filename', productImagesController.serveImage);

export default router;
