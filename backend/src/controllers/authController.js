import authService from '../services/authService.js';
import authConfig from '../config/auth.js';

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: authConfig.cookieMaxAgeMs,
      path: '/'
    };

    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true;
    }

    res.cookie(authConfig.cookieName, token, cookieOptions);
    res.status(200).json({ data: user });
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
    res.clearCookie(authConfig.cookieName, { path: '/' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    res.status(200).json({ data: req.user });
  } catch (error) {
    next(error);
  }
};

export default { login, logout, me };
