const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Load local secrets from .env without overriding variables already set by the host.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const PORT = Number(process.env.PORT || 3000);
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ROOT = __dirname;
const pendingOrders = new Map();

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 8192) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
async function createRazorpayOrder(amountPaise) {
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `northstar_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}` })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.description || 'Razorpay could not create the order.');
  return data;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && url.pathname === '/api/create-order') {
    if (!KEY_ID || !KEY_SECRET) return send(res, 503, { error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.' });
    try {
      const { amount } = await readJson(req);
      const rupees = Number(amount);
      if (!Number.isFinite(rupees) || rupees < 1 || rupees > 10000000 || Math.round(rupees * 100) !== rupees * 100) {
        return send(res, 400, { error: 'Choose a valid amount from ₹1.00 to ₹1,00,00,000.00.' });
      }
      const paise = Math.round(rupees * 100);
      const order = await createRazorpayOrder(paise);
      pendingOrders.set(order.id, { amount: paise, createdAt: Date.now() });
      // Keep this demo's in-memory order list bounded.
      for (const [id, entry] of pendingOrders) if (Date.now() - entry.createdAt > 24 * 60 * 60 * 1000) pendingOrders.delete(id);
      return send(res, 200, { keyId: KEY_ID, orderId: order.id, amount: order.amount });
    } catch (error) { return send(res, 502, { error: error.message || 'Unable to create Razorpay order.' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/verify-payment') {
    if (!KEY_SECRET) return send(res, 503, { error: 'Razorpay is not configured.' });
    try {
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await readJson(req);
      const order = pendingOrders.get(orderId);
      if (!order || typeof paymentId !== 'string' || typeof signature !== 'string') return send(res, 400, { error: 'Payment details could not be verified. Please contact support before retrying.' });
      const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
      const received = Buffer.from(signature, 'hex');
      if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return send(res, 400, { error: 'Razorpay payment signature is invalid.' });
      pendingOrders.delete(orderId);
      return send(res, 200, { verified: true, paymentId });
    } catch (error) { return send(res, 400, { error: error.message || 'Unable to verify payment.' }); }
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
  }
  return send(res, 404, { error: 'Not found' });
});
server.listen(PORT, '0.0.0.0', () => console.log(`Razorpay checkout listening on port ${PORT}`));
