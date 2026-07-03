import { Router } from 'express';
import pageController from '../controllers/pageController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', pageController.redirectToLogin);
router.get('/login', pageController.loginPage);
router.get('/monitor', pageController.monitorPage);
router.get('/app', requireAuth, (req, res) => res.redirect('/app/caixa'));
router.get('/app/:page', requireAuth, pageController.appPage);

export default router;
