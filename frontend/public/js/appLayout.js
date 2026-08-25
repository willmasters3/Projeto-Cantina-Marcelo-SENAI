import authApi from './authApi.js';
import cashApi from './cashApi.js';

const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const navLinks = document.querySelectorAll('.side-menu a');
const cashRoles = new Set(['ADMINISTRADOR', 'OPERADOR_CAIXA']);
const cashierRole = 'OPERADOR_CAIXA';
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

const navigationIcons = {
  '/app/caixa': {
    paths: ['M3 6h18v12H3zM7 10h6M7 14h4M17 10h.01M17 14h.01']
  },
  '/app/produtos': {
    paths: ['M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9']
  },
  '/app/categorias': {
    paths: ['M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z']
  },
  '/app/estoque': {
    paths: ['M4 8h16v12H4zM7 4h10l3 4H4zM9 12h6']
  },
  '/app/clientes': {
    circles: [{ cx: 12, cy: 8, r: 3 }],
    paths: ['M5 20c.5-4 2.8-6 7-6s6.5 2 7 6']
  },
  '/app/fiado': {
    paths: ['M5 4h14v16H5zM8 8h8M8 12h8M8 16h5']
  },
  '/app/relatorios': {
    paths: ['M5 20V10M12 20V4M19 20v-7']
  },
  '/app/configuracoes': {
    circles: [{ cx: 12, cy: 12, r: 3 }],
    paths: ['M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4']
  }
};

const brandIcon = {
  paths: ['M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7'],
  circles: [
    { cx: 10, cy: 19, r: 1.4 },
    { cx: 18, cy: 19, r: 1.4 }
  ]
};

const createSvgIcon = ({ paths = [], circles = [] }) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  paths.forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  });

  circles.forEach((circleData) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', circleData.cx);
    circle.setAttribute('cy', circleData.cy);
    circle.setAttribute('r', circleData.r);
    svg.appendChild(circle);
  });

  return svg;
};

const configureNavigation = (roleSlug) => {
  navLinks.forEach((link) => {
    const path = new URL(link.href).pathname;
    const allowedRoles = permissionsByPath[path] || [];
    link.hidden = !allowedRoles.includes(roleSlug);
    const isActive = path === window.location.pathname;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

const ensureOperatorNavigationIcons = () => {
  navLinks.forEach((link) => {
    if (link.querySelector('svg')) return;
    const path = new URL(link.href).pathname;
    const label = link.textContent.trim();
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    link.replaceChildren(createSvgIcon(navigationIcons[path] || navigationIcons['/app/caixa']), labelElement);
  });
};

const ensureOperatorBrand = (sideMenu) => {
  const brand = sideMenu.querySelector('.brand');
  if (!brand || brand.querySelector('svg')) return;

  const label = document.createElement('span');
  label.textContent = brand.textContent.trim() || 'Cantina';
  const mark = document.createElement('span');
  mark.className = 'operator-brand-mark';
  mark.appendChild(createSvgIcon(brandIcon));
  brand.classList.add('operator-brand');
  brand.replaceChildren(mark, label);
};

const createOperatorTerminalCard = (sideMenu, user) => {
  if (sideMenu.querySelector('.operator-terminal-card, .cash-terminal-card')) return;

  const card = document.createElement('section');
  card.className = 'operator-terminal-card';
  card.setAttribute('aria-label', 'Terminal de caixa');

  const labelRow = document.createElement('div');
  labelRow.className = 'operator-terminal-label';
  const label = document.createElement('span');
  label.textContent = 'Terminal atual';
  const dot = document.createElement('span');
  dot.className = 'operator-terminal-dot';
  dot.setAttribute('aria-hidden', 'true');
  labelRow.append(label, dot);

  const terminal = document.createElement('strong');
  terminal.dataset.operatorTerminalCode = 'true';
  terminal.textContent = 'CAIXA-01';

  const operator = document.createElement('div');
  operator.className = 'operator-terminal-operator';
  const avatar = document.createElement('span');
  avatar.className = 'operator-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.appendChild(createSvgIcon(navigationIcons['/app/clientes']));
  const operatorText = document.createElement('div');
  const operatorName = document.createElement('span');
  operatorName.dataset.operatorName = 'true';
  operatorName.textContent = user.nome || 'Usuário logado';
  const operatorStatus = document.createElement('small');
  operatorStatus.dataset.operatorStatus = 'true';
  operatorStatus.textContent = 'Aguardando abertura';
  operatorText.append(operatorName, operatorStatus);
  operator.append(avatar, operatorText);

  card.append(labelRow, terminal, operator);
  sideMenu.appendChild(card);
};

const refreshOperatorTerminalCard = async () => {
  const card = document.querySelector('.operator-terminal-card');
  if (!card) return;

  try {
    const session = await cashApi.getCurrentSession();
    const terminal = card.querySelector('[data-operator-terminal-code]');
    const operatorName = card.querySelector('[data-operator-name]');
    const operatorStatus = card.querySelector('[data-operator-status]');
    const isOpen = Boolean(session);
    card.classList.toggle('is-open', isOpen);

    if (!isOpen) {
      if (operatorStatus) operatorStatus.textContent = 'Aguardando abertura';
      return;
    }

    if (terminal) terminal.textContent = session.terminal_codigo || 'CAIXA-01';
    if (operatorName) operatorName.textContent = session.usuario_abertura_nome || operatorName.textContent;
    const openedAt = new Date(session.aberto_em);
    if (operatorStatus) {
      operatorStatus.textContent = Number.isNaN(openedAt.getTime())
        ? 'Caixa aberto'
        : `Aberto às ${openedAt.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
    }
  } catch {
    card.classList.remove('is-open');
  }
};

const configureOperatorShell = (user) => {
  const isOperatorPage = user.role.slug === cashierRole && !document.body.classList.contains('cash-screen');
  document.body.classList.toggle('operator-shell', isOperatorPage);
  if (!isOperatorPage) return;

  document.querySelectorAll('.side-menu').forEach((sideMenu) => {
    ensureOperatorBrand(sideMenu);
    createOperatorTerminalCard(sideMenu, user);
  });
  ensureOperatorNavigationIcons();
  void refreshOperatorTerminalCard();
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
    configureOperatorShell(user);
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
