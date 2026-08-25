import authApi from './authApi.js';
import settingsApi from './settingsApi.js';

const settingsMessage = document.getElementById('settingsMessage');
const adminSettingsElements = document.querySelectorAll('[data-admin-settings]');
const summaryActiveUsers = document.getElementById('summaryActiveUsers');
const summaryAdmins = document.getElementById('summaryAdmins');
const summaryTerminal = document.getElementById('summaryTerminal');
const summaryTerminalStatus = document.getElementById('summaryTerminalStatus');
const summaryBackupStatus = document.getElementById('summaryBackupStatus');
const summaryBackupDate = document.getElementById('summaryBackupDate');

const userFilters = document.getElementById('userFilters');
const userSearch = document.getElementById('userSearch');
const userRoleFilter = document.getElementById('userRoleFilter');
const userStatusFilter = document.getElementById('userStatusFilter');
const usersTable = document.getElementById('usersTable');
const addUserButton = document.getElementById('addUserButton');
const userDialog = document.getElementById('userDialog');
const userForm = document.getElementById('userForm');
const userDialogTitle = document.getElementById('userDialogTitle');
const userIdInput = document.getElementById('userId');
const userNameInput = document.getElementById('userNameInput');
const userLoginInput = document.getElementById('userLoginInput');
const userRoleInput = document.getElementById('userRoleInput');
const userActiveLabel = document.getElementById('userActiveLabel');
const userActiveInput = document.getElementById('userActiveInput');
const userPasswordFields = document.getElementById('userPasswordFields');
const userPasswordInput = document.getElementById('userPasswordInput');
const userPasswordConfirmInput = document.getElementById('userPasswordConfirmInput');
const userSaveButton = document.getElementById('userSaveButton');

const resetPasswordDialog = document.getElementById('resetPasswordDialog');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetPasswordUserLabel = document.getElementById('resetPasswordUserLabel');
const resetPasswordUserId = document.getElementById('resetPasswordUserId');
const resetPasswordInput = document.getElementById('resetPasswordInput');
const resetPasswordConfirmInput = document.getElementById('resetPasswordConfirmInput');
const resetPasswordSaveButton = document.getElementById('resetPasswordSaveButton');

const terminalDisplay = document.getElementById('terminalDisplay');
const terminalCode = document.getElementById('terminalCode');
const terminalStatus = document.getElementById('terminalStatus');
const terminalOpenAt = document.getElementById('terminalOpenAt');
const monitorLinked = document.getElementById('monitorLinked');
const monitorStatus = document.getElementById('monitorStatus');
const terminalForm = document.getElementById('terminalForm');
const terminalDisplayName = document.getElementById('terminalDisplayName');
const terminalSaveButton = document.getElementById('terminalSaveButton');
const openMonitorPageButton = document.getElementById('openMonitorPageButton');
const previewScreensaverButton = document.getElementById('previewScreensaverButton');

const monitorSettingsForm = document.getElementById('monitorSettingsForm');
const screensaverEnabled = document.getElementById('screensaverEnabled');
const screensaverIdleSeconds = document.getElementById('screensaverIdleSeconds');
const privacyClearSeconds = document.getElementById('privacyClearSeconds');
const screensaverMessage = document.getElementById('screensaverMessage');
const screensaverImageInput = document.getElementById('screensaverImageInput');
const chooseScreensaverImageButton = document.getElementById('chooseScreensaverImageButton');
const uploadScreensaverImageButton = document.getElementById('uploadScreensaverImageButton');
const removeScreensaverImageButton = document.getElementById('removeScreensaverImageButton');
const screensaverPreviewImage = document.getElementById('screensaverPreviewImage');
const screensaverImageMessage = document.getElementById('screensaverImageMessage');
const monitorSaveButton = document.getElementById('monitorSaveButton');

const passwordForm = document.getElementById('passwordForm');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const passwordSaveButton = document.getElementById('passwordSaveButton');
const systemVersion = document.getElementById('systemVersion');
const databaseStatus = document.getElementById('databaseStatus');
const systemTerminal = document.getElementById('systemTerminal');
const systemLastBackup = document.getElementById('systemLastBackup');
const systemAutoBackup = document.getElementById('systemAutoBackup');

const aboutSystemName = document.getElementById('aboutSystemName');
const aboutSystemDescription = document.getElementById('aboutSystemDescription');
const aboutSystemVersion = document.getElementById('aboutSystemVersion');
const aboutDeveloperName = document.getElementById('aboutDeveloperName');
const aboutDeveloperEmailLink = document.getElementById('aboutDeveloperEmail');
const aboutDeveloperEmailText = document.getElementById('aboutDeveloperEmailText');
const aboutDeveloperLinkedinLink = document.getElementById('aboutDeveloperLinkedin');
const aboutDeveloperLinkedinText = document.getElementById('aboutDeveloperLinkedinText');
const aboutDeveloperYear = document.getElementById('aboutDeveloperYear');
const aboutDeveloperCopyright = document.getElementById('aboutDeveloperCopyright');
const licenseOwner = document.getElementById('licenseOwner');
const licenseInstallationId = document.getElementById('licenseInstallationId');
const licenseVersion = document.getElementById('licenseVersion');
const licenseDeliveryDate = document.getElementById('licenseDeliveryDate');
const licenseTechnicalValidUntil = document.getElementById('licenseTechnicalValidUntil');
const licenseStatus = document.getElementById('licenseStatus');
const licenseText = document.getElementById('licenseText');
const licenseFooterCopyright = document.getElementById('licenseFooterCopyright');

