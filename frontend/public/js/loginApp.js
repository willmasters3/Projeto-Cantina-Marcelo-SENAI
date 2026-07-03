import authApi from './authApi.js';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const message = document.getElementById('loginMessage');

const showMessage = (text, isError = false) => {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message success';
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await authApi.login({
      email: emailInput.value,
      password: passwordInput.value
    });
    window.location.href = '/app/caixa';
  } catch (error) {
    showMessage(error.message, true);
  }
});
