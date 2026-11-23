import React, { useState } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export function AnnouncementModal({ event, onClose }) {
  const { addNotification } = useNotifications();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('compose'); // 'compose' | 'confirm' | 'sending' | 'summary'
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const sampleRecipients = [
    { name: 'Campus Delegate', email: 'delegate@meethub.events' },
    { name: 'Kavya S', email: 'kavya.s@rvce.edu.in' },
    { name: 'Rohan Deshmukh', email: 'rohan.d@bmsce.ac.in' },
    { name: 'Ananya Iyer', email: 'ananya.iyer@iisc.ac.in' },
    { name: 'Siddharth Rao', email: 'siddharth@msrit.edu' },
    { name: 'Pooja Nair', email: 'pooja.nair@christuniversity.in' },
    { name: 'Vikram Joshi', email: 'vikram.j@iiitb.ac.in' },
    { name: 'Divya Menon', email: 'divya.m@sju.edu.in' },
    { name: 'Aditya Kulkarni', email: 'aditya.k@pes.edu' },
    { name: 'Sneha Patil', email: 'sneha.p@rvce.edu.in' },
    { name: 'Manoj Kumar', email: 'manoj.k@dsce.edu.in' },
    { name: 'Meera Hegde', email: 'meera.h@mccblr.edu.in' },
    { name: 'Harish Gowda', email: 'harish.g@msrit.edu' },
    { name: 'Rashmi Sen', email: 'rashmi.s@bmsce.ac.in' },
    { name: 'Chetan V', email: 'chetan.v@pes.edu' },
    { name: 'Naveen Raj', email: 'naveen.r@rvce.edu.in' },
    { name: 'Bhavana M', email: 'bhavana.m@iisc.ac.in' },
    { name: 'Tarun Reddy', email: 'tarun.r@iiitb.ac.in' },
    { name: 'Deepa Kamath', email: 'deepa.k@christuniversity.in' },
    { name: 'Kiran Verma', email: 'kiran.v@sju.edu.in' },
    { name: 'Nikhil Prabhu', email: 'nikhil.p@dsce.edu.in' },
  ];

  async function handleSend() {
    setStep('sending');
    setErrorMsg('');

    try {
      const response = await fetch('/api/email/send-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          announcementTitle: title,
          message: message,
          recipients: sampleRecipients,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed sending announcements');
      }

      setDeliveryResult(data.results);
      setStep('summary');

      void addNotification({
        title: 'Broadcast Announcement Dispatched',
        message: `Dispatched to ${sampleRecipients.length} delegates of ${event.title}`,
        type: 'announcement',
      }).catch((notificationError) => {
        console.error('[Announcement Notification]', notificationError.message);
      });
    } catch (err) {
      setErrorMsg(err.message || 'Delivery error');
      setStep('compose');
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>Broadcast Announcement</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              To registered delegates of: <strong>{event.title}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {step === 'compose' && (
          <div>
            {errorMsg && (
              <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.1)', color: '#DC2626', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Announcement Headline</label>
              <input
                type="text"
                placeholder="e.g. Schedule Shift: Hackathon Finals Room 402"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message Instructions</label>
              <textarea
                rows={4}
                placeholder="Write specific guidelines, reporting times, or venue gate instructions..."
                className="form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '0.95rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <Users size={16} style={{ color: 'var(--color-forest-green)' }} />
                <span>Roster: <strong>{sampleRecipients.length} registered delegates</strong></span>
              </div>
              <span className="metadata-text">Rate-limited batching</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!title.trim() || !message.trim()}
                className="btn btn-primary btn-sm"
              >
                Preview & Confirm Dispatch
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{ background: 'rgba(230,169,74,0.15)', border: '1.5px solid var(--color-amber)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', color: '#B4781E', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                <AlertCircle size={18} />
                <span>Explicit Transmission Confirmation</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                You are about to transmit this official email broadcast to <strong>{sampleRecipients.length} registered delegates</strong>.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1.15rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
              <div className="metadata-text" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>SUBJECT PREVIEW:</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', margin: '2px 0 8px' }}>[UNFOLD Update] {event.title}: {title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep('compose')} className="btn btn-secondary btn-sm">Edit</button>
              <button onClick={handleSend} className="btn btn-primary btn-sm">
                <Send size={14} />
                <span>Confirm & Send Broadcast</span>
              </button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <Loader2 size={36} className="spinning" style={{ margin: '0 auto 1rem', color: 'var(--color-forest-green)' }} />
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Dispatching Announcements</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Transmitting through rate-limited Nodemailer batches...
            </p>
          </div>
        )}

        {step === 'summary' && deliveryResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <CheckCircle size={44} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>Dispatch Run Completed</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Audit logs recorded in backend delivery engine.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ background: 'var(--bg-card)', padding: '0.95rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)' }}>
                <span className="metadata-text">Total</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{deliveryResult.total}</div>
              </div>
              <div style={{ background: 'rgba(41,76,56,0.15)', padding: '0.95rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-forest-green)' }}>
                <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>Delivered</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>{deliveryResult.sent + deliveryResult.notConfigured}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '0.95rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)' }}>
                <span className="metadata-text">Failed</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>{deliveryResult.failed}</div>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
              Complete
            </button>
          </div>
        )}
      </div>
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
