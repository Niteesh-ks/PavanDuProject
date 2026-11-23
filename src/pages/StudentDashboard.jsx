import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  CreditCard,
  Bookmark,
  Sparkles,
  User,
  School,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DigitalTicket } from '../components/DigitalTicket';
import { EventCard } from '../components/EventCard';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateEventRecommendations } from '../utils/recommendations';
import { toUiEvent } from '../lib/events';
import { getBookmarkErrorMessage } from '../lib/bookmarkErrors';

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'payments' | 'bookmarks' | 'recommendations'
  const [tickets, setTickets] = useState([]);
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboardError, setDashboardError] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !user?.id) {
      setTickets([]);
      setBookmarkedEvents([]);
      setPayments([]);
      setEvents([]);
      setDashboardError('Sign in with a configured Supabase account to view persisted experiences.');
      return () => { active = false; };
    }
    setBookmarkedEvents([]);
    setDashboardError('');

    Promise.all([
      supabase
        .from('event_tickets')
        .select('*,events(title,start_date,colleges(name)),event_registrations(payment_status)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('event_bookmarks')
        .select('event_id,events!event_bookmarks_event_id_fkey(*,colleges(name,code),categories!events_category_id_fkey(name))')
        .eq('user_id', user.id),
      supabase
        .from('payments')
        .select('*,events(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('*,colleges(name,code),categories!events_category_id_fkey(name)')
        .in('status', ['approved', 'published']),
    ]).then(([ticketResult, bookmarkResult, paymentResult, eventResult]) => {
      if (!active) return;
      if (bookmarkResult.error) {
        setDashboardError(getBookmarkErrorMessage(bookmarkResult.error, 'load'));
        return;
      }
      const failed = [ticketResult, bookmarkResult, paymentResult, eventResult].find((result) => result.error);
      if (failed) throw failed.error;
      setTickets((ticketResult.data || []).map((ticket) => {
        const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
        const registration = Array.isArray(ticket.event_registrations)
          ? ticket.event_registrations[0]
          : ticket.event_registrations;
        const college = Array.isArray(event?.colleges) ? event.colleges[0] : event?.colleges;
        return {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          secureToken: ticket.secure_token,
          eventId: ticket.event_id,
          eventTitle: event?.title,
          collegeName: college?.name,
          eventDate: event?.start_date,
          userName: profile?.full_name || user.email,
          userEmail: user.email,
          paymentStatus: registration?.payment_status || 'paid',
          isUsed: ticket.is_used,
          qrPayload: ticket.qr_payload,
        };
      }));
      setBookmarkedEvents((bookmarkResult.data || [])
        .map((bookmark) => Array.isArray(bookmark.events) ? bookmark.events[0] : bookmark.events)
        .filter(Boolean)
        .map(toUiEvent));
      setPayments((paymentResult.data || []).map((payment) => ({
        id: payment.id,
        orderId: payment.order_id,
        paymentId: payment.payment_id,
        eventTitle: payment.events?.title || 'Campus Event',
        amountInr: Number(payment.amount_inr),
        status: payment.status,
        date: payment.created_at,
      })));
      setEvents((eventResult.data || []).map(toUiEvent));
      setDashboardError('');
    }).catch((error) => {
      if (active) setDashboardError(`Unable to load your experiences: ${error.message}`);
    });

    return () => { active = false; };
  }, [user?.id, user?.email, profile?.full_name]);

  async function handleSavedEventToggle(eventId, isSaved) {
    if (!user?.id) return;
    const { error } = isSaved
      ? await supabase.from('event_bookmarks').insert({ event_id: eventId })
      : await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('user_id', user.id);
    if (error && !(isSaved && error.code === '23505')) {
      setDashboardError(getBookmarkErrorMessage(error, 'update'));
      throw error;
    }
    if (isSaved) {
      const event = events.find((item) => item.id === eventId);
      if (event) setBookmarkedEvents((current) => [...current.filter((item) => item.id !== eventId), event]);
    } else {
      setBookmarkedEvents((current) => current.filter((event) => event.id !== eventId));
    }
  }

  const recommendations = calculateEventRecommendations({
    events,
    userInterests: profile?.interests || ['Hackathons & AI', 'Robotics & Hardware'],
    userCollegeId: null,
    bookmarkedCategoryIds: [],
  });

  return (
    <div className="main-content">
      {/* Student Profile Card Header */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '2rem', borderLeft: '5px solid var(--color-forest-green)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-forest-green)',
                color: 'var(--color-acid-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
              }}
            >
              {(profile?.full_name || user?.email || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
                  {profile?.full_name || user?.email}
                </h2>
                <span className="badge paid" style={{ fontSize: '0.72rem', fontWeight: 800 }}>STUDENT PASS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <School size={14} style={{ color: 'var(--color-forest-green)' }} />
                  <span>{profile?.college_name || 'College not provided'}</span>
                </span>
                <span>•</span>
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Interests Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxWidth: '320px' }}>
            {(profile?.interests || ['Hackathons & AI', 'Cultural Fests']).map((interest) => (
              <span key={interest} className="badge" style={{ fontSize: '0.72rem' }}>{interest}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {dashboardError && (
        <div role="alert" className="card" style={{ marginBottom: '1.5rem', color: '#B91C1C' }}>
          {dashboardError}
        </div>
      )}
      <div className="filter-tabs" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`filter-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
        >
          <Ticket size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Digital Passes ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`filter-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
        >
          <Sparkles size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Smart Recommendations ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`filter-tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
        >
          <Bookmark size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Saved Experiences ({bookmarkedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`filter-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
        >
          <CreditCard size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Receipts & Gateway Log ({payments.length})
        </button>
      </div>

      {/* Tab: Digital QR Passes */}
      {activeTab === 'tickets' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.35rem' }}>Active Gate Passes</h3>
            <p className="section-subtitle">
              Show this pass at venue gates for atomic camera QR check-in by event organizers.
            </p>
          </div>
          {tickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>No persisted event passes are associated with this account.</div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem' }}>
            {tickets.map((t) => (
              <DigitalTicket key={t.id} ticket={t} />
            ))}
          </div>
          )}
        </div>
      )}

      {/* Tab: Recommendations */}
      {activeTab === 'recommendations' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.35rem' }}>Recommended for You</h3>
            <p className="section-subtitle">
              Rule-based scoring matching your selected campus interests, home university, and verified registration momentum.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {recommendations.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isBookmarked={bookmarkedEvents.some((saved) => saved.id === event.id)}
                onBookmarkToggle={handleSavedEventToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.35rem' }}>Saved Campus Experiences</h3>
            <p className="section-subtitle">Events you have bookmarked for future participation.</p>
          </div>

          {bookmarkedEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <Bookmark size={28} style={{ margin: '0 auto 0.75rem', color: 'var(--color-forest-green)' }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>No saved experiences yet</p>
              <p style={{ marginTop: '0.35rem' }}>Tap the bookmark on any event to keep it here for later.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
              {bookmarkedEvents.map((event) => (
                <EventCard key={event.id} event={event} isBookmarked={true} onBookmarkToggle={handleSavedEventToggle} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.35rem' }}>Razorpay Payment Receipts</h3>
            <p className="section-subtitle">Cryptographically verified test mode transactions.</p>
          </div>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.95rem 1.15rem' }}>Order / Payment ID</th>
                  <th style={{ padding: '0.95rem 1.15rem' }}>Event Title</th>
                  <th style={{ padding: '0.95rem 1.15rem' }}>Amount</th>
                  <th style={{ padding: '0.95rem 1.15rem' }}>Status</th>
                  <th style={{ padding: '0.95rem 1.15rem' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.95rem 1.15rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      <div style={{ fontWeight: 700 }}>{p.orderId}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{p.paymentId}</div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', fontWeight: 700 }}>{p.eventTitle}</td>
                    <td style={{ padding: '0.95rem 1.15rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>₹{p.amountInr}</td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <span className="badge status-approved">VERIFIED & CAPTURED</span>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(p.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && (
            <p className="metadata-text" style={{ textAlign: 'center', padding: '1rem' }}>No persisted payment records are associated with this account.</p>
          )}
        </div>
      )}
    </div>
  );
}
