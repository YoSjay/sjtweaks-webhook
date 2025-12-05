require('dotenv').config();
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  // KeyAuth Seller API credentials (get from https://keyauth.cc/app/?page=seller-settings)
  KEYAUTH_SELLER_KEY: process.env.KEYAUTH_SELLER_KEY || '7ca79466ef4f6b7533a645703827ec59',
  
  // Your KeyAuth application name
  KEYAUTH_APP_NAME: process.env.KEYAUTH_APP_NAME || 'SJTweaks Premium Utility',
  
  // Payhip webhook secret (optional, for verification)
  PAYHIP_SECRET: process.env.PAYHIP_SECRET || '',
  
  // Email configuration (using Gmail as example)
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'kickinitzwithadah@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'culbhumkmigyirpz',
  EMAIL_FROM: process.env.EMAIL_FROM || 'SJTweaks <kickinitzwithadah@gmail.com>',
  
  // Product to KeyAuth mapping
  // Map your Payhip product IDs to KeyAuth license settings
  PRODUCTS: {
    // 'payhip_product_id': { keyauthApp: 'app_name', expiry: 'days or 0 for lifetime', level: 1 }
    'PRODUCT_ID_PREMIUM': { 
      keyauthApp: 'SJTweaks Premium Utility', 
      expiry: 0,  // 0 = lifetime, or number of days
      level: 1,
      mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
    },
    'PRODUCT_ID_FPS': { 
      keyauthApp: 'SJTweaks FPS Boost', 
      expiry: 0,
      level: 1,
      mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
    },
    'PRODUCT_ID_ZERODELAY': { 
      keyauthApp: 'SJTweaks Zero Delay', 
      expiry: 0,
      level: 1,
      mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
    },
    'PRODUCT_ID_PING': { 
      keyauthApp: 'SJ Tweaks Ping Optimizer', 
      expiry: 0,
      level: 1,
      mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
    }
  }
};

// ============================================
// EMAIL TRANSPORTER
// ============================================
const transporter = nodemailer.createTransport({
  host: CONFIG.EMAIL_HOST,
  port: CONFIG.EMAIL_PORT,
  secure: false,
  auth: {
    user: CONFIG.EMAIL_USER,
    pass: CONFIG.EMAIL_PASS
  }
});

