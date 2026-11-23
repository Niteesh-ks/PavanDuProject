import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, Printer, ShieldCheck, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { formatIndiaDate } from '../lib/dateTime';

export function DigitalTicket({ ticket }) {
  const ticketRef = useRef(null);

  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrDataString =
    typeof ticket.qrPayload === 'string'
      ? ticket.qrPayload
      : JSON.stringify({
          app: 'UNFOLD',
          code: ticket.ticketCode,
          token: ticket.secureToken,
          eventId: ticket.eventId,
        });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div className="digital-ticket-wrapper" ref={ticketRef} style={{ width: '100%' }}>
        {/* Ticket Top Section */}
        <div className="ticket-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-acid-yellow)', fontWeight: 800 }}>
              Official UNFOLD Entry Pass
            </span>
            <span
              style={{
                backgroundColor: ticket.isUsed ? 'rgba(230,169,74,0.3)' : 'rgba(226,255,84,0.25)',
                color: ticket.isUsed ? '#E6A94A' : '#E2FF54',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={12} />
              <span>{ticket.isUsed ? 'CHECKED IN' : 'VALID / ACTIVE'}</span>
            </span>
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-warm-ivory)', lineHeight: 1.25, marginBottom: '0.35rem' }}>
            {ticket.eventTitle || 'Campus Event'}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-sage)' }}>{ticket.collegeName || 'Bengaluru University Campus'}</p>

          <div className="ticket-notches">
            <div className="ticket-notch-left" />
            <div className="ticket-notch-right" />
          </div>
        </div>

        {/* Ticket Perforated Body with High-Contrast QR Code */}
        <div className="ticket-body">
          <div className="ticket-code-pill">
            {ticket.ticketCode}
          </div>

          <div className="ticket-qr-box">
            <QRCodeSVG
              value={qrDataString}
              size={180}
              level="H"
              fgColor="#151B17"
              bgColor="#FFFFFF"
              includeMargin={false}
            />
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-sage)', margin: '0.35rem 0 1.25rem' }}>
            Present at venue gate for camera QR check-in
          </p>

          {/* Attendee Details Grid */}
          <div style={{ width: '100%', background: 'var(--color-forest-dark)', padding: '1.15rem', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', textAlign: 'left', fontSize: '0.8125rem', border: '1px solid rgba(244,240,230,0.1)' }}>
            <div>
              <span style={{ color: 'var(--color-sage)', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>ATTENDEE</span>
              <strong style={{ color: 'var(--color-warm-ivory)' }}>{ticket.userName || ticket.userEmail || 'Account holder'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-sage)', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>PAYMENT STATUS</span>
              <strong style={{ color: 'var(--color-acid-yellow)', textTransform: 'uppercase' }}>
                {ticket.paymentStatus || 'FREE'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-sage)', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>DATE</span>
              <strong style={{ color: 'var(--color-warm-ivory)' }}>{formatIndiaDate(ticket.eventDate) || 'Scheduled'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-sage)', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>GATE VERIFICATION</span>
              <strong style={{ color: 'var(--color-warm-ivory)' }}>Main Campus Portal</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Print Action */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.35rem' }}>
        <button onClick={handlePrint} className="btn btn-secondary btn-sm">
          <Printer size={15} />
          <span>Print / Save Pass (PDF)</span>
        </button>
      </div>
    </div>
  );
}
