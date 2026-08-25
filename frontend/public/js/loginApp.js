import authApi from './authApi.js';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const message = document.getElementById('loginMessage');

const showMessage = (text, isError = false) => {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message success';
};

const getSafeRedirectTo = () => {
  const redirectTo = new URLSearchParams(window.location.search).get('redirectTo');
  if (!redirectTo) return null;
  try {
    const targetUrl = new URL(redirectTo, window.location.origin);
    if (targetUrl.origin !== window.location.origin || !targetUrl.pathname.startsWith('/app/')) {
      return null;
    }
    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return null;
  }
};

const redirectAuthenticatedUser = (roleSlug) => {
  const redirectTo = getSafeRedirectTo();
  if (redirectTo) {
    window.location.replace(redirectTo);
    return;
  }
  window.location.replace(roleSlug === 'CONSULTA' ? '/app/relatorios' : '/app/caixa');
};

const checkExistingSession = async () => {
  try {
    const { user } = await authApi.me();
    redirectAuthenticatedUser(user.role.slug);
  } catch (error) {
    if (error.status !== 401) {
      showMessage('Não foi possível verificar a sessão. Tente novamente.', true);
    }
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage('Entrando...');
  try {
    const result = await authApi.login({
      email: emailInput.value,
      password: passwordInput.value
    });
    passwordInput.value = '';
    window.location.replace(getSafeRedirectTo() || result.redirectTo);
  } catch (error) {
    passwordInput.value = '';
    showMessage(error.status === 429
      ? error.message
      : 'Não foi possível entrar. Verifique suas credenciais.', true);
    passwordInput.focus();
  } finally {
    submitButton.disabled = false;
  }
});

checkExistingSession();
