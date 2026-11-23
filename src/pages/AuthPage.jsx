import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, School, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { SEED_CATEGORIES, isSupabaseConfigured, supabase } from '../lib/supabase';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/discover';

  const { signIn, signUp, resetPassword, verificationPending, verificationEmail, setVerificationPending } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [selectedPortal, setSelectedPortal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [collegeLoadError, setCollegeLoadError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState(['Hackathons & AI']);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return () => { active = false; };

    supabase.from('colleges').select('id,name,code,website').order('name').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setCollegeLoadError(`Unable to load the college directory: ${error.message}`);
        return;
      }
      const options = data || [];
      setCollegeOptions(options);
      setSelectedCollegeId((current) => current || '');
      setCollegeLoadError('');
    });

    return () => { active = false; };
  }, []);

  const handleInterestToggle = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        if (!email || !password) throw new Error('Please fill in both email and password.');
        const result = await signIn({ email, password, expectedRole: selectedPortal });
        const resolvedRole =
          result?.profile?.role ||
          result?.user?.user_metadata?.role ||
          selectedPortal ||
          'STUDENT';
        const portalDestination = {
          STUDENT: '/dashboard',
          ORGANIZER: '/organizer',
          ADMIN: '/admin',
        }[resolvedRole] || '/dashboard';
        const matchingRequestedRoute = from === portalDestination || from.startsWith(`${portalDestination}/`);
        navigate(matchingRequestedRoute ? from : portalDestination, { replace: true });
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!email.trim()) throw new Error('Valid email address is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (!confirmPassword) throw new Error('Please confirm your password.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        // Student and Organizer registrations must use a canonical college record.
        const requiresCollege = ['STUDENT', 'ORGANIZER'].includes(selectedPortal);
        const selectedCollege = collegeOptions.find((college) => college.id === selectedCollegeId);
        if (requiresCollege && !selectedCollege) {
          throw new Error(collegeLoadError || 'Select a college from the current college directory.');
        }

        const res = await signUp({
          email,
          password,
          fullName,
          collegeId: selectedCollege?.id || null,
          collegeName: selectedCollege?.name || null,
          interests: selectedPortal === 'STUDENT' ? selectedInterests : [],
          requestedRole: selectedPortal,
        });

        if (res.verificationPending) {
          // Supabase email verification is required before the request can continue.
        } else if (res.authorizationPending) {
          setSuccessNotice(
            `${selectedPortal === 'ORGANIZER' ? 'Organizer' : 'Admin'} account request received. Your portal access is not active until an authorized administrator approves it.`
          );
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          navigate(from, { replace: true });
        }
      } else if (mode === 'forgot') {
        if (!email) throw new Error('Please enter your email to receive recovery instructions.');
        await resetPassword(email);
        setSuccessNotice(`Password recovery instructions sent to ${email}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  }

  // Verification Pending View
  if (verificationPending) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--color-sage-soft)', color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Mail size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Verify Your Email
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            We dispatched an official confirmation link to <strong>{verificationEmail}</strong>. Confirm the message in your collegiate inbox to activate your passes.
          </p>
          <button
            onClick={() => {
              setVerificationPending(false);
              setMode('signin');
            }}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!selectedPortal) {
    const portals = [
      { role: 'STUDENT', title: 'Student', description: 'Discover events, save experiences, and manage your tickets.', icon: User },
      { role: 'ORGANIZER', title: 'Organizer', description: 'Submit events and manage your approved campus listings.', icon: School },
      { role: 'ADMIN', title: 'Admin', description: 'Review event submissions and administer the platform.', icon: Lock },
    ];

    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '2.5rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Logo size="default" /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800 }}>Choose your portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Your selection opens the matching sign-in. Access is determined by your verified account permissions.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {portals.map(({ role: portalRole, title, description, icon: Icon }) => (
              <button
                key={portalRole}
                type="button"
                onClick={() => setSelectedPortal(portalRole)}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', textAlign: 'left', cursor: 'pointer' }}
              >
                <Icon size={20} />
                <span>
                  <strong style={{ display: 'block' }}>{title}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{description}</span>
                </span>
                <ArrowRight size={17} style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Organizer and Admin privileges are assigned only through the trusted administrative process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo size="default" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800 }}>
            {mode === 'signin' && 'Welcome to UNFOLD'}
            {mode === 'signup' && `Create Your ${selectedPortal === 'STUDENT' ? 'Student' : selectedPortal === 'ORGANIZER' ? 'Organizer' : 'Admin'} Account`}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {mode === 'signin' && `Sign in to continue to the ${selectedPortal.toLowerCase()} portal.`}
            {mode === 'signup' && (selectedPortal === 'STUDENT' ? 'Join students discovering experiences beyond their campus.' : `Create your ${selectedPortal.toLowerCase()} portal account.`)}
            {mode === 'forgot' && 'Enter your university email for recovery.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setSelectedPortal(''); setMode('signin'); setErrorMessage(''); }}
          style={{ marginBottom: '1rem', color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.8rem' }}
        >
          Change portal
        </button>

        {/* Alerts */}
        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(220,38,38,0.1)', color: '#DC2626', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successNotice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(41,76,56,0.15)', color: 'var(--color-forest-green)', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Maya Rao"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">College Email Address</label>
            <input
              type="email"
              placeholder="e.g. maya@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', border: 'none', background: 'none' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
          )}

          {mode === 'signup' && ['STUDENT', 'ORGANIZER'].includes(selectedPortal) && (
            <>
              <div className="form-group">
                <label className="form-label">Home College Campus</label>
                <select
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select your college</option>
                  {collegeOptions.map((college) => (
                    <option key={college.id} value={college.id}>
                      {college.name} ({college.code})
                    </option>
                  ))}
                </select>
                {selectedCollegeId && collegeOptions.find((college) => college.id === selectedCollegeId)?.website && (
                  <p className="metadata-text">College website: {collegeOptions.find((college) => college.id === selectedCollegeId).website}</p>
                )}
                {collegeLoadError && <p role="alert" style={{ color: '#B91C1C', fontSize: '0.78rem' }}>{collegeLoadError}</p>}
              </div>

              {selectedPortal === 'STUDENT' && <div className="form-group">
                <label className="form-label">Interests (For Rule-Based Matching)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.35rem' }}>
                  {SEED_CATEGORIES.map((cat) => {
                    const isSelected = selectedInterests.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleInterestToggle(cat.name)}
                        className={`badge ${isSelected ? 'badge paid' : ''}`}
                        style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>}
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.85rem' }}
            disabled={loading}
          >
            <span>
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In & Unfold Dashboard'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Password Reset Link'}
            </span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer switchers */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {mode === 'signin' && (
            <p>
              New to UNFOLD?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setSuccessNotice('');
                  setConfirmPassword('');
                  setMode('signup');
                }}
                style={{ color: 'var(--text-primary)', fontWeight: 800, textDecoration: 'underline' }}
              >
                Create Account
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setSuccessNotice('');
                  setMode('signin');
                }}
                style={{ color: 'var(--text-primary)', fontWeight: 800, textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remember password?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{ color: 'var(--text-primary)', fontWeight: 800, textDecoration: 'underline' }}
              >
                Back to Sign In
              </button>
            </p>
          )}
          {mode === 'signin' && selectedPortal !== 'STUDENT' && (
            <p>Need access? Contact an authorized UNFOLD administrator.</p>
          )}
        </div>
      </div>
    </div>
  );
}