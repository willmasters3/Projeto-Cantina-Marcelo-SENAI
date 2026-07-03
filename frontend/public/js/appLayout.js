import authApi from './authApi.js';

const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const navLinks = document.querySelectorAll('.side-menu a');

const initHeader = async () => {
  try {
    const user = await authApi.me();
    userName.textContent = user.nome;
  } catch (error) {
    window.location.href = '/login';
  }
};

logoutButton.addEventListener('click', async () => {
  await authApi.logout();
  window.location.href = '/login';
});

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = link.getAttribute('href');
  });
});

initHeader();