// ============================================
// KEYAUTH API - GENERATE LICENSE KEY
// ============================================
async function generateKeyAuthLicense(productConfig) {
  try {
    // KeyAuth Seller API endpoint
    const url = 'https://keyauth.win/api/seller/';
    
    // Generate a unique key with the mask format
    const params = new URLSearchParams({
      sellerkey: CONFIG.KEYAUTH_SELLER_KEY,
      type: 'add',
      format: 'json',
      expiry: productConfig.expiry.toString(),
      mask: productConfig.mask,
      level: productConfig.level.toString(),
      amount: '1',
      owner: CONFIG.KEYAUTH_APP_NAME
    });

    const response = await axios.get(`${url}?${params.toString()}`);
    
    if (response.data.success) {
      // Key is returned in response.data.key or response.data.keys[0]
      const key = response.data.key || (response.data.keys && response.data.keys[0]);
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

// ============================================
// SEND LICENSE EMAIL
// ============================================
async function sendLicenseEmail(email, customerName, licenseKey, productName) {
  const mailOptions = {
    from: CONFIG.EMAIL_FROM,
    to: email,
    subject: `🎮 Your ${productName} License Key`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #fff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a 0%, #1a1a2e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a3e; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo img { width: 80px; height: 80px; }
          h1 { color: #00aeff; text-align: center; margin-bottom: 10px; font-size: 28px; }
          .subtitle { color: #888; text-align: center; margin-bottom: 30px; }
          .license-box { background: #0a0a12; border: 2px solid #00aeff; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
          .license-label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
          .license-key { font-family: 'Consolas', monospace; font-size: 24px; color: #00aeff; letter-spacing: 2px; word-break: break-all; }
          .instructions { background: #1a1a2e; border-radius: 8px; padding: 20px; margin-top: 30px; }
          .instructions h3 { color: #00aeff; margin-top: 0; }
          .instructions ol { color: #ccc; line-height: 1.8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .button { display: inline-block; background: linear-gradient(135deg, #00aeff 0%, #0080cc 100%); color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://i.imgur.com/MBCguvv.png" alt="SJTweaks">
          </div>
          <h1>Thank You for Your Purchase! 🎉</h1>
          <p class="subtitle">Hello ${customerName || 'Gamer'},</p>
          
          <p style="color: #ccc; text-align: center;">Your license key for <strong style="color: #00aeff;">${productName}</strong> is ready!</p>
          
          <div class="license-box">
            <div class="license-label">Your License Key</div>
            <div class="license-key">${licenseKey}</div>
          </div>
          
          <div class="instructions">
            <h3>📋 How to Activate</h3>
            <ol>
              <li>Download and install ${productName}</li>
              <li>Launch the application</li>
              <li>Enter your license key when prompted</li>
              <li>Click "Activate License"</li>
              <li>Enjoy your optimized gaming experience!</li>
            </ol>
          </div>
          
          <p style="color: #888; text-align: center; margin-top: 30px;">
            <strong>⚠️ Important:</strong> Keep this email safe. Your license key is unique and tied to your purchase.
          </p>
          
          <div class="footer">
            <p>Need help? Reply to this email for support.</p>
            <p>© ${new Date().getFullYear()} SJTweaks. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
}

// ============================================
// PAYHIP WEBHOOK ENDPOINT
// ============================================
app.post('/webhook/payhip', async (req, res) => {
  console.log('\n📦 Received Payhip webhook:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    // Payhip sends these fields in the webhook
    const {
      product_id,
      product_name,
      buyer_email,
      buyer_name,
      sale_id,
      sale_timestamp,
      product_price
    } = req.body;

    // Validate required fields
    if (!buyer_email || !product_id) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n🛒 New sale: ${product_name}`);
    console.log(`👤 Buyer: ${buyer_name} (${buyer_email})`);
    console.log(`💰 Price: $${product_price}`);

    // Find product configuration
    let productConfig = CONFIG.PRODUCTS[product_id];
    
    // If no exact match, try to find by checking if product_id contains any key
    if (!productConfig) {
      for (const [key, config] of Object.entries(CONFIG.PRODUCTS)) {
        if (product_id.includes(key) || product_name.toLowerCase().includes(key.toLowerCase())) {
          productConfig = config;
          break;
        }
      }
    }

    // Default to Premium Utility if no match found
    if (!productConfig) {
      console.log('⚠️ Product not mapped, using default (Premium Utility)');
      productConfig = CONFIG.PRODUCTS['PRODUCT_ID_PREMIUM'] || {
        keyauthApp: 'SJTweaks Premium Utility',
        expiry: 0,
        level: 1,
        mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
      };
    }

    // Generate KeyAuth license
    const licenseKey = await generateKeyAuthLicense(productConfig);
    
    if (!licenseKey) {
      console.error('❌ Failed to generate license key');
      return res.status(500).json({ error: 'Failed to generate license key' });
    }

    // Send email with license key
    const emailSent = await sendLicenseEmail(
      buyer_email,
      buyer_name,
      licenseKey,
      product_name || productConfig.keyauthApp
    );

    if (!emailSent) {
      console.error('❌ Failed to send email');
      // Still return success since key was generated
    }

    console.log('✅ Webhook processed successfully!\n');
    res.status(200).json({ 
      success: true, 
      message: 'License key generated and email sent',
      key: licenseKey // Remove this in production for security
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TEST ENDPOINT
// ============================================
app.get('/test', async (req, res) => {
  res.json({ 
    status: 'Server is running!',
    time: new Date().toISOString(),
    config: {
      emailConfigured: !!CONFIG.EMAIL_USER && CONFIG.EMAIL_USER !== 'your-email@gmail.com',
      keyauthConfigured: !!CONFIG.KEYAUTH_SELLER_KEY && CONFIG.KEYAUTH_SELLER_KEY !== 'YOUR_SELLER_KEY_HERE'
    }
  });
});

// Test key generation endpoint
app.get('/test/generate', async (req, res) => {
  const productConfig = {
    keyauthApp: 'SJTweaks Premium Utility',
    expiry: 0,
    level: 1,
    mask: 'XXXXX-XXXXX-XXXXX-XXXXX'
  };
  
  const key = await generateKeyAuthLicense(productConfig);
  res.json({ success: !!key, key });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║         SJTweaks License Webhook Server                ║
╠════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                        ║
║  📍 Webhook URL: http://localhost:${PORT}/webhook/payhip   ║
║  🧪 Test URL: http://localhost:${PORT}/test                ║
╚════════════════════════════════════════════════════════╝

📋 Setup Checklist:
  ${CONFIG.KEYAUTH_SELLER_KEY !== 'YOUR_SELLER_KEY_HERE' ? '✅' : '❌'} KeyAuth Seller Key configured
  ${CONFIG.EMAIL_USER !== 'your-email@gmail.com' ? '✅' : '❌'} Email configured
  
🔗 Add this webhook URL to Payhip:
   https://your-domain.com/webhook/payhip
  `);
});

