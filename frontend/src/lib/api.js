const API_BASE = '/devices/api';
const SETTINGS_API = '/api/settings';

const fetchAPI = async (endpoint, options = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error('API Error: ' + response.status);
  return response.json();
};

export const devicesApi = {
  list: () => fetchAPI(API_BASE + '/list/'),
  save: (data) => fetchAPI(API_BASE + '/save/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(API_BASE + '/save/', { method: 'POST', body: JSON.stringify({ id, action: 'delete' }) }),
  dashboard: () => fetchAPI(API_BASE + '/dashboard/'),
  discovery: (deviceId) => fetchAPI(API_BASE + '/discovery/', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
};

export const backupsApi = {
  list: () => fetchAPI(API_BASE + '/backup/list/'),
  run: (deviceId) => fetchAPI(API_BASE + '/backup/run/', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
  view: (path) => fetchAPI(API_BASE + '/backup/view/', { method: 'POST', body: JSON.stringify({ path }) }),
  delete: (path) => fetchAPI(API_BASE + '/backup/delete/', { method: 'POST', body: JSON.stringify({ path }) }),
  bulk: (action, devices) => fetchAPI(API_BASE + '/backup/bulk/', { method: 'POST', body: JSON.stringify({ action, devices }) }),
};

export const auditApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return fetchAPI(API_BASE + '/audit-logs/' + (params ? '?' + params : ''));
  },
};

export const terminalApi = {
  sessions: () => fetchAPI(API_BASE + '/terminal-sessions/'),
  log: (sessionId) => fetchAPI(API_BASE + '/session-log/' + sessionId + '/'),
};

export const settingsApi = {
  get: () => fetchAPI(SETTINGS_API + '/get/'),
  save: (data) => fetchAPI(SETTINGS_API + '/save/', { method: 'POST', body: JSON.stringify(data) }),
  testLibreNMS: () => fetchAPI(SETTINGS_API + '/test/librenms/', { method: 'POST' }),
  testPhpIPAM: () => fetchAPI(SETTINGS_API + '/test/phpipam/', { method: 'POST' }),
  testGroq: () => fetchAPI(SETTINGS_API + '/test/groq/', { method: 'POST' }),
  gitStatus: () => fetchAPI(SETTINGS_API + '/git/status/', { method: 'POST' }),
  gitBackup: () => fetchAPI(SETTINGS_API + '/git/backup/', { method: 'POST' }),
  gitInit: (repoUrl) => fetchAPI(SETTINGS_API + '/git/init/', { method: 'POST', body: JSON.stringify({ repo_url: repoUrl }) }),
};

export default { devicesApi, backupsApi, auditApi, terminalApi, settingsApi };
