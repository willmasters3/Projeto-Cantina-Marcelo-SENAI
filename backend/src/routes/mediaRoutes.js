import { Router } from 'express';
import productImagesController from '../controllers/productImagesController.js';
import monitorAssetsController from '../controllers/monitorAssetsController.js';

const router = Router();

router.get('/products/:filename', productImagesController.serveImage);
router.get('/monitor/:filename', monitorAssetsController.serveScreensaverImage);

export default router;
