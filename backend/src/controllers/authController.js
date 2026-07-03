import authService from '../services/authService.js';
import authConfig from '../config/auth.js';
import env from '../config/env.js';

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: env.nodeEnv === 'production'
});

const getHomePath = (roleSlug) => (
  roleSlug === authConfig.roles.viewer ? '/app/relatorios' : '/app/caixa'
);

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null
    });

    const cookieOptions = { ...getCookieOptions(), maxAge: authConfig.cookieMaxAgeMs };

    res.cookie(authConfig.cookieName, token, cookieOptions);
    res.status(200).json({
      success: true,
      user,
      redirectTo: getHomePath(user.role.slug)
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies[authConfig.cookieName];
    if (token) {
      await authService.logout(token);
    }
    res.clearCookie(authConfig.cookieName, getCookieOptions());
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

export default { login, logout, me };
