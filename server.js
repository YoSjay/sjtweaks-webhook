require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

const CONFIG = {
  KEYAUTH_SELLER_KEY: '7ca79466ef4f6b7533a645703827ec59',
  RESEND_API_KEY: 're_NxStYq9B_61JMyiaiSY8nvKKMCiVEMfMy',
  EMAIL_FROM: 'SJTweaks <noreply@sjtweaks.com>',
  ADMIN_KEY: 'sjtweaks_admin_2024',
  PRODUCTS: { '1LPB0': { expiry: 1, level: 1 } }
};

let orders = [];
const ORDERS_FILE = '/tmp/orders.json';
try { if (fs.existsSync(ORDERS_FILE)) orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch(e) {}
function saveOrders() { try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders)); } catch(e) {} }

async function generateKeyAuthLicense(cfg) {
  try {
    const r = await axios.get(`https://keyauth.win/api/seller/?sellerkey=${CONFIG.KEYAUTH_SELLER_KEY}&type=add&expiry=${cfg.expiry}&mask=******-******-******-******&level=${cfg.level}&amount=1&format=json`);
    return r.data.success ? (r.data.key || r.data.keys?.[0]) : null;
  } catch(e) { return null; }
}

async function sendEmail(email, name, key, product) {
  try {
    await axios.post('https://api.resend.com/emails', {
      from: CONFIG.EMAIL_FROM, to: email, subject: `🎮 Your ${product} License Key`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#0d1117;font-family:sans-serif;"><div style="max-width:600px;margin:0 auto;background:#161b22;border-radius:16px;border:1px solid #30363d;padding:40px;"><img src="https://i.imgur.com/yQ9KK1I.png" style="width:100px;display:block;margin:0 auto 20px;"><h1 style="color:#fff;text-align:center;margin:0 0 10px;">Thank You!</h1><p style="color:#8b949e;text-align:center;">Hello ${name}, your license for <strong style="color:#58a6ff;">${product}</strong> is ready!</p><div style="background:#0d1117;border:2px solid #238636;border-radius:12px;padding:25px;text-align:center;margin:30px 0;"><p style="color:#8b949e;font-size:12px;margin:0 0 10px;text-transform:uppercase;">License Key</p><p style="color:#3fb950;font-size:22px;font-family:monospace;margin:0;font-weight:bold;">${key}</p></div><p style="color:#8b949e;font-size:14px;line-height:2;">1. Download and install<br>2. Enter license key<br>3. Enjoy! 🎮</p></div></body></html>`
    }, { headers: { 'Authorization': `Bearer ${CONFIG.RESEND_API_KEY}`, 'Content-Type': 'application/json' } });
    return true;
  } catch(e) { return false; }
}

app.post('/webhook/payhip', async (req, res) => {
  console.log('📦 Webhook received');
  try {
    const email = req.body.email;
    const order_id = req.body.id;
    const items = req.body.items || [];
    const item = items[0] || {};
    const product = item.product_name;
    const product_key = item.product_key;
    const price = req.body.price;

    if (!email) return res.status(400).json({ error: 'No email' });

    const cfg = CONFIG.PRODUCTS[product_key] || { expiry: 1, level: 1 };
    const key = await generateKeyAuthLicense(cfg);
    if (!key) return res.status(500).json({ error: 'Key generation failed' });

    const sent = await sendEmail(email, email.split('@')[0], key, product || 'SJTweaks');

    orders.unshift({ order_id, email, product, product_key, license_key: key, price, email_sent: sent, date: new Date().toISOString() });
    if (orders.length > 500) orders = orders.slice(0, 500);
    saveOrders();

    console.log(`✅ ${order_id} | ${email} | ${key}`);
    res.json({ success: true, key });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Error' }); }
});

app.get('/api/orders', (req, res) => {
  if (req.headers.authorization !== CONFIG.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ success: true, orders });
});

app.get('/test', (req, res) => res.json({ status: 'Running' }));

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running'));
