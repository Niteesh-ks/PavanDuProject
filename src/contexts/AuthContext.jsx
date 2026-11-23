import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from './ThemeContext';
import { getPortalAccessError } from '../lib/portalAccess';

const AuthContext = createContext(null);

const VALID_PORTAL_ROLES = ['STUDENT', 'ORGANIZER', 'ADMIN'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { triggerChromaticExplosion } = useTheme();

  // Load the existing authenticated session when the app starts.
  useEffect(() => {
    let mounted = true;
    let authSubscription;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const {
            data: { session: initialSession },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (mounted && initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchUserProfile(initialSession.user.id);
          }
        } catch (err) {
          console.warn('[Supabase Auth Init]', err.message);
        } finally {
          if (mounted) setLoading(false);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;

          setSession(newSession);
          setUser(newSession?.user || null);

          if (
            (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
            newSession?.user
          ) {
            try {
              await fetchUserProfile(newSession.user.id);
            } catch (profileError) {
              if (mounted) {
                setProfile(null);
                console.error('[Auth profile update]', profileError.message);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
          }
        });

        authSubscription = subscription;
      } else {
        // Local development fallback. Local users are always Students.
        const storedLocalUser = localStorage.getItem('meethub_local_user');

        if (storedLocalUser) {
          try {
            const parsed = JSON.parse(storedLocalUser);
            const studentProfile = { ...parsed, role: 'STUDENT' };
            setUser(studentProfile);
            setProfile(studentProfile);
            setSession({
              user: studentProfile,
              access_token: 'local_dev_token',
            });
          } catch {
            localStorage.removeItem('meethub_local_user');
          }
        }

        setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(userId) {
    if (!isSupabaseConfigured || !userId) {
      throw new Error('A configured authenticated profile is required.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,full_name,email,role,college_id,college_name,interests,avatar_url,updated_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      console.error('[Fetch Profile]', error.message);
      throw new Error(
        'Unable to verify your account profile. Please try again.'
      );
    }

    if (!data) {
      setProfile(null);
      throw new Error(
        'Your account does not have a Meet Hub profile. Contact support.'
      );
    }

    setProfile(data);
    return data;
  }

  /**
   * Register a new account.
   *
   * requestedRole is stored only as signup metadata. It is NOT used to grant
   * Organizer or Admin permissions. The trusted role in public.profiles remains
   * authoritative and must be changed by a secure administrator-side process.
   */
  async function signUp({
    email,
    password,
    fullName,
    collegeId,
    collegeName,
    interests = [],
    requestedRole = 'STUDENT',
  }) {
    const normalizedRequestedRole = String(requestedRole || 'STUDENT').toUpperCase();

    if (!VALID_PORTAL_ROLES.includes(normalizedRequestedRole)) {
      throw new Error('Please select a valid portal.');
    }

    if (!fullName?.trim()) {
      throw new Error('Full name is required.');
    }

    if (!email?.trim()) {
      throw new Error('Email address is required.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (['STUDENT', 'ORGANIZER'].includes(normalizedRequestedRole) && !collegeId) {
      throw new Error('Please select your college from the college directory.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            college_id: collegeId || null,
            college_name: collegeName || null,
            interests,
            // Informational request only. Never treat this as an authorized role.
            requested_role: normalizedRequestedRole,
          },
        },
      });

      if (error) throw error;

      if (data?.user && !data.session) {
        setVerificationPending(true);
        setVerificationEmail(email.trim());

        return {
          verificationPending: true,
          requestedRole: normalizedRequestedRole,
        };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);

        try {
          const verifiedProfile = await fetchUserProfile(data.user.id);

          // A request for Organizer/Admin does not grant that role.
          if (
            normalizedRequestedRole !== 'STUDENT' &&
            verifiedProfile.role !== normalizedRequestedRole
          ) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);

            return {
              user: data.user,
              session: null,
              authorizationPending: true,
              requestedRole: normalizedRequestedRole,
            };
          }
        } catch (profileError) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          throw profileError;
        }

        triggerChromaticExplosion();
      }

      return {
        user: data.user,
        session: data.session,
        requestedRole: normalizedRequestedRole,
      };
    }

    // Local development fallback is intentionally Student-only.
    if (normalizedRequestedRole !== 'STUDENT') {
      throw new Error(
        'Organizer and Admin registration require a configured Supabase project and administrator authorization.'
      );
    }

    const newDevUser = {
      id: `usr_${Date.now()}`,
      email: email.trim(),
      full_name:
        fullName ||
        email
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      role: 'STUDENT',
      college_id: collegeId || null,
      college_name: collegeName,
      interests,
    };

    localStorage.setItem('meethub_local_user', JSON.stringify(newDevUser));
    setUser(newDevUser);
    setProfile(newDevUser);
    setSession({ user: newDevUser, access_token: 'local_dev_token' });
    triggerChromaticExplosion();

    return {
      user: newDevUser,
      session: { access_token: 'local_dev_token' },
      requestedRole: 'STUDENT',
    };
  }

  /**
   * Sign in and verify the selected portal against the trusted profile role.
   */
  async function signIn({ email, password, expectedRole = 'STUDENT' }) {
    const normalizedExpectedRole = String(expectedRole || 'STUDENT').toUpperCase();

    if (!VALID_PORTAL_ROLES.includes(normalizedExpectedRole)) {
      throw new Error('Please select a valid portal.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(data.session);
      setUser(data.user);
      setProfile(null);

      let verifiedProfile;

      try {
        verifiedProfile = await fetchUserProfile(data.user.id);

        const accessError = getPortalAccessError(
          verifiedProfile,
          normalizedExpectedRole
        );

        if (accessError) throw new Error(accessError);
      } catch (profileError) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        throw profileError;
      }

      triggerChromaticExplosion();
      return { ...data, profile: verifiedProfile };
    }

    if (normalizedExpectedRole !== 'STUDENT') {
      throw new Error(
        'Organizer and Admin portals require a verified Supabase account.'
      );
    }

    const devProfile = {
      id: `usr_${email.replace(/[^a-z0-9]/gi, '_')}`,
      email,
      full_name: email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      role: 'STUDENT',
      college_name: 'PES University',
      interests: ['Hackathons & AI', 'Robotics & Hardware'],
    };

    localStorage.setItem('meethub_local_user', JSON.stringify(devProfile));
    setUser(devProfile);
    setProfile(devProfile);
    setSession({ user: devProfile, access_token: 'local_dev_token' });
    triggerChromaticExplosion();

    return {
      user: devProfile,
      session: { user: devProfile, access_token: 'local_dev_token' },
    };
  }

  /**
   * Password reset.
   */
  async function resetPassword(email) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return data;
    }

    return {
      success: true,
      message: 'Password reset email simulated',
    };
  }

  /**
   * Sign out.
   */
  async function signOut() {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    localStorage.removeItem('meethub_local_user');
    setUser(null);
    setProfile(null);
    setSession(null);
    setVerificationPending(false);
    setVerificationEmail('');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        role: profile?.role || (user ? 'UNKNOWN' : 'STUDENT'),
        isStudent: profile?.role === 'STUDENT' || (!user && !isSupabaseConfigured),
        isOrganizer: profile?.role === 'ORGANIZER',
        isAdmin: profile?.role === 'ADMIN',
        verificationPending,
        verificationEmail,
        setVerificationPending,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
