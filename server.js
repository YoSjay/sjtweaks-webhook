require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CONFIG = {
  KEYAUTH_SELLER_KEY: '7ca79466ef4f6b7533a645703827ec59',
  KEYAUTH_APP_NAME: 'SJTweaks Premium Utility',
  RESEND_API_KEY: 're_NxStYq9B_61JMyiaiSY8nvKKMCiVEMfMy',
  EMAIL_FROM: 'SJTweaks <onboarding@resend.dev>',
  PRODUCTS: {
    '1LPB0': { keyauthApp: 'SJTweaks Premium Utility', expiry: 0, level: 1, mask: 'XXXXX-XXXXX-XXXXX-XXXXX' }
  }
};

async function generateKeyAuthLicense(productConfig) {
  try {
    const params = new URLSearchParams({
      sellerkey: CONFIG.KEYAUTH_SELLER_KEY, type: 'add', format: 'json',
      expiry: productConfig.expiry.toString(), mask: productConfig.mask,
      level: productConfig.level.toString(), amount: '1', owner: CONFIG.KEYAUTH_APP_NAME
    });
    const response = await axios.get(`https://keyauth.win/api/seller/?${params.toString()}`);
    if (response.data.success) {
      const key = response.data.key || (response.data.keys && response.data.keys[0]);
      console.log('✅ Generated KeyAuth license:', key);
      return key;
    } else { console.error('❌ KeyAuth error:', response.data.message); return null; }
  } catch (error) { console.error('❌ KeyAuth API error:', error.message); return null; }
}

async function sendLicenseEmail(email, customerName, licenseKey, productName) {
  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: CONFIG.EMAIL_FROM,
      to: email,
      subject: `🎮 Your ${productName} License Key`,
      html: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0f;color:#fff;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:linear-gradient(135deg,#12121a 0%,#1a1a2e 100%);border-radius:16px;padding:40px;border:1px solid #2a2a3e}.logo{text-align:center;margin-bottom:30px}.logo img{width:80px;height:80px}h1{color:#00aeff;text-align:center;margin-bottom:10px;font-size:28px}.subtitle{color:#888;text-align:center;margin-bottom:30px}.license-box{background:#0a0a12;border:2px solid #00aeff;border-radius:12px;padding:20px;text-align:center;margin:30px 0}.license-label{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px}.license-key{font-family:'Consolas',monospace;font-size:24px;color:#00aeff;letter-spacing:2px;word-break:break-all}.instructions{background:#1a1a2e;border-radius:8px;padding:20px;margin-top:30px}.instructions h3{color:#00aeff;margin-top:0}.instructions ol{color:#ccc;line-height:1.8}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="logo"><img src="https://i.imgur.com/MBCguvv.png" alt="SJTweaks"></div><h1>Thank You for Your Purchase! 🎉</h1><p class="subtitle">Hello ${customerName || 'Gamer'},</p><p style="color:#ccc;text-align:center;">Your license key for <strong style="color:#00aeff;">${productName}</strong> is ready!</p><div class="license-box"><div class="license-label">Your License Key</div><div class="license-key">${licenseKey}</div></div><div class="instructions"><h3>📋 How to Activate</h3><ol><li>Download and install ${productName}</li><li>Launch the application</li><li>Enter your license key when prompted</li><li>Click "Activate License"</li><li>Enjoy your optimized gaming experience!</li></ol></div><p style="color:#888;text-align:center;margin-top:30px;"><strong>⚠️ Important:</strong> Keep this email safe.</p><div class="footer"><p>Need help? Reply to this email for support.</p><p>© ${new Date().getFullYear()} SJTweaks. All rights reserved.</p></div></div></body></html>`
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.response?.data || error.message);
    return false;
  }
}

app.post('/webhook/payhip', async (req, res) => {
  console.log('\n📦 Received Payhip webhook:', new Date().toISOString());
  try {
    const buyer_email = req.body.email;
    const items = req.body.items || [];
    const firstItem = items[0] || {};
    const product_key = firstItem.product_key;
    const product_name = firstItem.product_name;

    if (!buyer_email) { return res.status(400).json({ error: 'Missing email' }); }

    console.log(`🛒 New sale: ${product_name}`);
    console.log(`👤 Buyer: ${buyer_email}`);
    console.log(`🔑 Product Key: ${product_key}`);

    let productConfig = CONFIG.PRODUCTS[product_key] || { keyauthApp: 'SJTweaks Premium Utility', expiry: 0, level: 1, mask: 'XXXXX-XXXXX-XXXXX-XXXXX' };

    const licenseKey = await generateKeyAuthLicense(productConfig);
    if (!licenseKey) { return res.status(500).json({ error: 'Failed to generate license key' }); }

    await sendLicenseEmail(buyer_email, buyer_email.split('@')[0], licenseKey, product_name || productConfig.keyauthApp);

    console.log('✅ Done!\n');
    res.status(200).json({ success: true, key: licenseKey });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/test', (req, res) => { res.json({ status: 'Running!' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}\n✅ KeyAuth configured\n✅ Resend email configured`); });
