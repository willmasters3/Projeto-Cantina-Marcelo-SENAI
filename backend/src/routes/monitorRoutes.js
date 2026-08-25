import { Router } from 'express';
import monitorController from '../controllers/monitorController.js';
import monitorAccountRateLimit from '../middlewares/monitorRateLimitMiddleware.js';

const router = Router();

router.get('/settings', monitorController.getSettings);
router.post('/account', monitorAccountRateLimit, monitorController.getAccount);
router.post('/pair', monitorAccountRateLimit, monitorController.pairMonitor);
router.get('/events', monitorController.streamState);

export default router;
