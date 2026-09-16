const express = require('express');
const { supabaseAdmin, supabaseAnon } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');

const router = express.Router();

const VALID_ROLES = ['student', 'mentor', 'teacher', 'admin'];

// POST /api/auth/signup — create Supabase Auth user + users_profile row
router.post('/signup', async (req, res) => {
  const { email, password, full_name, role, phone } = req.body || {};

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  const userId = created.user.id;

  const { error: profileError } = await supabaseAdmin.from('users_profile').insert({
    id: userId,
    full_name,
    role,
    phone: phone || null,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account behind
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(400).json({ error: profileError.message });
  }

  if (role === 'student') {
    await supabaseAdmin.from('students').insert({ id: userId, admission_stage: 'looking' });
  } else if (role === 'mentor' || role === 'teacher') {
    await supabaseAdmin.from('mentors').insert({ id: userId });
  }

  return res.status(201).json({ id: userId, email, full_name, role });
});

// POST /api/auth/login — proxy to Supabase Auth, returns JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email },
  });
});

// GET /api/auth/me — current user's profile + role
router.get('/me', requireAuth, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, profile: req.profile });
});

module.exports = router;
