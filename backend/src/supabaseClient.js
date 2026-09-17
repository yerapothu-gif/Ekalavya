const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service-role client: bypasses RLS. Use only for trusted server-side work
// (signup, admin CRUD after role checks). Never expose this key to the client.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client: used to verify a caller's JWT and to run queries that should
// still be subject to RLS as a second layer of defense.
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Per-request client carrying the caller's own JWT as the Authorization
// header, so Postgres RLS evaluates auth.uid() as that user rather than as
// anonymous. Used after requireAuth has verified the token, for the
// users_profile lookup and by downstream modules for their own queries.
function createScopedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

module.exports = { supabaseAdmin, supabaseAnon, createScopedClient };
