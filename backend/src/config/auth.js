const authConfig = {
  cookieName: 'cantina_session',
  cookieMaxAgeMs: 1000 * 60 * 60 * 8,
  loginRateLimitWindowMs: 1000 * 60 * 15,
  maxLoginAttemptsPerWindow: 5
};

export default authConfig;
