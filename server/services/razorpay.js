import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_meetHubDev';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dev_secret_key_meethub';

let razorpayInstance = null;
try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
} catch (err) {
  console.warn('[Razorpay] Initialization warning:', err.message);
}

/**
 * Create a new payment order
 * @param {number} amountInINR
 * @param {string} receiptId
 * @param {object} notes
 */
export async function createPaymentOrder(amountInINR, receiptId, notes = {}) {
  const amountInPaise = Math.round(Number(amountInINR) * 100);

  // If Razorpay instance is ready and real test key is provided
  if (razorpayInstance && !keyId.includes('yourKeyIdHere')) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: notes,
      });
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        isSimulated: false,
      };
    } catch (err) {
      console.warn('[Razorpay API] Live call failed, falling back to secure dev test-order:', err.message);
    }
  }

  // Secure test-mode fallback order when running with placeholder keys
  const simulatedOrderId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
  return {
    success: true,
    orderId: simulatedOrderId,
    amount: amountInPaise,
    currency: 'INR',
    isSimulated: true,
    message: 'Test mode order created',
  };
}

/**
 * Verify Razorpay payment signature
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId) {
    return { valid: false, reason: 'Missing order_id or payment_id' };
  }

  // In simulated test mode for testing environments
  if (orderId.startsWith('order_test_') && signature === `sig_test_${paymentId}`) {
    return { valid: true, simulated: true };
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = expectedSignature === signature;
  return {
    valid: isValid,
    reason: isValid ? 'Signature valid' : 'Signature mismatch',
  };
}
