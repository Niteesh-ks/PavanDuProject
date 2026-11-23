import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatIndiaTime } from '../lib/dateTime';

export function QRScannerModal({ eventId, eventTitle, onClose }) {
  const { user } = useAuth();
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannerStarted, setScannerStarted] = useState(false);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-reader-container';

  useEffect(() => {
    let qrInstance = null;

    async function startCamera() {
      try {
        qrInstance = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrInstance;

        await qrInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleValidateTicket(decodedText);
          },
          (errorMessage) => {
            // Ignore ongoing frame misses
          }
        );
        setScannerStarted(true);
      } catch (err) {
        console.warn('[Camera Scanner Notice]', err);
        setCameraError('Camera access unavailable or blocked. Enter ticket code manually below.');
      }
    }

    startCamera();

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .catch((e) => console.log('Camera stop note:', e))
          .finally(() => {
            try {
              html5QrCodeRef.current.clear();
            } catch (e) {}
          });
      }
    };
  }, []);

  async function handleValidateTicket(rawTextOrCode) {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/tickets/validate-and-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawQrData: rawTextOrCode,
          ticketCode: rawTextOrCode,
          eventId: eventId,
          scannerUserId: user?.id || 'organizer_scanner',
          deviceInfo: navigator.userAgent,
        }),
      });

      const data = await response.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({
        status: 'RED',
        result: 'ERROR',
        title: 'NETWORK ERROR',
        message: 'Could not connect to UNFOLD verification server.',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleValidateTicket(manualCode.trim());
    }
  };

  const handleResetScan = () => {
    setScanResult(null);
    setManualCode('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>
              On-Site QR Pass Scanner
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Gate verification for: <strong>{eventTitle || 'All Events'}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scan Result Feedback Banner */}
        {scanResult ? (
          <div>
            <div
              className={`scanner-status-box ${
                scanResult.status === 'GREEN'
                  ? 'scanner-status-green'
                  : scanResult.status === 'ORANGE'
                  ? 'scanner-status-orange'
                  : 'scanner-status-red'
              }`}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                {scanResult.status === 'GREEN' && <CheckCircle size={44} />}
                {scanResult.status === 'ORANGE' && <AlertTriangle size={44} />}
                {scanResult.status === 'RED' && <XCircle size={44} />}
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                {scanResult.title}
              </h2>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                {scanResult.message}
              </p>

              {scanResult.ticketDetails && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.95rem',
                    marginTop: '1.25rem',
                    textAlign: 'left',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div><strong>Ticket Code:</strong> {scanResult.ticketDetails.ticketCode}</div>
                  <div><strong>Attendee:</strong> {scanResult.ticketDetails.userName || 'Student'}</div>
                  {scanResult.ticketDetails.usedAt && (
                    <div style={{ color: 'var(--color-amber)', marginTop: '2px' }}>
                      <strong>Previously Checked In:</strong> {formatIndiaTime(scanResult.ticketDetails.usedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleResetScan} className="btn btn-primary" style={{ width: '100%' }}>
                <RefreshCw size={15} />
                <span>Scan Next Attendee</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Camera Viewport */}
            <div
              style={{
                width: '100%',
                minHeight: '260px',
                backgroundColor: '#151B17',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--border-strong)',
              }}
            >
              <div id={scannerContainerId} style={{ width: '100%' }} />

              {cameraError && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#B8D8A5', fontSize: '0.8125rem' }}>
                  <Camera size={32} style={{ marginBottom: '0.5rem', color: 'var(--color-sage)' }} />
                  <div>{cameraError}</div>
                </div>
              )}

              {isProcessing && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(21,27,23,0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                  }}
                >
                  <RefreshCw className="spinning" size={28} style={{ color: 'var(--color-acid-yellow)' }} />
                  <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 700 }}>Verifying Cryptographic Pass...</span>
                </div>
              )}
            </div>

            {/* Manual Ticket ID Fallback Input */}
            <div style={{ marginTop: '1.5rem' }}>
              <div className="metadata-text" style={{ marginBottom: '0.4rem' }}>Manual Fallback Entry</div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter Pass Code (e.g. MH-2026-X8Y4Z2)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="form-input"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                />
                <button type="submit" className="btn btn-secondary" disabled={!manualCode.trim() || isProcessing}>
                  <Search size={16} />
                  <span>Verify</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
