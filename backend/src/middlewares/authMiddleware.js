import authService from '../services/authService.js';
import HttpError from '../utils/httpError.js';
import authConfig from '../config/auth.js';

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[authConfig.cookieName] || null;
    if (!token) {
      if (req.originalUrl.startsWith('/app')) {
        return res.redirect('/login');
      }
      throw new HttpError(401, 'Autenticação necessária');
    }

    const user = await authService.getUserBySessionToken(token);
    if (!user) {
      res.clearCookie(authConfig.cookieName, { path: '/' });
      if (req.originalUrl.startsWith('/app')) {
        return res.redirect('/login');
      }
      throw new HttpError(401, 'Autenticação necessária');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (allowedRoles = [], forbiddenMessage = 'Permissão negada') => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.slug)) {
      if (
        req.originalUrl.startsWith('/app')
        && req.user?.role?.slug === authConfig.roles.cashier
      ) {
        return res.redirect('/app/caixa?accessDenied=1');
      }
      return next(new HttpError(403, forbiddenMessage));
    }
    return next();
  };
};

export { requireAuth, requireRole };
