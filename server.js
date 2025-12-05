require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CONFIG = {
  KEYAUTH_SELLER_KEY: '7ca79466ef4f6b7533a645703827ec59',
  RESEND_API_KEY: 're_NxStYq9B_61JMyiaiSY8nvKKMCiVEMfMy',
  EMAIL_FROM: 'SJTweaks <noreply@sjtweaks.com>',
  PRODUCTS: {
    '1LPB0': { keyauthApp: 'SJTweaks Premium Utility', expiry: 1, level: 1 }
  }
};

async function generateKeyAuthLicense(productConfig) {
  try {
    const url = `https://keyauth.win/api/seller/?sellerkey=${CONFIG.KEYAUTH_SELLER_KEY}&type=add&expiry=${productConfig.expiry}&mask=******-******-******-******&level=${productConfig.level}&amount=1&format=json`;
    console.log('🔑 Calling KeyAuth API...');
    const response = await axios.get(url);
    console.log('🔑 KeyAuth response:', JSON.stringify(response.data));
    if (response.data.success) {
      const key = response.data.key || response.data.keys?.[0] || response.data.keys;
      console.log('✅ Generated KeyAuth license:', key);
      return key;
    } else {
      console.error('❌ KeyAuth error:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ KeyAuth API error:', error.message);
    return null;
  }
}

async function sendLicenseEmail(email, customerName, licenseKey, productName) {
  try {
    await axios.post('https://api.resend.com/emails', {
      from: CONFIG.EMAIL_FROM,
      to: email,
      subject: `🎮 Your ${productName} License Key`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#0d1117 0%,#161b22 100%);border-radius:16px;border:1px solid #30363d;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid #21262d;">
              <img src="https://i.imgur.com/yQ9KK1I.png" alt="SJTweaks" style="width:120px;height:auto;margin-bottom:20px;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:600;">Thank You for Your Purchase!</h1>
              <p style="margin:10px 0 0;color:#8b949e;font-size:16px;">Hello ${customerName || 'Gamer'}, your license is ready</p>
            </td>
          </tr>
          
          <!-- Product Name -->
          <tr>
            <td style="padding:30px 40px 10px;text-align:center;">
              <p style="margin:0;color:#8b949e;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Product</p>
              <p style="margin:8px 0 0;color:#58a6ff;font-size:20px;font-weight:600;">${productName}</p>
            </td>
          </tr>
          
          <!-- License Key Box -->
          <tr>
            <td style="padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;border:2px solid #238636;border-radius:12px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <p style="margin:0 0 10px;color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Your License Key</p>
                    <p style="margin:0;color:#3fb950;font-size:22px;font-family:'Courier New',monospace;font-weight:bold;letter-spacing:1px;word-break:break-all;">${licenseKey}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Instructions -->
          <tr>
            <td style="padding:20px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:10px;border:1px solid #21262d;">
                <tr>
                  <td style="padding:20px 25px;">
                    <p style="margin:0 0 15px;color:#ffffff;font-size:16px;font-weight:600;">📋 How to Activate</p>
                    <p style="margin:0 0 8px;color:#c9d1d9;font-size:14px;line-height:1.6;">1. Download and install ${productName}</p>
                    <p style="margin:0 0 8px;color:#c9d1d9;font-size:14px;line-height:1.6;">2. Launch the application</p>
                    <p style="margin:0 0 8px;color:#c9d1d9;font-size:14px;line-height:1.6;">3. Enter your license key when prompted</p>
                    <p style="margin:0 0 8px;color:#c9d1d9;font-size:14px;line-height:1.6;">4. Click "Activate License"</p>
                    <p style="margin:0;color:#c9d1d9;font-size:14px;line-height:1.6;">5. Enjoy your optimized gaming! 🎮</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #21262d;">
              <p style="margin:0 0 5px;color:#f85149;font-size:13px;">⚠️ Keep this email safe - your key is unique to your purchase</p>
              <p style="margin:15px 0 0;color:#484f58;font-size:12px;">© ${new Date().getFullYear()} SJTweaks. All rights reserved.</p>
              <p style="margin:5px 0 0;color:#484f58;font-size:12px;">Need help? Reply to this email</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    }, {
      headers: { 'Authorization': `Bearer ${CONFIG.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
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

    let productConfig = CONFIG.PRODUCTS[product_key] || { keyauthApp: 'SJTweaks Premium Utility', expiry: 1, level: 1 };

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
