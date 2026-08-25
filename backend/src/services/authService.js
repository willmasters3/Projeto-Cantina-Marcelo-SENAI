import bcrypt from 'bcrypt';
import crypto from 'crypto';
import authSessionsRepository from '../repositories/authSessionsRepository.js';
import usersRepository from '../repositories/usersRepository.js';
import loginAttemptsRepository from '../repositories/loginAttemptsRepository.js';
import authConfig from '../config/auth.js';
import HttpError from '../utils/httpError.js';

const createLoginToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const dummyPasswordHash = '$2b$12$Z8Y1kT1qJqQxV5QpY8qkI.2an6rUoMZfV8I2ZmdoYwXr6vFYViYxK';
const hashPassword = (password) => bcrypt.hash(password, 12);
const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);
const getSessionTokenHash = (token) => hashToken(token);

const toPublicUser = (user) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  role: {
    slug: user.role_slug,
    nome: user.role_nome
  }
});

const validateCredentialsInput = (email, password) => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'Login e senha são obrigatórios');
  }
};

const login = async ({ email, password, ipAddress, userAgent }) => {
  validateCredentialsInput(email, password);
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

  const passwordMatch = await bcrypt.compare(
    password,
    user?.password_hash || dummyPasswordHash
  );
  const accountLocked = user?.locked_until && new Date(user.locked_until) > new Date();
  const loginAllowed = user && user.ativo && !accountLocked && passwordMatch && user.role_slug;

  if (!loginAllowed) {
    await loginAttemptsRepository.logAttempt({
      user_id: user ? user.id : null,
      email: normalizedEmail,
      source_ip: ipAddress,
      successful: 0,
      reason: 'invalid_credentials'
    });

    if (accountLocked) {
      throw new HttpError(423, 'Acesso temporariamente bloqueado. Tente novamente mais tarde.');
    }

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

  return { token, user: toPublicUser(user) };
};

const logout = async (token) => {
  const tokenHash = hashToken(token);
  await authSessionsRepository.invalidateSession(tokenHash);
};

const getUserBySessionToken = async (token) => {
  const tokenHash = hashToken(token);
  const session = await authSessionsRepository.findByTokenHash(tokenHash);
  if (!session) {
    return null;
  }
  const user = await usersRepository.findById(session.user_id);
  if (!user || !user.ativo || (user.locked_until && new Date(user.locked_until) > new Date())) {
    return null;
  }
  return toPublicUser(user);
};

export default {
  getSessionTokenHash,
  getUserBySessionToken,
  hashPassword,
  login,
  logout,
  toPublicUser,
  verifyPassword
};