const generateBackupButton = document.getElementById('generateBackupButton');
const autoBackupForm = document.getElementById('autoBackupForm');
const autoBackupEnabled = document.getElementById('autoBackupEnabled');
const autoBackupTime = document.getElementById('autoBackupTime');
const backupRetentionDays = document.getElementById('backupRetentionDays');
const autoBackupSaveButton = document.getElementById('autoBackupSaveButton');
const nextBackupText = document.getElementById('nextBackupText');
const backupsTable = document.getElementById('backupsTable');
const restoreBackupSelect = document.getElementById('restoreBackupSelect');
const restoreExistingForm = document.getElementById('restoreExistingForm');
const restoreConfirmation = document.getElementById('restoreConfirmation');
const restoreExistingButton = document.getElementById('restoreExistingButton');
const restoreUploadForm = document.getElementById('restoreUploadForm');
const restoreUploadInput = document.getElementById('restoreUploadInput');
const restoreUploadConfirmation = document.getElementById('restoreUploadConfirmation');
const restoreUploadButton = document.getElementById('restoreUploadButton');

const auditTable = document.getElementById('auditTable');
const auditPrevButton = document.getElementById('auditPrevButton');
const auditNextButton = document.getElementById('auditNextButton');
const auditPaginationInfo = document.getElementById('auditPaginationInfo');

const confirmDialog = document.getElementById('confirmDialog');
const confirmForm = document.getElementById('confirmForm');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmTextField = document.getElementById('confirmTextField');
const confirmTextInput = document.getElementById('confirmTextInput');
const confirmTextLabel = document.getElementById('confirmTextLabel');
const confirmCancelButton = document.getElementById('confirmCancelButton');
const confirmSubmitButton = document.getElementById('confirmSubmitButton');

const screensaverPreviewDialog = document.getElementById('screensaverPreviewDialog');
const closeScreensaverPreviewButton = document.getElementById('closeScreensaverPreviewButton');
const screensaverPreviewDialogImage = document.getElementById('screensaverPreviewDialogImage');
const screensaverPreviewDialogMessage = document.getElementById('screensaverPreviewDialogMessage');

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const maxImageSizeBytes = 5 * 1024 * 1024;
const maxSqlBackupSizeBytes = 200 * 1024 * 1024;

let roles = [];
let users = [];
let backups = [];
let auditOffset = 0;
let auditTotal = 0;
const auditLimit = 8;
let selectedScreensaverImage = null;
let selectedScreensaverPreviewUrl = null;
let currentScreensaverImageUrl = null;
let pendingConfirmResolver = null;

const formatDateTime = (value) => {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const formatPublicValue = (value) => {
  const normalized = String(value || '').trim();
  return normalized || 'Não informado';
};

const formatLicenseDate = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Não informado';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? normalized : date.toLocaleDateString('pt-BR');
};

const setText = (element, value) => {
  if (element) element.textContent = formatPublicValue(value);
};

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = bytes;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
};

const showMessage = (message = '', isError = false) => {
  settingsMessage.textContent = message;
  settingsMessage.className = message
    ? `message ${isError ? 'error' : 'success'}`
    : 'message';
};

const setButtonBusy = (button, busy, busyText = null) => {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    if (busyText) button.textContent = busyText;
    button.disabled = true;
    return;
  }
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
  button.disabled = false;
};

const createCell = (text = '', className = '') => {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
};

const setTableMessage = (tbody, colspan, message) => {
  tbody.replaceChildren();
  const row = document.createElement('tr');
  const cell = createCell(message);
  cell.colSpan = colspan;
  cell.className = 'empty-state';
  row.appendChild(cell);
  tbody.appendChild(row);
};

const createStatusBadge = (text, type) => {
  const badge = document.createElement('span');
  badge.className = `settings-status ${type}`;
  badge.textContent = text;
  return badge;
};

const resolveConfirm = (value) => {
  if (pendingConfirmResolver) {
    pendingConfirmResolver(value);
    pendingConfirmResolver = null;
  }
  if (confirmDialog.open) confirmDialog.close();
};

const askConfirmation = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  requiredText = ''
}) => new Promise((resolve) => {
  pendingConfirmResolver = resolve;
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmSubmitButton.textContent = confirmLabel;
  confirmSubmitButton.className = danger ? 'danger-action' : '';
  confirmTextField.hidden = !requiredText;
  confirmTextInput.required = Boolean(requiredText);
  confirmTextInput.value = '';
  confirmTextInput.setCustomValidity('');
  confirmTextInput.dataset.requiredText = requiredText;
  confirmTextLabel.textContent = requiredText
    ? `Digite ${requiredText} para confirmar`
    : 'Confirmação';
  confirmDialog.showModal();
  if (requiredText) confirmTextInput.focus();
});

