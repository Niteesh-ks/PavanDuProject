import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bookmark,
  Share2,
  ArrowLeft,
  CheckCircle2,
  Ticket,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { PaymentModal } from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { toUiEvent } from '../lib/events';
import { getBookmarkErrorMessage } from '../lib/bookmarkErrors';
import { formatIndiaDate, formatIndiaTime } from '../lib/dateTime';

export function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [eventError, setEventError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkError, setBookmarkError] = useState('');
  const [copied, setCopied] = useState(false);
  const [registeredTicket, setRegisteredTicket] = useState(null);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setEventError('Event details require a configured Supabase connection.');
      return () => { active = false; };
    }
    fetch('/api/events/public')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
        return (body.events || []).find((row) => row.id === id);
      })
      .then((row) => {
        if (!active) return;
        if (!row) {
          setEventError('This event is not available in the published event feed.');
          return;
        }
        setEvent(toUiEvent(row));
        setEventError('');
      })
      .catch((error) => { if (active) setEventError(`Unable to load event: ${error.message}`); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!user?.id || !id || !isSupabaseConfigured) {
      setIsBookmarked(false);
      setRegisteredTicket(null);
      return () => { active = false; };
    }
    Promise.all([
      supabase.from('event_bookmarks').select('event_id').eq('user_id', user.id).eq('event_id', id).maybeSingle(),
      supabase.from('event_tickets').select('ticket_code').eq('user_id', user.id).eq('event_id', id).maybeSingle(),
    ]).then(([bookmarkResult, ticketResult]) => {
      if (!active) return;
      if (bookmarkResult.error) throw bookmarkResult.error;
      if (ticketResult.error) throw ticketResult.error;
      setIsBookmarked(Boolean(bookmarkResult.data));
      if (ticketResult.data) setRegisteredTicket({ ticketCode: ticketResult.data.ticket_code });
    }).catch((error) => {
      if (active) setBookmarkError(getBookmarkErrorMessage(error, 'load'));
    });
    return () => { active = false; };
  }, [user?.id, id]);

  const percentFull = event
    ? Math.min(100, Math.round(((event.registrationsCount || 0) / (event.maxCapacity || 100)) * 100))
    : 0;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleBookmarkToggle() {
    if (!user?.id || !isSupabaseConfigured) {
      setBookmarkError('Sign in to save this event.');
      return;
    }
    const { error } = isBookmarked
      ? await supabase.from('event_bookmarks').delete().eq('event_id', id).eq('user_id', user.id)
      : await supabase.from('event_bookmarks').insert({ event_id: id });
    if (error && !(error.code === '23505' && !isBookmarked)) {
      setBookmarkError(getBookmarkErrorMessage(error, 'update'));
      return;
    }
    setIsBookmarked(!isBookmarked);
    setBookmarkError('');
  }

  if (!event) {
    return (
      <div className="main-content" style={{ maxWidth: '1020px' }}>
        <div className="card" role={eventError ? 'alert' : 'status'} style={{ padding: '2rem' }}>
          {eventError || 'Loading published event...'}
        </div>
        <Link to="/discover" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>Back to Discover</Link>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '1020px' }}>
      {/* Return Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/discover" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={15} />
          <span>Back to All Experiences</span>
        </Link>
      </div>

      {/* Cover Artwork Banner */}
      <div
        style={{
          width: '100%',
          height: '360px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '2.5rem',
          border: '1.5px solid var(--border-subtle)',
        }}
      >
        <img
          src={event.coverImage}
          alt={event.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(21,27,23,0.92) 0%, rgba(21,27,23,0.3) 50%, rgba(21,27,23,0.5) 100%)' }} />

        {/* Top Badges */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span
            style={{
              backgroundColor: 'var(--color-ink-black)',
              color: 'var(--color-warm-ivory)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(244,240,230,0.2)',
            }}
          >
            {event.categoryName} • {event.subcategory}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleShare}
              title="Share Link"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(21,27,23,0.85)',
                color: copied ? 'var(--color-acid-yellow)' : '#FFF',
                border: '1px solid rgba(244,240,230,0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleBookmarkToggle}
              title="Bookmark Event"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(21,27,23,0.85)',
                color: isBookmarked ? 'var(--color-acid-yellow)' : '#FFF',
                border: '1px solid rgba(244,240,230,0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bookmark size={16} fill={isBookmarked ? 'var(--color-acid-yellow)' : 'none'} />
            </button>
          </div>
        </div>

        {/* Banner Title */}
        <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-acid-yellow)', fontWeight: 800 }}>
            {event.collegeName} ({event.collegeCode})
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.8vw, 2.5rem)', fontWeight: 800, color: '#FFF', margin: '0.35rem 0 0', lineHeight: 1.15 }}>
            {event.title}
          </h1>
        </div>
      </div>

      {bookmarkError && <div role="alert" className="card" style={{ marginBottom: '1rem', color: '#B91C1C' }}>{bookmarkError}</div>}

      {/* 2-Column Detail Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }} className="detail-grid">
        {/* Left Column */}
        <div>
          <div className="card" style={{ marginBottom: '1.75rem', padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
              Experience Narrative & Format
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
              {event.description}
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
              Campus Venue & Coordinates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Building size={20} style={{ color: 'var(--color-forest-green)', marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '1rem' }}>{event.venue}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{event.address}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <MapPin size={16} />
                <span>GPS: {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Pass Desk */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '90px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="metadata-text">Entry Pass</span>
              {event.isPaid ? (
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>₹{event.feeInr}</span>
              ) : (
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>FREE PASS</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-forest-green)' }} />
                <span><strong>Date:</strong> {formatIndiaDate(event.startDate)} to {formatIndiaDate(event.endDate)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={16} style={{ color: 'var(--color-forest-green)' }} />
                <span><strong>Schedule:</strong> {formatIndiaTime(event.startTime)} - {formatIndiaTime(event.endTime)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={16} style={{ color: 'var(--color-forest-green)' }} />
                <span><strong>Delegates:</strong> {event.registrationsCount} / {event.maxCapacity} Seats</span>
              </div>
            </div>

            {/* Capacity Fill */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                <span>Roster Capacity</span>
                <span>{percentFull}% Reserved</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${percentFull}%`, height: '100%', backgroundColor: percentFull > 85 ? 'var(--color-amber)' : 'var(--color-forest-green)' }} />
              </div>
            </div>

            {/* Registration Action */}
            {registeredTicket ? (
              <div style={{ textAlign: 'center', padding: '1.25rem', background: 'rgba(41,76,56,0.15)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-forest-green)' }}>
                <CheckCircle2 size={26} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.4rem' }} />
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-forest-green)' }}>Pass Issued & Confirmed</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Pass Code: {registeredTicket.ticketCode}</div>
                <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ marginTop: '0.85rem', width: '100%' }}>
                  View QR Pass in My Experiences
                </Link>
              </div>
            ) : (
              user ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  <Ticket size={18} />
                  <span>{event.isPaid ? `Reserve Pass • ₹${event.feeInr}` : 'Claim Complimentary Pass'}</span>
                </button>
              ) : (
                <Link to="/auth" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Sign in to register
                </Link>
              )
            )}

            <div style={{ marginTop: '1.15rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--color-forest-green)' }} />
              Digital QR ticket issued upon confirmed reservation.
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          event={event}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={(ticket) => {
            setRegisteredTicket(ticket);
            setShowPaymentModal(false);
          }}
        />
      )}

      <style>{`
        @media (max-width: 850px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
