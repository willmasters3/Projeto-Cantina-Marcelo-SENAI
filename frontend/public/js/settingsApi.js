const API_BASE_URL = '/api/v1/settings';

const request = async (path = '', options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    if (response.status === 403) window.location.href = '/app/caixa?accessDenied=1';
    const error = new Error(payload?.error || 'Não foi possível concluir a operação');
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload?.data ?? payload;
};

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const getOverview = async () => request('/overview');
const getAboutLicense = async () => request('/about-license');
const listRoles = async () => request('/roles');
const listUsers = async (filters = {}) => request(`/users${buildQuery(filters)}`);
const createUser = async (payload) => request('/users', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const updateUser = async (id, payload) => request(`/users/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const updateUserStatus = async (id, ativo) => request(`/users/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ ativo })
});
const resetUserPassword = async (id, payload) => request(`/users/${id}/password`, {
  method: 'POST',
  body: JSON.stringify(payload)
});

const changeOwnPassword = async (payload) => request('/password', {
  method: 'POST',
  body: JSON.stringify(payload)
});

const getTerminalMonitor = async () => request('/terminal-monitor');
const updateTerminal = async (payload) => request('/terminal', {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const updateMonitor = async (payload) => request('/monitor', {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const uploadScreensaverImage = async (file) => request('/monitor/screensaver-image', {
  method: 'POST',
  headers: {
    'Content-Type': file.type,
    'X-File-Name': encodeURIComponent(file.name)
  },
  body: file
});
const removeScreensaverImage = async () => request('/monitor/screensaver-image', {
  method: 'DELETE'
});

const getBackupSettings = async () => request('/backup-settings');
const updateBackupSettings = async (payload) => request('/backup-settings', {
  method: 'PUT',
  body: JSON.stringify(payload)
});
const listBackups = async () => request('/backups');
const generateBackup = async () => request('/backups', { method: 'POST' });
const deleteBackup = async (id) => request(`/backups/${id}`, { method: 'DELETE' });
const restoreBackup = async (payload) => request('/backups/restore', {
  method: 'POST',
  body: JSON.stringify(payload)
});
const restoreUploadedBackup = async ({ file, confirmation }) => request(
  `/backups/restore-upload${buildQuery({ confirmacao: confirmation })}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/sql',
      'X-File-Name': encodeURIComponent(file.name)
    },
    body: file
  }
);
const getBackupDownloadUrl = (id) => `${API_BASE_URL}/backups/${encodeURIComponent(id)}/download`;

const listAudit = async ({ limit = 10, offset = 0 } = {}) => (
  request(`/audit${buildQuery({ limit, offset })}`)
);

export default {
  changeOwnPassword,
  createUser,
  deleteBackup,
  generateBackup,
  getBackupDownloadUrl,
  getBackupSettings,
  getAboutLicense,
  getOverview,
  getTerminalMonitor,
  listAudit,
  listBackups,
  listRoles,
  listUsers,
  removeScreensaverImage,
  resetUserPassword,
  restoreBackup,
  restoreUploadedBackup,
  updateBackupSettings,
  updateMonitor,
  updateTerminal,
  updateUser,
  updateUserStatus,
  uploadScreensaverImage
};