const populateRoleSelect = (select, { includeEmpty = false } = {}) => {
  select.replaceChildren();
  if (includeEmpty) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Todos os perfis';
    select.appendChild(option);
  }
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.slug;
    option.textContent = role.nome;
    select.appendChild(option);
  });
};

const getUserById = (id) => users.find((user) => String(user.id) === String(id));

const renderUsers = () => {
  usersTable.replaceChildren();
  if (!users.length) {
    setTableMessage(usersTable, 7, 'Nenhum usuário encontrado.');
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameBlock = document.createElement('div');
    nameBlock.className = 'settings-user-cell';
    const name = document.createElement('strong');
    name.textContent = user.nome;
    const id = document.createElement('small');
    id.textContent = `ID ${user.id}`;
    nameBlock.append(name, id);
    nameCell.appendChild(nameBlock);

    const profileCell = createCell(user.perfil.nome);
    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatusBadge(user.ativo ? 'Ativo' : 'Inativo', user.ativo ? 'active' : 'inactive'));

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'settings-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-action compact-button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => openEditUserDialog(user));

    const passwordButton = document.createElement('button');
    passwordButton.type = 'button';
    passwordButton.className = 'secondary-action compact-button';
    passwordButton.textContent = 'Redefinir senha';
    passwordButton.addEventListener('click', () => openResetPasswordDialog(user));

    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = user.ativo
      ? 'danger-action compact-button'
      : 'secondary-action compact-button';
    statusButton.textContent = user.ativo ? 'Inativar' : 'Reativar';
    statusButton.addEventListener('click', () => changeUserStatus(user, statusButton));

    actions.append(editButton, passwordButton, statusButton);
    actionsCell.appendChild(actions);

    row.append(
      nameCell,
      createCell(user.login),
      profileCell,
      statusCell,
      createCell(formatDateTime(user.ultimo_acesso_em)),
      createCell(formatDateTime(user.criado_em)),
      actionsCell
    );
    usersTable.appendChild(row);
  });
};

const loadRoles = async () => {
  roles = await settingsApi.listRoles();
  populateRoleSelect(userRoleFilter, { includeEmpty: true });
  populateRoleSelect(userRoleInput);
};

const loadUsers = async () => {
  setTableMessage(usersTable, 7, 'Carregando usuários...');
  users = await settingsApi.listUsers({
    search: userSearch.value.trim(),
    role: userRoleFilter.value,
    status: userStatusFilter.value
  });
  renderUsers();
};

const applyOverview = (overview) => {
  summaryActiveUsers.textContent = overview.resumo.usuarios_ativos;
  summaryAdmins.textContent = overview.resumo.administradores;
  summaryTerminal.textContent = overview.resumo.terminal_atual || '--';
  summaryTerminalStatus.textContent = overview.terminal_monitor?.terminal?.situacao === 'CAIXA_ABERTO'
    ? 'Caixa aberto'
    : 'Sem caixa aberto';

  const lastBackup = overview.resumo.ultimo_backup;
  summaryBackupStatus.textContent = lastBackup ? 'Sucesso' : 'Nenhum';
  summaryBackupDate.textContent = lastBackup ? formatDateTime(lastBackup.concluido_em) : 'Nenhum registro';

  const system = overview.sistema;
  systemVersion.textContent = system.versao || '--';
  databaseStatus.textContent = system.banco === 'connected' ? 'Conectado' : 'Indisponível';
  systemTerminal.textContent = system.terminal_atual || '--';
  systemLastBackup.textContent = formatDateTime(system.ultimo_backup_sucesso_em);
  systemAutoBackup.textContent = system.backup_automatico?.ativo
    ? `Ativo, ${system.backup_automatico.horario}`
    : 'Inativo';
};

const loadOverview = async () => {
  const overview = await settingsApi.getOverview();
  applyOverview(overview);
};

const renderAboutLicense = (aboutLicense) => {
  const system = aboutLicense?.sistema || {};
  const developer = aboutLicense?.desenvolvedor || {};
  const license = aboutLicense?.licenca || {};

  setText(aboutSystemName, system.nome);
  setText(aboutSystemDescription, system.descricao);
  setText(aboutSystemVersion, system.versao);
  setText(aboutDeveloperName, developer.nome);
  setText(aboutDeveloperYear, developer.ano);
  setText(aboutDeveloperCopyright, developer.direitos_autorais);
  setText(licenseOwner, license.licenciado_para);
  setText(licenseInstallationId, license.identificacao_instalacao);
  setText(licenseVersion, license.versao_licenciada);
  setText(licenseDeliveryDate, formatLicenseDate(license.data_entrega));
  setText(licenseTechnicalValidUntil, formatLicenseDate(license.validade_tecnica_versao));
  setText(licenseStatus, license.situacao);
  setText(licenseFooterCopyright, developer.direitos_autorais);

  const email = String(developer.email || '').trim();
  if (aboutDeveloperEmailLink && aboutDeveloperEmailText) {
    aboutDeveloperEmailText.textContent = formatPublicValue(email);
    if (email) {
      aboutDeveloperEmailLink.href = `mailto:${email}`;
      aboutDeveloperEmailLink.removeAttribute('aria-disabled');
    } else {
      aboutDeveloperEmailLink.removeAttribute('href');
      aboutDeveloperEmailLink.setAttribute('aria-disabled', 'true');
    }
  }

  const linkedin = String(developer.linkedin || '').trim();
  if (aboutDeveloperLinkedinLink && aboutDeveloperLinkedinText) {
    aboutDeveloperLinkedinText.textContent = formatPublicValue(linkedin);
    if (linkedin) {
      aboutDeveloperLinkedinLink.href = linkedin;
      aboutDeveloperLinkedinLink.removeAttribute('aria-disabled');
    } else {
      aboutDeveloperLinkedinLink.removeAttribute('href');
      aboutDeveloperLinkedinLink.setAttribute('aria-disabled', 'true');
    }
  }

  if (licenseText) {
    licenseText.textContent = formatPublicValue(license.texto);
  }
};

