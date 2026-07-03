import adminApi from './adminApi.js';

const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryMessage = document.getElementById('categoryMessage');

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.className = isError ? 'message error' : 'message success';
};

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await adminApi.createCategory({ nome: categoryNameInput.value });
    showMessage(categoryMessage, 'Categoria cadastrada com sucesso');
    categoryNameInput.value = '';
  } catch (error) {
    showMessage(categoryMessage, error.message, true);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  categoryNameInput.focus();
});
