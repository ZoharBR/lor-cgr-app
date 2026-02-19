const API_BASE = '/devices/api';

const fetchAPI = async (endpoint, options = {}) => {
  const response = await fetch(API_BASE + endpoint, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error('API Error: ' + response.status);
  return response.json();
};

export const devicesApi = {
  list: () => fetchAPI('/list/'),
  save: (data) => fetchAPI('/save/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI('/save/', { method: 'POST', body: JSON.stringify({ id, action: 'delete' }) }),
  dashboard: () => fetchAPI('/dashboard/'),
  discovery: (deviceId) => fetchAPI('/discovery/', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
};

export const backupsApi = {
  list: () => fetchAPI('/backup/list/'),
  run: (deviceId) => fetchAPI('/backup/run/', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
  view: (path) => fetchAPI('/backup/view/', { method: 'POST', body: JSON.stringify({ path }) }),
  delete: (path) => fetchAPI('/backup/delete/', { method: 'POST', body: JSON.stringify({ path }) }),
  bulk: (action, devices) => fetchAPI('/backup/bulk/', { method: 'POST', body: JSON.stringify({ action, devices }) }),
};

export const auditApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return fetchAPI('/audit-logs/' + (params ? '?' + params : ''));
  },
};

export const terminalApi = {
  sessions: () => fetchAPI('/terminal-sessions/'),
  log: (sessionId) => fetchAPI('/session-log/' + sessionId + '/'),
};

export default { devicesApi, backupsApi, auditApi, terminalApi };