const loadAboutLicense = async () => {
  renderAboutLicense(await settingsApi.getAboutLicense());
};

const openAddUserDialog = () => {
  userForm.reset();
  userIdInput.value = '';
  userDialogTitle.textContent = 'Adicionar usuário';
  userPasswordFields.hidden = false;
  userPasswordInput.required = true;
  userPasswordConfirmInput.required = true;
  userActiveLabel.hidden = false;
  userActiveInput.checked = true;
  userSaveButton.textContent = 'Cadastrar usuário';
  userDialog.showModal();
  userNameInput.focus();
};

const openEditUserDialog = (user) => {
  userForm.reset();
  userIdInput.value = user.id;
  userNameInput.value = user.nome;
  userLoginInput.value = user.login;
  userRoleInput.value = user.perfil.slug;
  userDialogTitle.textContent = `Editar ${user.nome}`;
  userPasswordFields.hidden = true;
  userPasswordInput.required = false;
  userPasswordConfirmInput.required = false;
  userActiveLabel.hidden = true;
  userSaveButton.textContent = 'Salvar alterações';
  userDialog.showModal();
  userNameInput.focus();
};

const validatePasswordPair = (password, confirmation, label = 'Senha') => {
  if (password.length < 8) return `${label} deve ter pelo menos 8 caracteres.`;
  if (password !== confirmation) return 'A confirmação da senha não confere.';
  return null;
};

const validateUserPayload = (payload) => {
  if (payload.nome.length < 3 || payload.nome.length > 150) {
    return 'Nome completo deve ter entre 3 e 150 caracteres.';
  }
  if (payload.login.length < 3 || payload.login.length > 255) {
    return 'Login deve ter entre 3 e 255 caracteres.';
  }
  if (!/^[a-z0-9._@-]+$/i.test(payload.login)) {
    return 'Login deve conter apenas letras, números, ponto, hífen, underline ou @.';
  }
  if (!roles.some((role) => role.slug === payload.perfil)) {
    return 'Selecione um perfil válido.';
  }
  return null;
};

const refreshUsersAndOverview = async () => {
  await Promise.all([loadUsers(), loadOverview()]);
};

const saveUser = async () => {
  const editingId = userIdInput.value;
  const payload = {
    nome: userNameInput.value.trim().replace(/\s+/g, ' '),
    login: userLoginInput.value.trim().toLowerCase(),
    perfil: userRoleInput.value
  };
  const userError = validateUserPayload(payload);
  if (userError) throw new Error(userError);

  if (!editingId) {
    const passwordError = validatePasswordPair(
      userPasswordInput.value,
      userPasswordConfirmInput.value
    );
    if (passwordError) throw new Error(passwordError);
    payload.senha = userPasswordInput.value;
    payload.confirmacao_senha = userPasswordConfirmInput.value;
    payload.ativo = userActiveInput.checked;
    await settingsApi.createUser(payload);
    showMessage('Usuário cadastrado com sucesso.');
    return true;
  }

  const original = getUserById(editingId);
  if (
    original
    && original.perfil.slug !== payload.perfil
    && (original.perfil.slug === 'ADMINISTRADOR' || payload.perfil === 'ADMINISTRADOR')
  ) {
    const confirmed = await askConfirmation({
      title: 'Alterar perfil administrativo',
      message: 'Esta alteração muda permissões de acesso ao sistema.',
      confirmLabel: 'Alterar perfil',
      danger: true
    });
    if (!confirmed) return false;
  }

  await settingsApi.updateUser(editingId, payload);
  showMessage('Usuário atualizado com sucesso.');
  return true;
};

