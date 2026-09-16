const { supabaseAnon } = require('../supabaseClient');

// Verifies the Supabase JWT sent in the Authorization header and attaches
// req.user (Supabase auth user) + req.profile (users_profile row) so every
// downstream module can trust req.user.id / req.profile.role without
// re-verifying the token itself.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from('users_profile')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'No profile found for this user' });
  }

  req.token = token;
  req.user = data.user;
  req.profile = profile;
  next();
}

module.exports = requireAuth;
