import { createAuthenticatedSupabaseClient, createServiceSupabaseClient } from '../services/supabaseClients.js';

export async function requireAuthenticatedUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userClient = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const serviceClient = createServiceSupabaseClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, role, full_name, email, college_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'A valid Meet Hub profile is required' });
    }

    req.authUser = user;
    req.authProfile = profile;
    req.supabase = userClient;
    return next();
  } catch (error) {
    console.error('[Authentication Middleware]', error.message);
    return res.status(503).json({ error: 'Authentication service is unavailable' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.authProfile || !allowedRoles.includes(req.authProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (req.authProfile.role === 'ORGANIZER' && !req.authProfile.college_id) {
      return res.status(403).json({ error: 'An organizer profile with an associated college is required' });
    }
    return next();
  };
}
