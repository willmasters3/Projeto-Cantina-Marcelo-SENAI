const authConfig = {
  cookieName: 'cantina_session',
  cookieMaxAgeMs: 1000 * 60 * 60 * 8,
  loginRateLimitWindowMs: 1000 * 60 * 15,
  maxLoginAttemptsPerWindow: 5,
  roles: {
    admin: 'ADMINISTRADOR',
    cashier: 'OPERADOR_CAIXA',
    viewer: 'CONSULTA'
  }
};

export default authConfig;
