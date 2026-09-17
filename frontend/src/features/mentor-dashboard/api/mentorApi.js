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

export function getMyStudents(token) {
  return request('/mentors/me/students', { token });
}

export function getStudentDetail(token, studentId) {
  return request(`/mentors/me/students/${studentId}`, { token });
}

export function updateStudentStage(token, studentId, admission_stage) {
  return request(`/mentors/me/students/${studentId}/stage`, {
    token,
    method: 'PATCH',
    body: { admission_stage },
  });
}

export function addNote(token, student_id, note_text) {
  return request('/mentors/me/notes', { token, method: 'POST', body: { student_id, note_text } });
}

export function getMyCourses(token) {
  return request('/mentors/me/courses', { token });
}

export function getMyClasses(token) {
  return request('/mentors/me/classes', { token });
}

export function getClassAttendance(token, classId) {
  return request(`/mentors/me/attendance/${classId}`, { token });
}

export function markAttendance(token, payload) {
  return request('/mentors/me/attendance', { token, method: 'POST', body: payload });
}
