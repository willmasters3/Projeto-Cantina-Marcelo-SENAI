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
  ['relatorios', [authConfig.roles.admin, authConfig.roles.viewer]]
];

const publicSettingsTabs = new Set(['sobre-licenca', 'sobre-e-licenca', 'about-license']);

router.get(
  '/app/configuracoes',
  requireAuth,
  (req, res, next) => {
    const requestedTab = String(req.query?.tab || '').trim().toLowerCase();
    if (
      req.user?.role?.slug === authConfig.roles.admin
      || publicSettingsTabs.has(requestedTab)
    ) {
      return pageController.appPage('configuracoes')(req, res, next);
    }
    return requireRole([authConfig.roles.admin])(req, res, next);
  }
);

pagePermissions.forEach(([page, roles]) => {
  router.get(
    `/app/${page}`,
    requireAuth,
    requireRole(roles),
    pageController.appPage(page)
  );
});

export default router;
