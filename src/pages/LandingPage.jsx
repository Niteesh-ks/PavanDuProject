import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Compass,
  Radar,
  ArrowRight,
  Sparkles,
  Ticket,
  School,
  Camera,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { EventCard } from '../components/EventCard';
import { SEED_CATEGORIES, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toUiEvent } from '../lib/events';
import { getBookmarkErrorMessage } from '../lib/bookmarkErrors';

export function LandingPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [bookmarkError, setBookmarkError] = useState('');
  const [collegeError, setCollegeError] = useState('');
  const featuredEvents = events.filter((event) => event.isFeatured).slice(0, 3);
  const trendingEvents = [...events]
    .sort((a, b) => (b.registrationsCount || 0) - (a.registrationsCount || 0))
    .slice(0, 3);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return () => { active = false; };
    fetch('/api/events/public')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
        return body.events || [];
      })
      .then((rows) => { if (active) setEvents(rows.map(toUiEvent)); })
      .catch((error) => { if (active) setBookmarkError(`Unable to load public events: ${error.message}`); });
    supabase.from('colleges').select('id,name,code').order('name')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setCollegeError(`Unable to load colleges: ${error.message}`);
          return;
        }
        setColleges(data || []);
        setCollegeError('');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.id || !isSupabaseConfigured) {
      setBookmarkedIds([]);
      setBookmarkError('');
      return () => { active = false; };
    }
    setBookmarkedIds([]);
    setBookmarkError('');
    supabase.from('event_bookmarks').select('event_id').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setBookmarkError(getBookmarkErrorMessage(error, 'load'));
          return;
        }
        setBookmarkedIds((data || []).map((bookmark) => bookmark.event_id));
      });
    return () => { active = false; };
  }, [user?.id]);

  async function handleBookmarkToggle(eventId, isSaved) {
    if (!user?.id || !isSupabaseConfigured) {
      setBookmarkError('Sign in with a configured Supabase account to save events.');
      throw new Error('Authentication required to save events.');
    }
    const { error } = isSaved
      ? await supabase.from('event_bookmarks').insert({ event_id: eventId })
      : await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('user_id', user.id);
    if (error && !(isSaved && error.code === '23505')) {
      setBookmarkError(getBookmarkErrorMessage(error, 'update'));
      throw error;
    }
    setBookmarkedIds((current) => isSaved
      ? [...new Set([...current, eventId])]
      : current.filter((id) => id !== eventId));
    setBookmarkError('');
  }

  return (
    <div style={{ width: '100%' }}>
      {bookmarkError && (
        <div role="alert" style={{ maxWidth: 'var(--max-width)', margin: '1rem auto', padding: '0.75rem 1rem', color: '#B91C1C' }}>
          {bookmarkError}
        </div>
      )}
      {/* Editorial Hero Section */}
      <section
        style={{
          borderBottom: '1.5px solid var(--border-subtle)',
          padding: '6rem 1.75rem 5rem',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        {/* Abstract Geometric Background Accents (Isometric unfolding planes) */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '380px',
            height: '380px',
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            transform: 'rotate(18deg)',
            pointerEvents: 'none',
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '320px',
            height: '320px',
            backgroundColor: 'rgba(226, 255, 84, 0.08)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--color-forest-green)',
                color: 'var(--color-warm-ivory)',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <School size={14} style={{ color: 'var(--color-acid-yellow)' }} />
              <span>Cross-University Event Platform • Bengaluru Edition</span>
            </span>
          </motion.div>

          {/* Large Editorial Headline */}
          <motion.h1
            className="display-hero"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{ maxWidth: '1000px', margin: '0 auto 1.5rem' }}
          >
            Your next experience is waiting.
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)',
              color: 'var(--text-muted)',
              maxWidth: '740px',
              margin: '0 auto 2.75rem',
              lineHeight: 1.6,
            }}
          >
            Discover events, connect with new communities and explore opportunities beyond your campus.
          </motion.p>

          {/* Primary & Secondary Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ display: 'flex', gap: '1.15rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/discover" className="btn btn-primary btn-lg">
              <span>Discover Events</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/radar" className="btn btn-secondary btn-lg">
              <Radar size={18} />
              <span>Campus Radar</span>
            </Link>
          </motion.div>

          {/* 3 Value Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginTop: '4.5rem',
              textAlign: 'left',
            }}
          >
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-forest-green)', color: 'var(--color-acid-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Compass size={22} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                Cross-Campus Centralization
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Every campus has something happening. UNFOLD breaks institutional silos, bringing hackathons, paper presentations, and cultural fests under one roof.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-forest-green)', color: 'var(--color-acid-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Radar size={22} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                Campus Radar Proximity
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Live geolocation calculations uncovering premier inter-collegiate competitions within 10 km of your classroom.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-forest-green)', color: 'var(--color-acid-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Ticket size={22} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                Seamless Digital Gate Pass
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Instant test registrations, Razorpay test payment verification, and encrypted QR tickets with rapid camera check-in for organizers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Experiences Section */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '5rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="metadata-text">Selected Premier Curations</span>
            <h2 className="section-title" style={{ marginTop: '0.35rem' }}>Featured Campus Experiences</h2>
          </div>
          <Link to="/discover" className="btn btn-secondary btn-sm">
            <span>Browse All Curations</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {featuredEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} isBookmarked={bookmarkedIds.includes(evt.id)} onBookmarkToggle={handleBookmarkToggle} />
          ))}
        </div>
      </section>

      {/* Trending Experiences */}
      <section style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1.5px solid var(--border-subtle)', borderBottom: '1.5px solid var(--border-subtle)', padding: '5rem 1.75rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="metadata-text">Audience Demand</span>
              <h2 className="section-title" style={{ marginTop: '0.35rem' }}>Trending Across Campuses</h2>
            </div>
            <Link to="/discover" className="btn btn-secondary btn-sm">
              <span>View Trending List</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {trendingEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} isBookmarked={bookmarkedIds.includes(evt.id)} onBookmarkToggle={handleBookmarkToggle} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Event Categories */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '5rem 1.75rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="metadata-text">Exploration Spectrum</span>
          <h2 className="section-title" style={{ marginTop: '0.35rem' }}>Popular Event Disciplines</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {SEED_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/discover?category=${encodeURIComponent(cat.name)}`}
              className="card card-clickable"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-warm-ivory)', color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={22} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800 }}>{cat.name}</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How UNFOLD Works Section */}
      <section style={{ backgroundColor: 'var(--color-forest-green)', color: 'var(--color-warm-ivory)', padding: '5.5rem 1.75rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-acid-yellow)', fontWeight: 800 }}>
              The Journey
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, marginTop: '0.5rem' }}>
              How UNFOLD Works
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            <div style={{ background: 'var(--color-forest-dark)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244,240,230,0.15)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-acid-yellow)', marginBottom: '0.5rem' }}>
                01
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Discover & Filter</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-sage)', lineHeight: 1.6 }}>
                Browse verified campus fests or use Campus Radar GPS to discover hackathons happening nearby.
              </p>
            </div>

            <div style={{ background: 'var(--color-forest-dark)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244,240,230,0.15)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-acid-yellow)', marginBottom: '0.5rem' }}>
                02
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Register & Secure Pass</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-sage)', lineHeight: 1.6 }}>
                One-click registration for free campus entries, or secure delegate checkout powered by Razorpay test gateway.
              </p>
            </div>

            <div style={{ background: 'var(--color-forest-dark)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244,240,230,0.15)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-acid-yellow)', marginBottom: '0.5rem' }}>
                03
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Scan at the Gate</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-sage)', lineHeight: 1.6 }}>
                Present your digital QR pass at the entrance. Organizers verify your ticket atomically using the camera scanner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Host with UNFOLD Organizer Invitation */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '5rem 1.75rem' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            padding: '3.5rem 2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div style={{ maxWidth: '600px' }}>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>Faculty & Student Clubs</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0.85rem' }}>
              Hosting an inter-college fest?
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Publish your college symposium or festival to thousands of students across Bengaluru. Manage delegate rosters, broadcast email announcements, and scan QR passes at your gates.
            </p>
          </div>

          <Link to="/organizer" className="btn btn-primary btn-lg">
            <span>Enter Organizer Desk</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Connected Collegiate Nodes Network */}
      <section style={{ borderTop: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', padding: '4rem 1.75rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', textAlign: 'center' }}>
          <span className="metadata-text">Bengaluru Collegiate Nodes</span>
          <h2 className="section-title" style={{ margin: '0.35rem 0 2rem' }}>Connected University Campuses</h2>

          {collegeError && <p role="alert" style={{ color: '#B91C1C', marginBottom: '1rem' }}>{collegeError}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.85rem', maxWidth: '900px', margin: '0 auto' }}>
            {colleges.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-acid-yellow)', border: '1px solid var(--color-ink-black)' }}></span>
                <span>{c.name}</span>
                <span className="metadata-text" style={{ fontSize: '0.7rem' }}>({c.code})</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
