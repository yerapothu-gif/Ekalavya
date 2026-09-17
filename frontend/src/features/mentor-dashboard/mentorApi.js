import { API_BASE_URL } from '../../lib/supabaseClient';

async function fetchWithAuth(url, session, options = {}) {
  const token = session?.access_token;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getMentorStudents(session) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/students`, session);
}

export async function getMentorStudentDetail(session, studentId) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/students/${studentId}`, session);
}

export async function updateAdmissionStage(session, studentId, stage) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/students/${studentId}/stage`, session, {
    method: 'PATCH',
    body: JSON.stringify({ admission_stage: stage }),
  });
}

export async function addMentorNote(session, studentId, noteText) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/notes`, session, {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, note_text: noteText }),
  });
}

export async function markAttendance(session, attendanceData) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/attendance`, session, {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  });
}

export async function getMentorClasses(session) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/classes`, session);
}

export async function getMentorCourses(session) {
  return fetchWithAuth(`${API_BASE_URL}/mentors/me/courses`, session);
}
