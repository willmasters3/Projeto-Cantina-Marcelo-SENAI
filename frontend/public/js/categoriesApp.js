import adminApi from './adminApi.js';

const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryMessage = document.getElementById('categoryMessage');
const categoryList = document.getElementById('categoryList');
const categorySubmitButton = document.getElementById('categorySubmitButton');
const categoryFormTitle = document.getElementById('categoryFormTitle');
const cancelCategoryEditButton = document.getElementById('cancelCategoryEditButton');

let editingCategoryId = null;

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.className = isError ? 'message error' : 'message success';
};

const resetCategoryForm = () => {
  editingCategoryId = null;
  categoryForm.reset();
  categoryFormTitle.textContent = 'Cadastrar categoria';
  categorySubmitButton.textContent = 'Cadastrar categoria';
  cancelCategoryEditButton.hidden = true;
};

const openCategoryEditor = (category) => {
  editingCategoryId = category.id;
  categoryNameInput.value = category.nome;
  categoryFormTitle.textContent = `Editar categoria: ${category.nome}`;
  categorySubmitButton.textContent = 'Salvar alterações';
  cancelCategoryEditButton.hidden = false;
  categoryNameInput.focus();
  categoryNameInput.select();
  categoryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  ['Nome', 'Status', 'Ações'].forEach((title) => {
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
    const actionsCell = document.createElement('td');
    const editButton = document.createElement('button');

    nameCell.textContent = category.nome;
    statusBadge.className = category.ativo ? 'status-badge active' : 'status-badge inactive';
    statusBadge.textContent = category.ativo ? 'Ativa' : 'Inativa';
    statusCell.appendChild(statusBadge);
    actionsCell.className = 'table-actions';
    editButton.type = 'button';
    editButton.className = 'secondary-action compact-button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => openCategoryEditor(category));
    actionsCell.appendChild(editButton);
    row.append(nameCell, statusCell, actionsCell);
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
  cancelCategoryEditButton.disabled = true;
  const categoryName = categoryNameInput.value.trim();
  const isEditing = editingCategoryId !== null;
  try {
    if (isEditing) {
      await adminApi.updateCategory(editingCategoryId, { nome: categoryName });
    } else {
      await adminApi.createCategory({ nome: categoryName });
    }
    showMessage(
      categoryMessage,
      isEditing ? 'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.'
    );
    resetCategoryForm();
    await loadCategories();
    categoryNameInput.focus();
  } catch (error) {
    const message = error.status === 409
      ? error.message
      : `Não foi possível ${isEditing ? 'atualizar' : 'cadastrar'} a categoria: ${error.message}`;
    showMessage(categoryMessage, message, true);
  } finally {
    categorySubmitButton.disabled = false;
    cancelCategoryEditButton.disabled = false;
  }
});

cancelCategoryEditButton.addEventListener('click', () => {
  resetCategoryForm();
  showMessage(categoryMessage, 'Edição cancelada.');
  categoryNameInput.focus();
});

window.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  categoryNameInput.focus();
});
