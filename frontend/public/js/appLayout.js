import authApi from './authApi.js';
import cashApi from './cashApi.js';

const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const navLinks = document.querySelectorAll('.side-menu a');
const cashRoles = new Set(['ADMINISTRADOR', 'OPERADOR_CAIXA']);
let currentRoleSlug = null;
let logoutInProgress = false;

const permissionsByPath = {
  '/app/caixa': ['ADMINISTRADOR', 'OPERADOR_CAIXA'],
  '/app/produtos': ['ADMINISTRADOR'],
  '/app/categorias': ['ADMINISTRADOR'],
  '/app/estoque': ['ADMINISTRADOR'],
  '/app/clientes': ['ADMINISTRADOR', 'OPERADOR_CAIXA'],
  '/app/fiado': ['ADMINISTRADOR', 'OPERADOR_CAIXA'],
  '/app/relatorios': ['ADMINISTRADOR', 'CONSULTA'],
  '/app/configuracoes': ['ADMINISTRADOR']
};

const configureNavigation = (roleSlug) => {
  navLinks.forEach((link) => {
    const path = new URL(link.href).pathname;
    const allowedRoles = permissionsByPath[path] || [];
    link.hidden = !allowedRoles.includes(roleSlug);
    link.classList.toggle('active', path === window.location.pathname);
  });
};

const showAccessDeniedNotice = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('accessDenied') !== '1') return;

  const notice = document.createElement('div');
  notice.className = 'access-denied-notice';
  notice.setAttribute('role', 'alert');
  notice.textContent = 'Você não tem permissão para acessar essa área. Você foi redirecionado para o Caixa.';
  document.body.appendChild(notice);

  params.delete('accessDenied');
  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl);
  setTimeout(() => notice.remove(), 7000);
};

const createLogoutConfirmation = () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'logout-confirmation-modal';
  dialog.setAttribute('aria-labelledby', 'logoutConfirmationTitle');
  dialog.setAttribute('aria-describedby', 'logoutConfirmationMessage');

  const content = document.createElement('div');
  content.className = 'logout-confirmation-content';

  const heading = document.createElement('div');
  heading.className = 'logout-confirmation-heading';
  const icon = document.createElement('span');
  icon.className = 'logout-confirmation-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '!';
  const headingText = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'logoutConfirmationTitle';
  title.textContent = 'Caixa ainda aberto';
  const subtitle = document.createElement('p');
  subtitle.textContent = 'A sessão do caixa continuará ativa.';
  headingText.append(title, subtitle);
  heading.append(icon, headingText);

  const message = document.createElement('p');
  message.id = 'logoutConfirmationMessage';
  message.className = 'logout-confirmation-message';
  message.textContent = 'Sair do sistema não fecha o caixa. Ao entrar novamente, o mesmo caixa aberto será recuperado. Deseja sair mesmo assim?';

  const actions = document.createElement('div');
  actions.className = 'logout-confirmation-actions';
  const stayButton = document.createElement('button');
  stayButton.type = 'button';
  stayButton.className = 'secondary-action';
  stayButton.textContent = 'Continuar no sistema';
  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'danger-action';
  confirmButton.textContent = 'Sair mesmo assim';
  actions.append(stayButton, confirmButton);

  content.append(heading, message, actions);
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  stayButton.addEventListener('click', () => dialog.close());
  return { confirmButton, dialog, stayButton };
};

const logoutConfirmation = createLogoutConfirmation();

const performLogout = async () => {
  if (logoutInProgress) return;
  logoutInProgress = true;
  logoutButton.disabled = true;
  logoutConfirmation.confirmButton.disabled = true;
  logoutConfirmation.stayButton.disabled = true;
  try {
    await authApi.logout();
  } finally {
    window.location.href = '/login';
  }
};

const initHeader = async () => {
  try {
    const { user } = await authApi.me();
    userName.textContent = document.body.classList.contains('cash-screen')
      ? user.nome
      : `${user.nome} · ${user.role.nome}`;
    currentRoleSlug = user.role.slug;
    configureNavigation(user.role.slug);
    showAccessDeniedNotice();
    logoutButton.disabled = false;
  } catch (error) {
    window.location.href = '/login';
  }
};

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    if (cashRoles.has(currentRoleSlug)) {
      const openSession = await cashApi.getCurrentSession();
      if (openSession) {
        logoutConfirmation.dialog.showModal();
        return;
      }
    }
    await performLogout();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = '/login';
      return;
    }
    await performLogout();
  } finally {
    if (!logoutInProgress) logoutButton.disabled = false;
  }
});

logoutConfirmation.confirmButton.addEventListener('click', performLogout);
logoutConfirmation.dialog.addEventListener('close', () => {
  if (!logoutInProgress) logoutButton.focus();
});

logoutButton.disabled = true;
initHeader();
