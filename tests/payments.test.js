import { describe, it, expect } from 'vitest';
import { createPaymentOrder, verifyPaymentSignature } from '../server/services/razorpay.js';
import crypto from 'crypto';

describe('Razorpay Payment Verification Services', () => {
  it('creates test mode payment order with correct INR paise conversion', async () => {
    const order = await createPaymentOrder(299, 'rcpt_unit_test');
    expect(order.success).toBe(true);
    expect(order.orderId).toBeTruthy();
    expect(order.amount).toBe(29900); // 299 * 100 paise
    expect(order.currency).toBe('INR');
  });

  it('rejects tampered or fraudulent payment signatures', () => {
    const result = verifyPaymentSignature('order_test_123', 'pay_test_456', 'fake_signature_hash');
    expect(result.valid).toBe(false);
  });

  it('verifies simulated test-mode signature successfully', () => {
    const orderId = 'order_test_abc123';
    const paymentId = 'pay_test_xyz789';
    const testSignature = `sig_test_${paymentId}`;

    const result = verifyPaymentSignature(orderId, paymentId, testSignature);
    expect(result.valid).toBe(true);
  });
});
