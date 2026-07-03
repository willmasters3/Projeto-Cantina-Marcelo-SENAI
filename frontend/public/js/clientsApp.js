import clientsApi from './clientsApi.js';
import { bindCpfInput, formatCpf, maskCpfForList, onlyCpfDigits } from './cpfInput.js';

const clientForm = document.getElementById('clientForm');
const clientFormTitle = document.getElementById('clientFormTitle');
const clientNameInput = document.getElementById('clientName');
const clientCpfInput = document.getElementById('clientCpf');
const clientRegistrationInput = document.getElementById('clientRegistration');
const clientPhoneInput = document.getElementById('clientPhone');
const clientEmailInput = document.getElementById('clientEmail');
const clientNotesInput = document.getElementById('clientNotes');
const clientSubmitButton = document.getElementById('clientSubmitButton');
const cancelClientEditButton = document.getElementById('cancelClientEditButton');
const clientMessage = document.getElementById('clientMessage');
const clientSearchForm = document.getElementById('clientSearchForm');
const clientSearchInput = document.getElementById('clientSearch');
const clientList = document.getElementById('clientList');

let editingClientId = null;
let searchTimer = null;
let latestLoadRequest = 0;

const showMessage = (message, isError = false) => {
  clientMessage.textContent = message;
  clientMessage.className = isError ? 'message error' : 'message success';
};

const createCell = (value) => {
  const cell = document.createElement('td');
  cell.textContent = value || '—';
  return cell;
};

const resetClientForm = () => {
  clientForm.reset();
  editingClientId = null;
  clientFormTitle.textContent = 'Cadastrar cliente';
  clientSubmitButton.textContent = 'Cadastrar cliente';
  cancelClientEditButton.hidden = true;
  clientNameInput.focus();
};

const openClientEditor = (client) => {
  editingClientId = client.id;
  clientNameInput.value = client.nome || '';
  clientCpfInput.value = formatCpf(client.cpf);
  clientRegistrationInput.value = client.matricula || '';
  clientPhoneInput.value = client.telefone || '';
  clientEmailInput.value = client.email || '';
  clientNotesInput.value = client.observacoes || '';
  clientFormTitle.textContent = `Editar cliente: ${client.nome}`;
  clientSubmitButton.textContent = 'Salvar alterações';
  cancelClientEditButton.hidden = false;
  showMessage(`Editando ${client.nome}.`);
  clientNameInput.focus();
  clientForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const updateStatus = async (client) => {
  try {
    const newStatus = !Boolean(client.ativo);
    await clientsApi.updateClientStatus(client.id, newStatus);
    showMessage(`Cliente ${newStatus ? 'ativado' : 'inativado'} com sucesso.`);
    await loadClients(clientSearchInput.value);
  } catch (error) {
    showMessage(error.message, true);
  }
};

const renderClients = (clients) => {
  clientList.replaceChildren();

  if (!clients.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Nenhum cliente encontrado.';
    clientList.appendChild(emptyMessage);
    return;
  }

  const table = document.createElement('table');
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Código', 'Nome', 'CPF', 'Matrícula', 'Contato', 'Status', 'Ações'].forEach((title) => {
    const header = document.createElement('th');
    header.scope = 'col';
    header.textContent = title;
    headerRow.appendChild(header);
  });
  tableHead.appendChild(headerRow);

  const tableBody = document.createElement('tbody');
  clients.forEach((client) => {
    const row = document.createElement('tr');
    const contact = [client.telefone, client.email].filter(Boolean).join(' · ');
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = client.ativo ? 'status-badge active' : 'status-badge inactive';
    statusBadge.textContent = client.ativo ? 'Ativo' : 'Inativo';
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'table-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-action compact-button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => openClientEditor(client));

    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = client.ativo
      ? 'danger-action compact-button'
      : 'secondary-action compact-button';
    statusButton.textContent = client.ativo ? 'Inativar' : 'Ativar';
    statusButton.addEventListener('click', () => updateStatus(client));

    actions.append(editButton, statusButton);
    actionsCell.appendChild(actions);
    row.append(
      createCell(client.codigo),
      createCell(client.nome),
      createCell(maskCpfForList(client.cpf)),
      createCell(client.matricula),
      createCell(contact),
      statusCell,
      actionsCell
    );
    tableBody.appendChild(row);
  });

  table.append(tableHead, tableBody);
  clientList.appendChild(table);
};

async function loadClients(search = '') {
  const requestId = latestLoadRequest + 1;
  latestLoadRequest = requestId;
  try {
    const clients = await clientsApi.listClients(search);
    if (requestId !== latestLoadRequest) return;
    renderClients(clients);
  } catch (error) {
    if (requestId !== latestLoadRequest) return;
    clientList.replaceChildren();
    showMessage(`Não foi possível carregar os clientes: ${error.message}`, true);
  }
}

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clientSubmitButton.disabled = true;

  const payload = {
    nome: clientNameInput.value.trim(),
    cpf: onlyCpfDigits(clientCpfInput.value),
    matricula: clientRegistrationInput.value.trim() || null,
    telefone: clientPhoneInput.value.trim() || null,
    email: clientEmailInput.value.trim() || null,
    observacoes: clientNotesInput.value.trim() || null
  };

  try {
    if (editingClientId) {
      await clientsApi.updateClient(editingClientId, payload);
      resetClientForm();
      showMessage('Cliente atualizado com sucesso.');
    } else {
      const client = await clientsApi.createClient(payload);
      resetClientForm();
      showMessage(`Cliente cadastrado com sucesso. Código: ${client.codigo}.`);
    }
    await loadClients(clientSearchInput.value);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    clientSubmitButton.disabled = false;
  }
});

cancelClientEditButton.addEventListener('click', () => {
  resetClientForm();
  showMessage('Edição cancelada.');
});

clientSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadClients(clientSearchInput.value);
});

clientSearchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => loadClients(clientSearchInput.value), 250);
});

window.addEventListener('DOMContentLoaded', async () => {
  clientNameInput.focus();
  await loadClients();
});

bindCpfInput(clientCpfInput);
