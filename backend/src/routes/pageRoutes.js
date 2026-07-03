import { Router } from 'express';
import pageController from '../controllers/pageController.js';
import authConfig from '../config/auth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', pageController.redirectToLogin);
router.get('/login', pageController.loginPage);
router.get('/monitor', pageController.monitorPage);
router.get('/app', requireAuth, pageController.redirectToAppHome);

const pagePermissions = [
  ['caixa', [authConfig.roles.admin, authConfig.roles.cashier]],
  ['produtos', [authConfig.roles.admin]],
  ['categorias', [authConfig.roles.admin]],
  ['estoque', [authConfig.roles.admin]],
  ['clientes', [authConfig.roles.admin, authConfig.roles.cashier]],
  ['fiado', [authConfig.roles.admin, authConfig.roles.cashier]],
  ['relatorios', [authConfig.roles.admin, authConfig.roles.viewer]],
  ['configuracoes', [authConfig.roles.admin]]
];

pagePermissions.forEach(([page, roles]) => {
  router.get(
    `/app/${page}`,
    requireAuth,
    requireRole(roles),
    pageController.appPage(page)
  );
});

export default router;
