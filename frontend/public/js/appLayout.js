import authApi from './authApi.js';

const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const navLinks = document.querySelectorAll('.side-menu a');

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

const initHeader = async () => {
  try {
    const { user } = await authApi.me();
    userName.textContent = document.body.classList.contains('cash-screen')
      ? user.nome
      : `${user.nome} · ${user.role.nome}`;
    configureNavigation(user.role.slug);
  } catch (error) {
    window.location.href = '/login';
  }
};

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await authApi.logout();
  } finally {
    window.location.href = '/login';
  }
});

initHeader();
