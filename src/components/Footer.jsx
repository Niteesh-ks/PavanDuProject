import React from 'react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1.5px solid var(--border-subtle)',
        padding: '4rem 1.75rem 2.5rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem',
        }}
      >
        <div>
          <Logo size="small" />
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginTop: '1rem',
              lineHeight: 1.6,
              maxWidth: '300px',
            }}
          >
            Every campus has something happening. UNFOLD connects students with experiences, hackathons, and culture beyond their university.
          </p>
        </div>

        <div>
          <h4 className="metadata-text" style={{ marginBottom: '1.15rem' }}>Exploration</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <li><a href="/discover">Event Discovery</a></li>
            <li><a href="/radar">Campus Radar (GPS Map)</a></li>
            <li><a href="/moments">Community Moments</a></li>
            <li><a href="/dashboard">My Experiences & Digital Passes</a></li>
          </ul>
        </div>

        <div>
          <h4 className="metadata-text" style={{ marginBottom: '1.15rem' }}>Organizers & Faculty</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <li><a href="/organizer">Submit Collegiate Fest</a></li>
            <li><a href="/organizer">On-Site QR Camera Scanner</a></li>
            <li><a href="/organizer">Broadcast Email Announcements</a></li>
            <li><a href="/admin">Event Raider Verification Engine</a></li>
          </ul>
        </div>

        <div>
          <h4 className="metadata-text" style={{ marginBottom: '1.15rem' }}>Campus Nodes Status</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-acid-yellow)', border: '1px solid var(--color-ink-black)', display: 'inline-block' }}></span>
            <span>All Bengaluru University Nodes Active</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            IISc • RVCE • PESU • BMSCE • MSRIT • Christ • IIIT-B • St. Joseph's
          </p>
        </div>
      </div>

      <div
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>© {new Date().getFullYear()} UNFOLD. Discover beyond your campus.</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>Editorial Code</span>
          <span>Security & RLS Architecture</span>
          <span>Campus Integrity</span>
        </div>
      </div>
    </footer>
  );
}