const changeUserStatus = async (user, button) => {
  const nextStatus = !user.ativo;
  const confirmed = await askConfirmation({
    title: nextStatus ? 'Reativar usuário' : 'Inativar usuário',
    message: nextStatus
      ? `Deseja reativar o acesso de ${user.nome}?`
      : `Deseja inativar ${user.nome}? As sessões ativas serão encerradas.`,
    confirmLabel: nextStatus ? 'Reativar' : 'Inativar',
    danger: !nextStatus
  });
  if (!confirmed) return;

  setButtonBusy(button, true);
  try {
    await settingsApi.updateUserStatus(user.id, nextStatus);
    showMessage(nextStatus ? 'Usuário reativado com sucesso.' : 'Usuário inativado com sucesso.');
    await refreshUsersAndOverview();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
};

const openResetPasswordDialog = (user) => {
  resetPasswordForm.reset();
  resetPasswordUserId.value = user.id;
  resetPasswordUserLabel.textContent = `As sessões ativas de ${user.nome} serão encerradas.`;
  resetPasswordDialog.showModal();
  resetPasswordInput.focus();
};

const setScreensaverPreview = (url) => {
  currentScreensaverImageUrl = url || null;
  screensaverPreviewImage.hidden = !url;
  if (url) screensaverPreviewImage.src = url;
};

const applyTerminalMonitor = (data) => {
  const terminal = data.terminal;
  const monitor = data.monitor;
  const settings = data.configuracoes;

  terminalDisplay.textContent = terminal.nome_exibicao || terminal.codigo;
  terminalCode.textContent = terminal.codigo;
  terminalStatus.textContent = terminal.situacao === 'CAIXA_ABERTO' ? 'Caixa aberto' : 'Sem caixa aberto';
  terminalOpenAt.textContent = terminal.caixa_aberto_em
    ? `Aberto em ${formatDateTime(terminal.caixa_aberto_em)}`
    : 'Sem caixa aberto';
  monitorLinked.textContent = monitor.vinculado ? 'Sim' : 'Não';
  monitorStatus.textContent = monitor.vinculado
    ? `Conectado, estado ${monitor.estado_atual}`
    : 'Monitor desconectado';

  terminalDisplayName.value = terminal.nome_exibicao || terminal.codigo;
  screensaverEnabled.checked = Boolean(settings.screensaver_ativo);
  screensaverIdleSeconds.value = String(settings.screensaver_tempo_inatividade);
  privacyClearSeconds.value = String(settings.privacidade_limpar_apos);
  screensaverMessage.value = settings.screensaver_mensagem || 'Toque na tela para consultar sua conta';
  setScreensaverPreview(settings.imagem?.url || null);
  removeScreensaverImageButton.hidden = !settings.imagem;
};

const loadTerminalMonitor = async () => {
  const data = await settingsApi.getTerminalMonitor();
  applyTerminalMonitor(data);
};

const validateSelectedImage = (file) => {
  if (!allowedImageTypes.has(file.type)) return 'Selecione uma imagem JPEG, PNG ou WebP.';
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (!allowedImageExtensions.has(extension)) {
    return 'A extensão da imagem deve ser JPG, PNG ou WebP.';
  }
  if (file.size <= 0 || file.size > maxImageSizeBytes) {
    return 'A imagem deve ter no máximo 5 MB.';
  }
  return null;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => resolve(reader.result), { once: true });
  reader.addEventListener('error', () => reject(new Error('Não foi possível ler o arquivo.')), { once: true });
  reader.readAsDataURL(file);
});

const showScreensaverImageMessage = (message = '', isError = false) => {
  screensaverImageMessage.textContent = message;
  screensaverImageMessage.className = isError ? 'field-help message error' : 'field-help';
};

const applyBackupSettings = (settings) => {
  autoBackupEnabled.checked = Boolean(settings.ativo);
  autoBackupTime.value = settings.horario || '23:00';
  backupRetentionDays.value = String(settings.retencao_dias || 15);
  nextBackupText.textContent = settings.proximo_backup_em
    ? `Próximo backup: ${formatDateTime(settings.proximo_backup_em)}`
    : 'Próximo backup: inativo';
};

const loadBackupSettings = async () => {
  applyBackupSettings(await settingsApi.getBackupSettings());
};

const renderBackupOptions = () => {
  restoreBackupSelect.replaceChildren();
  const available = backups.filter((backup) => backup.pode_restaurar);
  if (!available.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum backup disponível';
    restoreBackupSelect.appendChild(option);
    restoreBackupSelect.disabled = true;
    restoreExistingButton.disabled = true;
    return;
  }
  restoreBackupSelect.disabled = false;
  restoreExistingButton.disabled = false;
  available.forEach((backup) => {
    const option = document.createElement('option');
    option.value = backup.id;
    option.textContent = `${backup.nome_arquivo} - ${formatDateTime(backup.concluido_em)}`;
    restoreBackupSelect.appendChild(option);
  });
};

