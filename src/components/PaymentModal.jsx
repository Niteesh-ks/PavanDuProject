import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { DigitalTicket } from './DigitalTicket';
import { authenticatedApiRequest } from '../lib/api';

export function PaymentModal({ event, onClose, onPaymentComplete }) {
  const { user, profile } = useAuth();
  const { addNotification } = useNotifications();

  const [step, setStep] = useState('review'); // 'review' | 'processing' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState(null);

  const amountInINR = event.isPaid ? Number(event.feeInr || 0) : 0;

  async function handleProceedPayment() {
    setStep('processing');
    setErrorMessage('');

    try {
      // Free Event direct path
      if (!event.isPaid || amountInINR === 0) {
        const data = await authenticatedApiRequest('/api/payments/register-free', {
          method: 'POST',
          body: JSON.stringify({ eventId: event.id }),
        });

        if (data.success) {
          setConfirmedTicket(data.ticket);
          setStep('success');
          void addNotification({
            title: 'Complimentary Pass Issued!',
            message: `Your pass for ${event.title} is now active in My Experiences.`,
            type: 'ticket',
          }).catch((notificationError) => {
            console.error('[Payment Notification]', notificationError.message);
          });
          if (onPaymentComplete) onPaymentComplete(data.ticket);
        } else {
          throw new Error(data.error || 'Registration failed');
        }
        return;
      }

      // 1. Create order on Express backend
      const orderData = await authenticatedApiRequest('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ eventId: event.id }),
      });
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // 2. Open Razorpay Checkout or test execution
      if (typeof window.Razorpay !== 'undefined') {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'UNFOLD Experiences',
          description: `Registration for ${event.title}`,
          order_id: orderData.orderId,
          prefill: {
            name: profile?.full_name || user?.email || 'Account holder',
            email: user?.email || '',
          },
          theme: { color: '#294C38' },
          handler: async function (response) {
            await verifyBackendPayment(orderData.orderId, response.razorpay_payment_id, response.razorpay_signature);
          },
          modal: {
            ondismiss: function () {
              setStep('review');
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Secure test mode simulated execution
        const testPaymentId = `pay_test_${Date.now()}`;
        const testSignature = `sig_test_${testPaymentId}`;

        setTimeout(async () => {
          await verifyBackendPayment(orderData.orderId, testPaymentId, testSignature);
        }, 800);
      }
    } catch (err) {
      console.error('[Payment Error]', err);
      setErrorMessage(err.message || 'Payment initiation failed');
      setStep('failed');
    }
  }

  async function verifyBackendPayment(orderId, paymentId, signature) {
    try {
      const verifyData = await authenticatedApiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          paymentId,
          signature,
        }),
      });
      if (verifyData.success) {
        setConfirmedTicket(verifyData.ticket);
        setStep('success');
        void addNotification({
          title: 'Payment & Ticket Confirmed!',
          message: `Digital pass issued for ${event.title}`,
          type: 'payment',
        }).catch((notificationError) => {
          console.error('[Payment Notification]', notificationError.message);
        });
        if (onPaymentComplete) onPaymentComplete(verifyData.ticket);
      } else {
        setErrorMessage(verifyData.error || 'Payment signature could not be verified');
        setStep('failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Backend signature verification error');
      setStep('failed');
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: step === 'success' ? '480px' : '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>
            {step === 'success' ? 'Registration Complete' : 'Reserve Entry Pass'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step: Review Order */}
        {step === 'review' && (
          <div>
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1.35rem', marginBottom: '1.35rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-forest-green)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>
                {event.collegeName}
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, margin: '0.35rem 0 0.85rem' }}>
                {event.title}
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pass Tier:</span>
                <span style={{ fontWeight: 700 }}>{event.isPaid ? 'Delegate Access' : 'Complimentary Entry'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '1.2rem', fontWeight: 800 }}>
                <span>Total Due:</span>
                <span style={{ color: 'var(--color-forest-green)' }}>
                  {event.isPaid ? `₹${amountInINR}` : '₹0 (FREE)'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.35rem' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-forest-green)' }} />
              <span>Razorpay 256-Bit SSL Encrypted • Test Mode Gateway</span>
            </div>

            <button onClick={handleProceedPayment} className="btn btn-primary" style={{ width: '100%' }}>
              <CreditCard size={16} />
              <span>{event.isPaid ? `Pay ₹${amountInINR} & Issue QR Pass` : 'Claim Free Pass'}</span>
            </button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <Loader2 size={36} className="spinning" style={{ margin: '0 auto 1rem', color: 'var(--color-forest-green)' }} />
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Confirming with Gateway</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Validating signature with Razorpay backend...
            </p>
          </div>
        )}

        {/* Step: Failed */}
        {step === 'failed' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 0.75rem', color: '#DC2626' }} />
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#DC2626' }}>Transaction Incomplete</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1.35rem' }}>
              {errorMessage || 'Payment could not be verified.'}
            </p>
            <button onClick={() => setStep('review')} className="btn btn-secondary" style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        )}

        {/* Step: Success Ticket Presentation */}
        {step === 'success' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-forest-green)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
              <span>Verified & Pass Generated</span>
            </div>
            <DigitalTicket ticket={confirmedTicket} />
          </div>
        )}
      </div>
      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
