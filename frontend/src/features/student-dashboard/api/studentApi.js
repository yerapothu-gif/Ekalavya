import { API_BASE_URL } from '../../../lib/supabaseClient';

async function request(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}

export function getMyProfile(token) {
  return request('/students/me', { token });
}

export function updateMyProfile(token, payload) {
  return request('/students/me', { token, method: 'PUT', body: payload });
}

export function getMyAttendance(token) {
  return request('/students/me/attendance', { token });
}

export function getMyUniversities(token) {
  return request('/students/me/universities', { token });
}