const renderBackups = () => {
  backupsTable.replaceChildren();
  if (!backups.length) {
    setTableMessage(backupsTable, 6, 'Nenhum backup encontrado.');
    renderBackupOptions();
    return;
  }

  backups.forEach((backup) => {
    const row = document.createElement('tr');
    const statusCell = document.createElement('td');
    const statusType = backup.status === 'SUCESSO'
      ? 'success'
      : backup.status === 'FALHA'
        ? 'error'
        : 'inactive';
    statusCell.appendChild(createStatusBadge(backup.status, statusType));

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'settings-actions';

    const downloadButton = document.createElement('button');
    downloadButton.type = 'button';
    downloadButton.className = 'secondary-action compact-button';
    downloadButton.textContent = 'Baixar';
    downloadButton.disabled = !backup.pode_baixar;
    downloadButton.addEventListener('click', () => {
      window.location.href = settingsApi.getBackupDownloadUrl(backup.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-action compact-button';
    deleteButton.textContent = 'Excluir';
    deleteButton.disabled = !backup.pode_baixar;
    deleteButton.addEventListener('click', () => deleteBackup(backup, deleteButton));

    actions.append(downloadButton, deleteButton);
    actionsCell.appendChild(actions);

    row.append(
      createCell(backup.nome_arquivo),
      createCell(backup.tipo),
      statusCell,
      createCell(formatDateTime(backup.concluido_em || backup.iniciado_em)),
      createCell(formatBytes(backup.tamanho_bytes)),
      actionsCell
    );
    backupsTable.appendChild(row);
  });
  renderBackupOptions();
};

const loadBackups = async () => {
  setTableMessage(backupsTable, 6, 'Carregando backups...');
  const result = await settingsApi.listBackups();
  backups = result.backups || [];
  renderBackups();
};

const deleteBackup = async (backup, button) => {
  const confirmed = await askConfirmation({
    title: 'Excluir backup',
    message: `Deseja excluir o arquivo ${backup.nome_arquivo}?`,
    confirmLabel: 'Excluir backup',
    danger: true
  });
  if (!confirmed) return;

  setButtonBusy(button, true);
  try {
    await settingsApi.deleteBackup(backup.id);
    showMessage('Backup excluído com sucesso.');
    await Promise.all([loadBackups(), loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
};

const renderAudit = (result) => {
  auditTable.replaceChildren();
  const items = result.items || [];
  auditTotal = result.total || 0;
  if (!items.length) {
    setTableMessage(auditTable, 4, 'Nenhuma atividade administrativa registrada.');
  } else {
    items.forEach((item) => {
      const row = document.createElement('tr');
      const resultCell = document.createElement('td');
      resultCell.appendChild(createStatusBadge(
        item.resultado === 'SUCESSO' ? 'Sucesso' : 'Falha',
        item.resultado === 'SUCESSO' ? 'success' : 'error'
      ));
      row.append(
        createCell(formatDateTime(item.criado_em)),
        createCell(item.usuario_nome || 'Sistema'),
        createCell(item.acao),
        resultCell
      );
      auditTable.appendChild(row);
    });
  }
  const page = Math.floor(auditOffset / auditLimit) + 1;
  const pages = Math.max(Math.ceil(auditTotal / auditLimit), 1);
  auditPaginationInfo.textContent = `Página ${page} de ${pages}`;
  auditPrevButton.disabled = auditOffset <= 0;
  auditNextButton.disabled = auditOffset + auditLimit >= auditTotal;
};

const loadAudit = async () => {
  setTableMessage(auditTable, 4, 'Carregando atividades...');
  renderAudit(await settingsApi.listAudit({ limit: auditLimit, offset: auditOffset }));
};

const activateSettingsTab = (panelId) => {
  document.querySelectorAll('[data-settings-tab]').forEach((tab) => {
    const active = tab.dataset.settingsTab === panelId;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.settings-tab-panel').forEach((panel) => {
    const active = panel.id === panelId;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
};

const getInitialTabPanel = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = (params.get('tab') || window.location.hash.slice(1)).trim().toLowerCase();
  const tabAliases = new Map([
    ['usuarios', 'usersPanel'],
    ['usuarios-permissoes', 'usersPanel'],
    ['terminal', 'terminalPanel'],
    ['terminal-monitor', 'terminalPanel'],
    ['seguranca', 'securityPanel'],
    ['seguranca-backup', 'securityPanel'],
    ['sobre-licenca', 'aboutLicensePanel'],
    ['sobre-e-licenca', 'aboutLicensePanel'],
    ['about-license', 'aboutLicensePanel']
  ]);
  return tabAliases.get(requestedTab) || 'usersPanel';
};

const configureSettingsAccess = (roleSlug) => {
  const isAdmin = roleSlug === 'ADMINISTRADOR';
  adminSettingsElements.forEach((element) => {
    element.hidden = !isAdmin;
  });
  return isAdmin;
};

document.querySelectorAll('[data-settings-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    activateSettingsTab(button.dataset.settingsTab);
  });
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.closeDialog)?.close();
  });
});

confirmCancelButton.addEventListener('click', () => resolveConfirm(false));
confirmDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  resolveConfirm(false);
});
confirmForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const requiredText = confirmTextInput.dataset.requiredText || '';
  if (requiredText && confirmTextInput.value.trim() !== requiredText) {
    confirmTextInput.setCustomValidity(`Digite ${requiredText} para confirmar.`);
    confirmTextInput.reportValidity();
    return;
  }
  resolveConfirm(true);
});
confirmTextInput.addEventListener('input', () => confirmTextInput.setCustomValidity(''));

addUserButton.addEventListener('click', openAddUserDialog);
userFilters.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await loadUsers();
  } catch (error) {
    showMessage(error.message, true);
  }
});
userRoleFilter.addEventListener('change', () => userFilters.requestSubmit());
userStatusFilter.addEventListener('change', () => userFilters.requestSubmit());

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setButtonBusy(userSaveButton, true, 'Salvando...');
  try {
    const saved = await saveUser();
    if (!saved) return;
    userDialog.close();
    await refreshUsersAndOverview();
    await loadAudit();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(userSaveButton, false);
  }
});

resetPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const passwordError = validatePasswordPair(
    resetPasswordInput.value,
    resetPasswordConfirmInput.value,
    'Nova senha'
  );
  if (passwordError) {
    showMessage(passwordError, true);
    return;
  }
  const user = getUserById(resetPasswordUserId.value);
  const confirmed = await askConfirmation({
    title: 'Redefinir senha',
    message: `Deseja redefinir a senha de ${user?.nome || 'este usuário'}? As sessões ativas serão encerradas.`,
    confirmLabel: 'Redefinir senha',
    danger: true
  });
  if (!confirmed) return;

  setButtonBusy(resetPasswordSaveButton, true, 'Redefinindo...');
  try {
    await settingsApi.resetUserPassword(resetPasswordUserId.value, {
      senha: resetPasswordInput.value,
      confirmacao_senha: resetPasswordConfirmInput.value
    });
    resetPasswordDialog.close();
    resetPasswordForm.reset();
    showMessage('Senha redefinida com sucesso.');
    await loadAudit();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(resetPasswordSaveButton, false);
  }
});

terminalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setButtonBusy(terminalSaveButton, true, 'Salvando...');
  try {
    await settingsApi.updateTerminal({ nome_exibicao: terminalDisplayName.value });
    showMessage('Terminal atualizado com sucesso.');
    await Promise.all([loadTerminalMonitor(), loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(terminalSaveButton, false);
  }
});

openMonitorPageButton.addEventListener('click', () => {
  const monitorWindow = window.open('/monitor', '_blank', 'noopener');
  if (monitorWindow) monitorWindow.opener = null;
});

chooseScreensaverImageButton.addEventListener('click', () => {
  screensaverImageInput.click();
});

screensaverImageInput.addEventListener('change', async () => {
  const file = screensaverImageInput.files?.[0];
  selectedScreensaverImage = null;
  selectedScreensaverPreviewUrl = null;
  uploadScreensaverImageButton.disabled = true;
  if (!file) return;

  const validationError = validateSelectedImage(file);
  if (validationError) {
    showScreensaverImageMessage(validationError, true);
    screensaverImageInput.value = '';
    setScreensaverPreview(currentScreensaverImageUrl);
    return;
  }

  try {
    selectedScreensaverPreviewUrl = await readFileAsDataUrl(file);
    selectedScreensaverImage = file;
    setScreensaverPreview(selectedScreensaverPreviewUrl);
    uploadScreensaverImageButton.disabled = false;
    showScreensaverImageMessage('Prévia carregada. Envie a imagem para aplicar no monitor.');
  } catch (error) {
    showScreensaverImageMessage(error.message, true);
  }
});

screensaverPreviewImage.addEventListener('error', () => {
  screensaverPreviewImage.hidden = true;
});

uploadScreensaverImageButton.addEventListener('click', async () => {
  if (!selectedScreensaverImage) return;
  setButtonBusy(uploadScreensaverImageButton, true, 'Enviando...');
  try {
    await settingsApi.uploadScreensaverImage(selectedScreensaverImage);
    selectedScreensaverImage = null;
    selectedScreensaverPreviewUrl = null;
    screensaverImageInput.value = '';
    showScreensaverImageMessage('Imagem do protetor enviada com sucesso.');
    await Promise.all([loadTerminalMonitor(), loadAudit()]);
  } catch (error) {
    showScreensaverImageMessage(error.message, true);
  } finally {
    uploadScreensaverImageButton.disabled = true;
    setButtonBusy(uploadScreensaverImageButton, false);
    uploadScreensaverImageButton.disabled = !selectedScreensaverImage;
  }
});

removeScreensaverImageButton.addEventListener('click', async () => {
  const confirmed = await askConfirmation({
    title: 'Remover imagem do protetor',
    message: 'Deseja remover a imagem personalizada e voltar ao visual padrão?',
    confirmLabel: 'Remover imagem',
    danger: true
  });
  if (!confirmed) return;

  setButtonBusy(removeScreensaverImageButton, true, 'Removendo...');
  try {
    await settingsApi.removeScreensaverImage();
    showScreensaverImageMessage('Imagem removida. O visual padrão será usado.');
    await Promise.all([loadTerminalMonitor(), loadAudit()]);
  } catch (error) {
    showScreensaverImageMessage(error.message, true);
  } finally {
    setButtonBusy(removeScreensaverImageButton, false);
  }
});

monitorSettingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setButtonBusy(monitorSaveButton, true, 'Salvando...');
  try {
    await settingsApi.updateMonitor({
      screensaver_ativo: screensaverEnabled.checked,
      screensaver_tempo_inatividade: Number(screensaverIdleSeconds.value),
      screensaver_mensagem: screensaverMessage.value,
      privacidade_limpar_apos: Number(privacyClearSeconds.value)
    });
    showMessage('Configurações do monitor salvas com sucesso.');
    await Promise.all([loadTerminalMonitor(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(monitorSaveButton, false);
  }
});

previewScreensaverButton.addEventListener('click', () => {
  const previewUrl = selectedScreensaverPreviewUrl || currentScreensaverImageUrl;
  screensaverPreviewDialogMessage.textContent = screensaverMessage.value.trim()
    || 'Toque na tela para consultar sua conta';
  screensaverPreviewDialogImage.hidden = !previewUrl;
  if (previewUrl) screensaverPreviewDialogImage.src = previewUrl;
  screensaverPreviewDialog.showModal();
});

closeScreensaverPreviewButton.addEventListener('click', () => {
  screensaverPreviewDialog.close();
});

screensaverPreviewDialogImage.addEventListener('error', () => {
  screensaverPreviewDialogImage.hidden = true;
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const passwordError = validatePasswordPair(
    newPassword.value,
    confirmNewPassword.value,
    'Nova senha'
  );
  if (passwordError) {
    showMessage(passwordError, true);
    return;
  }

  setButtonBusy(passwordSaveButton, true, 'Alterando...');
  try {
    await settingsApi.changeOwnPassword({
      senha_atual: currentPassword.value,
      nova_senha: newPassword.value,
      confirmacao_senha: confirmNewPassword.value
    });
    passwordForm.reset();
    showMessage('Senha alterada com sucesso.');
    await loadAudit();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(passwordSaveButton, false);
  }
});

generateBackupButton.addEventListener('click', async () => {
  setButtonBusy(generateBackupButton, true, 'Gerando...');
  showMessage('Gerando backup. Aguarde a conclusão.');
  try {
    await settingsApi.generateBackup();
    showMessage('Backup gerado com sucesso.');
    await Promise.all([loadBackups(), loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
    await Promise.all([loadBackups(), loadAudit()]).catch(() => {});
  } finally {
    setButtonBusy(generateBackupButton, false);
  }
});

autoBackupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setButtonBusy(autoBackupSaveButton, true, 'Salvando...');
  try {
    const settings = await settingsApi.updateBackupSettings({
      ativo: autoBackupEnabled.checked,
      horario: autoBackupTime.value,
      retencao_dias: Number(backupRetentionDays.value)
    });
    applyBackupSettings(settings);
    showMessage('Backup automático atualizado com sucesso.');
    await Promise.all([loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setButtonBusy(autoBackupSaveButton, false);
  }
});

restoreExistingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const confirmed = await askConfirmation({
    title: 'Restaurar backup',
    message: 'A restauração substituirá os dados atuais. Um backup de segurança será criado antes.',
    confirmLabel: 'Restaurar',
    danger: true,
    requiredText: 'RESTAURAR'
  });
  if (!confirmed) return;

  setButtonBusy(restoreExistingButton, true, 'Restaurando...');
  try {
    await settingsApi.restoreBackup({
      backupId: restoreBackupSelect.value,
      confirmation: restoreConfirmation.value
    });
    restoreExistingForm.reset();
    showMessage('Backup restaurado com sucesso.');
    await Promise.all([loadBackups(), loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
    await Promise.all([loadBackups(), loadAudit()]).catch(() => {});
  } finally {
    setButtonBusy(restoreExistingButton, false);
  }
});

const validateSqlUpload = (file) => {
  if (!file) return 'Selecione um arquivo SQL.';
  if (!file.name.toLowerCase().endsWith('.sql')) return 'O arquivo deve ter extensão .sql.';
  if (file.size <= 0 || file.size > maxSqlBackupSizeBytes) {
    return 'O arquivo deve ter no máximo 200 MB.';
  }
  return null;
};

restoreUploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = restoreUploadInput.files?.[0];
  const uploadError = validateSqlUpload(file);
  if (uploadError) {
    showMessage(uploadError, true);
    return;
  }

  const confirmed = await askConfirmation({
    title: 'Restaurar arquivo enviado',
    message: 'O arquivo enviado substituirá os dados atuais. Um backup de segurança será criado antes.',
    confirmLabel: 'Enviar e restaurar',
    danger: true,
    requiredText: 'RESTAURAR'
  });
  if (!confirmed) return;

  setButtonBusy(restoreUploadButton, true, 'Restaurando...');
  try {
    await settingsApi.restoreUploadedBackup({
      file,
      confirmation: restoreUploadConfirmation.value
    });
    restoreUploadForm.reset();
    showMessage('Arquivo restaurado com sucesso.');
    await Promise.all([loadBackups(), loadOverview(), loadAudit()]);
  } catch (error) {
    showMessage(error.message, true);
    await Promise.all([loadBackups(), loadAudit()]).catch(() => {});
  } finally {
    setButtonBusy(restoreUploadButton, false);
  }
});

auditPrevButton.addEventListener('click', async () => {
  auditOffset = Math.max(auditOffset - auditLimit, 0);
  await loadAudit();
});

auditNextButton.addEventListener('click', async () => {
  if (auditOffset + auditLimit >= auditTotal) return;
  auditOffset += auditLimit;
  await loadAudit();
});

const initializeSettings = async () => {
  try {
    showMessage('Carregando configurações...');
    const { user } = await authApi.me();
    const isAdmin = configureSettingsAccess(user.role.slug);
    activateSettingsTab(isAdmin ? getInitialTabPanel() : 'aboutLicensePanel');
    await loadAboutLicense();
    if (isAdmin) {
      await loadRoles();
      await Promise.all([
        loadUsers(),
        loadOverview(),
        loadTerminalMonitor(),
        loadBackupSettings(),
        loadBackups(),
        loadAudit()
      ]);
    }
    showMessage();
  } catch (error) {
    showMessage(error.message || 'Não foi possível carregar as configurações.', true);
  }
};

initializeSettings();
