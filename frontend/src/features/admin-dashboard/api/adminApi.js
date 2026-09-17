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

  if (res.status === 204) return null;

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

// Students
export const listStudents = (token, params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return request(`/admin/students${qs ? `?${qs}` : ''}`, { token });
};
export const createStudent = (token, payload) => request('/admin/students', { token, method: 'POST', body: payload });
export const updateStudent = (token, id, payload) => request(`/admin/students/${id}`, { token, method: 'PUT', body: payload });
export const deleteStudent = (token, id) => request(`/admin/students/${id}`, { token, method: 'DELETE' });

// Mentors
export const listMentors = (token) => request('/admin/mentors', { token });
export const createMentor = (token, payload) => request('/admin/mentors', { token, method: 'POST', body: payload });
export const updateMentor = (token, id, payload) => request(`/admin/mentors/${id}`, { token, method: 'PUT', body: payload });
export const deleteMentor = (token, id) => request(`/admin/mentors/${id}`, { token, method: 'DELETE' });

// Matching
export const matchMentor = (token, student_id, mentor_id) =>
  request('/admin/match', { token, method: 'POST', body: { student_id, mentor_id } });

// Courses
export const listCourses = (token) => request('/admin/courses', { token });
export const createCourse = (token, payload) => request('/admin/courses', { token, method: 'POST', body: payload });
export const updateCourse = (token, id, payload) => request(`/admin/courses/${id}`, { token, method: 'PUT', body: payload });
export const deleteCourse = (token, id) => request(`/admin/courses/${id}`, { token, method: 'DELETE' });

// Universities
export const listUniversities = (token) => request('/admin/universities', { token });
export const createUniversity = (token, payload) => request('/admin/universities', { token, method: 'POST', body: payload });
export const updateUniversity = (token, id, payload) =>
  request(`/admin/universities/${id}`, { token, method: 'PUT', body: payload });
export const deleteUniversity = (token, id) => request(`/admin/universities/${id}`, { token, method: 'DELETE' });

// Users
export const listUsers = (token) => request('/admin/users', { token });
export const createUser = (token, payload) => request('/admin/users', { token, method: 'POST', body: payload });
export const updateUser = (token, id, payload) => request(`/admin/users/${id}`, { token, method: 'PATCH', body: payload });
export const deleteUser = (token, id) => request(`/admin/users/${id}`, { token, method: 'DELETE' });

// Analytics
export const getAnalyticsOverview = (token) => request('/admin/analytics/overview', { token });
export const getUniversityAnalytics = (token) => request('/admin/analytics/universities', { token });
