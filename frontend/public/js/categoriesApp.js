import adminApi from './adminApi.js';

const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryMessage = document.getElementById('categoryMessage');
const categoryList = document.getElementById('categoryList');
const categorySubmitButton = document.getElementById('categorySubmitButton');

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.className = isError ? 'message error' : 'message success';
};

const renderCategories = (categories) => {
  categoryList.replaceChildren();

  if (!categories.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Nenhuma categoria cadastrada.';
    categoryList.appendChild(emptyMessage);
    return;
  }

  const table = document.createElement('table');
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Nome', 'Status'].forEach((title) => {
    const header = document.createElement('th');
    header.scope = 'col';
    header.textContent = title;
    headerRow.appendChild(header);
  });
  tableHead.appendChild(headerRow);

  const tableBody = document.createElement('tbody');
  categories.forEach((category) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');

    nameCell.textContent = category.nome;
    statusBadge.className = category.ativo ? 'status-badge active' : 'status-badge inactive';
    statusBadge.textContent = category.ativo ? 'Ativa' : 'Inativa';
    statusCell.appendChild(statusBadge);
    row.append(nameCell, statusCell);
    tableBody.appendChild(row);
  });

  table.append(tableHead, tableBody);
  categoryList.appendChild(table);
};

const loadCategories = async () => {
  try {
    const categories = await adminApi.listCategories();
    renderCategories(categories);
  } catch (error) {
    categoryList.replaceChildren();
    showMessage(categoryMessage, `Não foi possível carregar as categorias: ${error.message}`, true);
  }
};

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  categorySubmitButton.disabled = true;
  try {
    await adminApi.createCategory({ nome: categoryNameInput.value.trim() });
    showMessage(categoryMessage, 'Categoria cadastrada com sucesso.');
    categoryNameInput.value = '';
    await loadCategories();
    categoryNameInput.focus();
  } catch (error) {
    const message = error.status === 409
      ? error.message
      : `Não foi possível cadastrar a categoria: ${error.message}`;
    showMessage(categoryMessage, message, true);
  } finally {
    categorySubmitButton.disabled = false;
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  categoryNameInput.focus();
});
