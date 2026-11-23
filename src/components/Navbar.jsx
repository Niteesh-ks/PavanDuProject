import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Radar,
  Camera,
  Ticket,
  LayoutDashboard,
  Shield,
  Bell,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';

export function Navbar() {
  const location = useLocation();
  const { user, profile, role, isOrganizer, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme, triggerChromaticExplosion } = useTheme();
  const { notifications, unreadCount, notificationError, markAsRead } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) setShowUserMenu(false);
      return next;
    });
  };

  const toggleUserMenu = () => {
    setShowUserMenu((prev) => {
      const next = !prev;
      if (next) setShowNotifications(false);
      return next;
    });
  };

  const navLinks = [
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/radar', label: 'Campus Radar', icon: Radar },
    { to: '/moments', label: 'Moments', icon: Camera },
  ];

  // Role-appropriate dashboard destination
  const dashboardLink = isAdmin
    ? { to: '/admin', label: 'Admin Desk', icon: Shield }
    : isOrganizer
    ? { to: '/organizer', label: 'Organizer Hub', icon: LayoutDashboard }
    : { to: '/dashboard', label: 'My Experiences', icon: Ticket };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 500,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1.5px solid var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '0.95rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo & Wordmark */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo size="default" />
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '2rem',
          }}
          className="desktop-nav"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? 'var(--color-forest-green)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--color-forest-green)' : '2px solid transparent',
                  paddingBottom: '3px',
                  transition: 'color var(--transition-fast)',
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user && (
            <Link
              to={dashboardLink.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.9rem',
                fontWeight: location.pathname.startsWith(dashboardLink.to) ? 700 : 600,
                color: location.pathname.startsWith(dashboardLink.to) ? 'var(--color-forest-green)' : 'var(--text-muted)',
                borderBottom: location.pathname.startsWith(dashboardLink.to) ? '2px solid var(--color-forest-green)' : '2px solid transparent',
                paddingBottom: '3px',
              }}
            >
              <dashboardLink.icon size={16} />
              <span>{dashboardLink.label}</span>
            </Link>
          )}
        </nav>

        {/* Controls Bar: Theme Switcher, Signature Replay, Notifications, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Replay Signature Login Explosion */}
          <button
            onClick={triggerChromaticExplosion}
            title="Replay Signature UNFOLD Liquid Reveal"
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-forest-green)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-acid-yellow)' }} />
          </button>

          {/* Theme Switcher: Warm Ivory Light / Ink Black Dark */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Notifications Drawer Toggle */}
          {user && (
            <div ref={notificationsRef} style={{ position: 'relative' }}>
              <button
                onClick={toggleNotifications}
                style={{
                  position: 'relative',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--color-amber)',
                      color: '#151B17',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '320px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '1.25rem',
                    zIndex: 600,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Activity Feed</span>
                    <span className="metadata-text">{unreadCount} new</span>
                  </div>
                  {notificationError && <p role="alert" style={{ color: '#B91C1C', fontSize: '0.78rem', marginBottom: '0.65rem' }}>{notificationError}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 && !notificationError && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>You have no notifications.</p>
                    )}
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.read) markAsRead(n.id); }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: n.read ? 'transparent' : 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account / Role Menu */}
          {user ? (
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={toggleUserMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--border-strong)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: role === 'ADMIN' ? 'var(--color-forest-green)' : role === 'ORGANIZER' ? 'var(--color-amber)' : 'var(--color-acid-yellow)',
                    color: '#151B17',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || user.email.split('@')[0]}
                </span>
                <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}>{role}</span>
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '240px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '1rem',
                    zIndex: 600,
                  }}
                >
                  <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{profile?.full_name || 'UNFOLD Student'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>

                  <button
                    onClick={() => {
                      signOut();
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      color: '#DC2626',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="mobile-toggle"
            style={{
              padding: '0.45rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.75rem 1.75rem',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: location.pathname.startsWith(item.to) ? 'var(--color-forest-green)' : 'var(--text-primary)',
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
          {user && (
            <Link
              to={dashboardLink.to}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              <dashboardLink.icon size={18} />
              <span>{dashboardLink.label}</span>
            </Link>
          )}
        </div>
      )}

      {/* Responsive Breakpoint styling */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
