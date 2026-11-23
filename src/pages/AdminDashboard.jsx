import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Radar,
  RefreshCw,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Sliders,
  Database,
  Search,
  UserRoundCheck,
  UserRoundX,
  Clock3,
} from 'lucide-react';
import { authenticatedApiRequest } from '../lib/api';
import { toUiEvent } from '../lib/events';
import { formatIndiaTime } from '../lib/dateTime';
import { supabase } from '../lib/supabase';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [eventsList, setEventsList] = useState([]);
  const [scrapedEvents, setScrapedEvents] = useState([]);
  const [crawlerLoading, setCrawlerLoading] = useState(false);
  const [crawlerNotice, setCrawlerNotice] = useState('');
  const [emailLogs, setEmailLogs] = useState([]);
  const [organizerRequests, setOrganizerRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    fetchOrganizerEvents();
    fetchPendingScrapedEvents();
    fetchEmailLogs();
    fetchOrganizerRequests();
  }, []);

  async function fetchOrganizerEvents() {
    try {
      const [pending, approved] = await Promise.all([
        authenticatedApiRequest('/api/admin/events'),
        authenticatedApiRequest('/api/admin/events?status=approved'),
      ]);
      setEventsList([...(pending.events || []), ...(approved.events || [])].map(toUiEvent));
    } catch (err) {
      setCrawlerNotice(`Unable to load organizer review queue: ${err.message}`);
    }
  }

  async function fetchPendingScrapedEvents() {
    try {
      const data = await authenticatedApiRequest('/api/scraper/pending');
      setScrapedEvents(data.events || []);
    } catch (err) {
      setCrawlerNotice(`Unable to load scraped event queue: ${err.message}`);
    }
  }

  async function fetchEmailLogs() {
    try {
      const data = await authenticatedApiRequest('/api/email/logs');
      setEmailLogs(data.logs || []);
    } catch (err) {
      setCrawlerNotice(`Unable to load admin audit logs: ${err.message}`);
    }
  }


  // Load Organizer access requests created by the database signup trigger.
  async function fetchOrganizerRequests() {
    setRequestLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizer_access_requests')
        .select('id,user_id,full_name,email,college_name,status,created_at')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrganizerRequests(data || []);
    } catch (err) {
      setCrawlerNotice(`Unable to load Organizer access requests: ${err.message}`);
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleOrganizerRequestDecision(requestId, decision) {
    const isApproval = decision === 'approve';
    const confirmed = window.confirm(
      isApproval
        ? 'Approve this Organizer request? This grants Organizer portal access.'
        : 'Reject this Organizer request?'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc(
        isApproval ? 'admin_approve_organizer_request' : 'admin_reject_organizer_request',
        { request_id: requestId }
      );
      if (error) throw error;

      setOrganizerRequests((current) => current.filter((request) => request.id !== requestId));
      setCrawlerNotice(
        isApproval
          ? 'Organizer request approved. The account now has Organizer portal access.'
          : 'Organizer request rejected.'
      );
    } catch (err) {
      setCrawlerNotice(`Unable to ${isApproval ? 'approve' : 'reject'} Organizer request: ${err.message}`);
    }
  }

  // Trigger Event Raider Crawl
  async function handleTriggerCrawl() {
    setCrawlerLoading(true);
    setCrawlerNotice('');

    try {
      const data = await authenticatedApiRequest('/api/scraper/scan', { method: 'POST' });
      setCrawlerNotice(`Crawler finished: Ingested ${data.summary.totalDiscovered} events from ${data.summary.totalSources} college sources into review queue.`);
      await fetchPendingScrapedEvents();
    } catch (err) {
      setCrawlerNotice(`Crawler error: ${err.message}`);
    } finally {
      setCrawlerLoading(false);
    }
  }

  // Approve Scraped Event
  async function handleApproveScraped(id) {
    try {
      await authenticatedApiRequest(`/api/scraper/approve/${id}`, { method: 'POST' });
      setScrapedEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setCrawlerNotice(`Unable to approve scraped event: ${err.message}`);
    }
  }

  // Reject Scraped Event
  async function handleRejectScraped(id) {
    try {
      await authenticatedApiRequest(`/api/scraper/reject/${id}`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected by administrator during verification.' }),
      });
      setScrapedEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setCrawlerNotice(`Unable to reject scraped event: ${err.message}`);
    }
  }

  // Approve Organizer Submission
  async function handleReviewEvent(id, status) {
    try {
      const result = await authenticatedApiRequest(`/api/admin/events/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          note: status === 'changes_requested' ? 'Please update the event details and resubmit.' : '',
        }),
      });
      setEventsList((current) => current.map((event) => (
        event.id === id
          ? { ...event, status: result.event.status, rejectionReason: result.event.review_note || '' }
          : event
      )));
    } catch (err) {
      setCrawlerNotice(`Unable to update organizer event: ${err.message}`);
    }
  }

  const pendingOrganizerEvents = eventsList.filter((e) => e.status === 'pending_approval');

  return (
    <div className="main-content">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>
              System Authority & Governance
            </span>
          </div>
          <h1 className="page-title">Administration Desk</h1>
          <p className="section-subtitle">
            Review persistent organizer submissions, audit Event Raider crawlers, and inspect delivery logs.
          </p>
        </div>

        <button
          onClick={handleTriggerCrawl}
          disabled={crawlerLoading}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Radar size={15} />
          <span>{crawlerLoading ? 'Running Crawl Cycle...' : 'Run Event Raider Scan'}</span>
        </button>
      </div>

      {crawlerNotice && (
        <div style={{ padding: '0.95rem 1.25rem', background: 'rgba(41,76,56,0.15)', color: 'var(--color-forest-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{crawlerNotice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Event Raider Queue</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-forest-green)', margin: '0.25rem 0' }}>{scrapedEvents.length}</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pending crawled entries</span>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Organizer Proposals</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-amber)', margin: '0.25rem 0' }}>{pendingOrganizerEvents.length}</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Awaiting verification</span>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Live Campus Events</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-ink-black)', margin: '0.25rem 0' }}>
            {eventsList.filter((e) => e.status === 'approved').length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Visible in Discover feed</span>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Email Transmissions</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-forest-green)', margin: '0.25rem 0' }}>{emailLogs.length}</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Audit delivery records</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`filter-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
        >
          Organizer Submissions ({pendingOrganizerEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('scraper')}
          className={`filter-tab-btn ${activeTab === 'scraper' ? 'active' : ''}`}
        >
          Event Raider Scraped Queue ({scrapedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`filter-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
        >
          Organizer Access Requests ({organizerRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`filter-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
        >
          Email & Notification Audit Logs ({emailLogs.length})
        </button>
      </div>

      {/* Tab: Organizer Approvals */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pendingOrganizerEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <CheckCircle size={36} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Queue Clean</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No pending organizer submissions requiring moderation at this time.
              </p>
            </div>
          ) : (
            pendingOrganizerEvents.map((evt) => (
              <div key={evt.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="metadata-text">{evt.collegeName}</span>
                    <span className="badge status-pending">PENDING VERIFICATION</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0' }}>{evt.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '640px' }}>{evt.description}</p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
                    Organizer: {evt.organizerName || evt.organizerEmail || 'Verified account'} • Date: {evt.startDate} • Venue: {evt.venue} • Entry: {evt.isPaid ? `₹${evt.feeInr}` : 'FREE PASS'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button onClick={() => handleReviewEvent(evt.id, 'approved')} className="btn btn-primary btn-sm">
                    <CheckCircle size={15} />
                    <span>Approve & Publish</span>
                  </button>
                  <button onClick={() => handleReviewEvent(evt.id, 'changes_requested')} className="btn btn-secondary btn-sm">
                    <RefreshCw size={15} />
                    <span>Request Changes</span>
                  </button>
                  <button onClick={() => handleReviewEvent(evt.id, 'rejected')} className="btn btn-danger btn-sm">
                    <XCircle size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Event Raider Scraped Queue */}
      {activeTab === 'scraper' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>Event Raider Ingestion Feed</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Crawls IISc Pravega, RVCE 8th Mile, PESU Aatmatrisha, and BMSCE portals. Scraped events never publish automatically without administrator review.
              </div>
            </div>
            <button onClick={handleTriggerCrawl} disabled={crawlerLoading} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} className={crawlerLoading ? 'spinning' : ''} />
              <span>Rescan College Sources</span>
            </button>
          </div>

          {scrapedEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Radar size={36} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Queue Clean</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Run an automated scan across configured Bengaluru college websites to ingest new events.
              </p>
              <button onClick={handleTriggerCrawl} className="btn btn-primary btn-sm" style={{ marginTop: '1.25rem' }}>
                Scan Supported College Portals
              </button>
            </div>
          ) : (
            scrapedEvents.map((item) => (
              <div key={item.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-acid-yellow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>{item.collegeName}</span>
                      <span className="badge" style={{ fontSize: '0.68rem' }}>Scraped Feed</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>{item.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0.75rem', lineHeight: 1.55 }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                      <span><strong>Date:</strong> {item.eventDate || 'Scheduled'}</span>
                      <span><strong>Venue:</strong> {item.venue}</span>
                      {item.originalSourceUrl && (
                        <a href={item.originalSourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <span>Source URL</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button onClick={() => handleApproveScraped(item.id)} className="btn btn-primary btn-sm">
                      <CheckCircle size={14} />
                      <span>Approve</span>
                    </button>
                    <button onClick={() => handleRejectScraped(item.id)} className="btn btn-danger btn-sm">
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>Organizer access requests</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Review applicants before granting access to the Organizer portal. Approval changes the trusted profile role in Supabase.
              </p>
            </div>
            <button onClick={fetchOrganizerRequests} disabled={requestLoading} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} className={requestLoading ? 'spinning' : ''} />
              <span>Refresh requests</span>
            </button>
          </div>

          {requestLoading && organizerRequests.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading Organizer requests...
            </div>
          ) : organizerRequests.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <CheckCircle size={34} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.6rem' }} />
              <h4 style={{ fontWeight: 800 }}>No pending access requests</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                New Organizer applications will appear here after signup.
              </p>
            </div>
          ) : (
            organizerRequests.map((request) => (
              <div key={request.id} className="card" style={{ padding: '1.4rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    <span className="badge status-pending"><Clock3 size={12} /> PENDING REVIEW</span>
                    <span className="metadata-text">{request.college_name || 'College not provided'}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800 }}>
                    {request.full_name || 'Name not provided'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{request.email}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Submitted: {formatIndiaTime(request.created_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button onClick={() => handleOrganizerRequestDecision(request.id, 'approve')} className="btn btn-primary btn-sm">
                    <UserRoundCheck size={15} />
                    <span>Approve Organizer</span>
                  </button>
                  <button onClick={() => handleOrganizerRequestDecision(request.id, 'reject')} className="btn btn-danger btn-sm">
                    <UserRoundX size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Email Audit Logs */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1.15rem' }}>Recipient</th>
                <th style={{ padding: '0.85rem 1.15rem' }}>Template</th>
                <th style={{ padding: '0.85rem 1.15rem' }}>Subject</th>
                <th style={{ padding: '0.85rem 1.15rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.15rem' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1.15rem' }}>
                    <div style={{ fontWeight: 700 }}>{log.recipientEmail}</div>
                    {log.recipientName && <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{log.recipientName}</div>}
                  </td>
                  <td style={{ padding: '0.85rem 1.15rem' }}>
                    <span className="badge" style={{ fontSize: '0.68rem' }}>{log.templateType}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.15rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.subject}
                  </td>
                  <td style={{ padding: '0.85rem 1.15rem' }}>
                    <span className={`badge ${log.status === 'sent' ? 'status-approved' : log.status === 'not_configured' ? 'status-pending' : 'status-rejected'}`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {formatIndiaTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
