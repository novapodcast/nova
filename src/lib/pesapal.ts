import axios from 'axios';

const BASE_URL = 'https://pay.pesapal.com/v3';
const MODE = (process.env.PESAPAL_MODE || '').toLowerCase();
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';

export const isDemo = MODE === 'demo' || !CONSUMER_KEY || !CONSUMER_SECRET;

async function getAccessToken(): Promise<string> {
  if (isDemo) return 'demo-token';
  const res = await axios.post(
    `${BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );
  return res.data.token as string;
}

export async function registerIPN(url: string, ipnType: string = 'GET'): Promise<string> {
  if (isDemo) return `DEMO-IPN-${Date.now()}`;
  const token = await getAccessToken();
  const res = await axios.post(
    `${BASE_URL}/api/URLSetup/RegisterIPN`,
    { url, ipn_notification_type: ipnType },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' } }
  );
  return res.data.ipn_id as string;
}

export interface PaymentRequestBody {
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationId?: string;
  billingAddress: {
    emailAddress: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function submitOrderRequest(body: PaymentRequestBody & { id?: string }): Promise<{ orderTrackingId: string; merchantReference: string; redirectUrl: string; }> {
  if (isDemo) {
    const now = Date.now();
    return { orderTrackingId: `DEMO-OTI-${now}`, merchantReference: `DEMO-MR-${now}`, redirectUrl: 'https://example.com/pesapal-demo' };
  }
  const token = await getAccessToken();
  const res = await axios.post(
    `${BASE_URL}/api/Transactions/SubmitOrderRequest`,
    {
      id: body.id || `NOVA-${Date.now()}`,
      currency: body.currency,
      amount: body.amount,
      description: body.description,
      callback_url: body.callbackUrl,
      notification_id: body.notificationId,
      billing_address: body.billingAddress,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' } }
  );
  return {
    orderTrackingId: res.data.order_tracking_id,
    merchantReference: res.data.merchant_reference,
    redirectUrl: res.data.redirect_url,
  };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<{
  paymentMethod: string;
  amount: number;
  currency: string;
  paymentStatusDescription: string;
  paymentStatusCode: string;
  merchantReference: string;
}> {
  if (isDemo) {
    return {
      paymentMethod: 'demo',
      amount: 0,
      currency: 'RWF',
      paymentStatusDescription: 'COMPLETED',
      paymentStatusCode: '000',
      merchantReference: `DEMO-MR-${orderTrackingId}`,
    };
  }
  const token = await getAccessToken();
  const res = await axios.get(`${BASE_URL}/api/Transactions/GetTransactionStatus`, {
    params: { orderTrackingId },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
}
