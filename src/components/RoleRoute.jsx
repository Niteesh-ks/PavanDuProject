
import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function RoleRoute({ allowedRoles, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="metadata-text">
          Verifying Role Permissions...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check Supabase configuration and authorized account role.
  // No college_id or college association is required.
  if (!isSupabaseConfigured || !allowedRoles.includes(role)) {
    return (
      <div
        className="main-content"
        style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.1)',
            color: '#F43F5E',
            marginBottom: '1.25rem',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h2 className="section-title">Access Restricted</h2>

        <p
          style={{
            color: 'var(--text-secondary)',
            maxWidth: '420px',
            margin: '0.75rem auto 1.5rem',
          }}
        >
          This section requires an authorized{' '}
          <strong>{allowedRoles.join(' or ')}</strong> account.

          {!isSupabaseConfigured
            ? ' Privileged access is unavailable until Supabase authentication is configured.'
            : ` Your verified role is ${role}.`}
        </p>

        <Link to="/discover" className="btn btn-primary">
          Return to Discover
        </Link>
      </div>
    );
  }

  return children;
}
