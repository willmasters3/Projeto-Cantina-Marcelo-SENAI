import bcrypt from 'bcrypt';
import crypto from 'crypto';
import authSessionsRepository from '../repositories/authSessionsRepository.js';
import usersRepository from '../repositories/usersRepository.js';
import loginAttemptsRepository from '../repositories/loginAttemptsRepository.js';
import authConfig from '../config/auth.js';
import HttpError from '../utils/httpError.js';

const createLoginToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const login = async ({ email, password, ipAddress, userAgent }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await usersRepository.findByEmail(normalizedEmail);

  const failedCount = await loginAttemptsRepository.countRecentFailedAttempts({
    email: normalizedEmail,
    source_ip: ipAddress,
    windowMs: authConfig.loginRateLimitWindowMs
  });

  if (failedCount >= authConfig.maxLoginAttemptsPerWindow) {
    throw new HttpError(429, 'Muitas tentativas de login. Tente novamente mais tarde.');
  }

  await loginAttemptsRepository.logAttempt({
    user_id: user ? user.id : null,
    email: normalizedEmail,
    source_ip: ipAddress,
    successful: 0,
    reason: 'invalid_credentials'
  });

  if (!user || !user.ativo) {
    throw new HttpError(401, 'Credenciais inválidas');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new HttpError(401, 'Credenciais inválidas');
  }

  const token = createLoginToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + authConfig.cookieMaxAgeMs);

  await authSessionsRepository.createSession({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  await usersRepository.updateLastLogin(user.id);
  await loginAttemptsRepository.logAttempt({
    user_id: user.id,
    email: normalizedEmail,
    source_ip: ipAddress,
    successful: 1,
    reason: 'login_success'
  });

  return { token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role_slug } };
};

const logout = async (tokenHash) => {
  await authSessionsRepository.invalidateSession(tokenHash);
};

const getUserBySessionToken = async (token) => {
  const tokenHash = hashToken(token);
  const session = await authSessionsRepository.findByTokenHash(tokenHash);
  if (!session) {
    return null;
  }
  return usersRepository.findById(session.user_id);
};

export default { login, logout, getUserBySessionToken };
