require('dotenv').config();
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for admin panel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Default Owner ID (same for all apps)
  KEYAUTH_OWNER_ID: 'PW4I9Xr6uj',
  
  // ============================================
  // KEYAUTH SELLER KEYS - ONE PER APPLICATION
  // ============================================
  KEYAUTH_SELLER_KEYS: {
    'SJTweaks Zero Delay': 'd0bb617b0aa78707b268f8bcee9342e1',
    'SJTweaks Zero Delay Plus': 'b72956aca77724e87c6984e90148bbfb',
    'SJTweaks FPS Boost': '2c0389f365844ec214113404e70cd187',
    'SJ Tweaks Ping Optimizer': '589f61c9d36cf6cad25a70b4075b4168',
    'SJTweaks Premium Utility': '7ca79466ef4f6b7533a645703827ec59',
    'SJTweaks Aim Bundle': 'ac48c7ba9b7b8ca80ce459872beb75c4',
    'SJTweaks Shotgun Pack': '1cabbf0a85365846c8db08a3865a2aa8',
    'SJTweaks Keyboard Macro': 'aa60a95bb0a0aa74ab08ffa78d2b4143'
  },
  
  // Payhip webhook secret (optional)
  PAYHIP_SECRET: process.env.PAYHIP_SECRET || '',
  
  // Email configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'kickinitzwithadah@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'culbhumkmigyirpz',
  EMAIL_FROM: process.env.EMAIL_FROM || 'SJTweaks <kickinitzwithadah@gmail.com>',
  
  // Admin key for API access
  ADMIN_KEY: process.env.ADMIN_KEY || 'sjtweaks_admin_2024',
  
  // ============================================
  // KEYAUTH APPLICATIONS (without Controller Macro)
  // ============================================
  KEYAUTH_APPS: {
    'ping-optimizer': { name: 'SJ Tweaks Ping Optimizer', version: '1.0' },
    'aim-bundle': { name: 'SJTweaks Aim Bundle', version: '1.0' },
    'fps-boost': { name: 'SJTweaks FPS Boost', version: '1.0' },
    'keyboard-macro': { name: 'SJTweaks Keyboard Macro', version: '1.0' },
    'premium-utility': { name: 'SJTweaks Premium Utility', version: '1.0' },
    'shotgun-pack': { name: 'SJTweaks Shotgun Pack', version: '1.0' },
    'zero-delay': { name: 'SJTweaks Zero Delay', version: '1.0' },
    'zero-delay-plus': { name: 'SJTweaks Zero Delay Plus', version: '1.0' }
  },

  // ============================================
  // PRODUCTS THAT DO NOT REQUIRE LICENSE KEYS
  // ============================================
  NO_LICENSE_PRODUCTS: [
    '0S1TA',  // PlayStation Zero Delay
    'TJEjb',  // SJ Macro (Controller)
    '1uqb8',  // Pickup Macro
  ],
  
  // ============================================
  // PRODUCT MAPPING - Payhip to KeyAuth
  // ============================================
  PRODUCTS: {
    // === PC OPTIMIZERS ===
    'dFECZ': { 
      keyauthApp: 'SJTweaks Zero Delay',
      productName: 'Zero Delay (Quantum Delay Engine)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },
    '2JIih': { 
      keyauthApp: 'SJTweaks FPS Boost',
      productName: 'FPS Boost (Dynamic Frame Stabilizer)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },
    'hfciP': { 
      keyauthApp: 'SJ Tweaks Ping Optimizer',
      productName: 'Ping Optimization (Quantum Ping Optimizer)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },
    '4DI0X': { 
      keyauthApp: 'SJTweaks Zero Delay Plus',
      productName: 'Zero Delay Plus (Ultimate PC Latency & FPS Optimizer)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },
    '9UZh8': { 
      keyauthApp: 'SJTweaks Premium Utility',
      productName: 'Premium Utility (ALL IN ONE TWEAKING PACK)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },

    // === AIM PRODUCTS ===
    'SHOTGUN_KEY': { 
      keyauthApp: 'SJTweaks Shotgun Pack',
      productName: 'Shotgun Pack (Aim Enhancer)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },
    'AIMBUNDLE_KEY': { 
      keyauthApp: 'SJTweaks Aim Bundle',
      productName: 'Aim Bundle',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },

    // === KEYBOARD MACRO ===
    'KEYBOARD_MACRO_KEY': { 
      keyauthApp: 'SJTweaks Keyboard Macro',
      productName: 'SJ Macro (Keyboard)',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    },

    // === TESTING ===
    '1LPB0': { 
      keyauthApp: 'SJTweaks Premium Utility',
      productName: 'Testing Product',
      expiry: 0,
      level: 1,
      mask: '******-******-******-******'
    }
  }
};

// Orders storage
let orders = [];
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Load existing orders
try {
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  }
} catch (e) {
  console.log('No existing orders file');
}

function saveOrders() {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

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
// Uses the CORRECT seller key for each application
// ============================================
async function generateKeyAuthLicense(productConfig) {
  try {
    const url = 'https://keyauth.win/api/seller/';
    
    // GET THE CORRECT SELLER KEY FOR THIS APPLICATION
    const sellerKey = CONFIG.KEYAUTH_SELLER_KEYS[productConfig.keyauthApp];
    
    if (!sellerKey) {
      console.error(`❌ No seller key found for app: ${productConfig.keyauthApp}`);
      return null;
    }
    
    console.log(`🔑 Using seller key for: ${productConfig.keyauthApp}`);
    
    const params = new URLSearchParams({
      sellerkey: sellerKey,
      type: 'add',
      format: 'json',
      expiry: productConfig.expiry.toString(),
      mask: productConfig.mask,
      level: productConfig.level.toString(),
      amount: '1',
      note: productConfig.productName || productConfig.keyauthApp
    });

    const response = await axios.get(`${url}?${params.toString()}`);
    
    if (response.data.success) {
      const key = response.data.key || (response.data.keys && response.data.keys[0]);
      console.log(`✅ Generated KeyAuth license for ${productConfig.keyauthApp}: ${key}`);
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
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://discord.gg/cJafcE7y5W" class="button">Join Discord Support</a>
          </div>
          
          <div class="footer">
            <p>Need help? Join our Discord for support.</p>
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
// SEND THANK YOU EMAIL (No License)
// ============================================
async function sendThankYouEmail(email, customerName, productName) {
  const mailOptions = {
    from: CONFIG.EMAIL_FROM,
    to: email,
    subject: `🎮 Thank You for Purchasing ${productName}!`,
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
          .info-box { background: #0a0a12; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
          .info-text { color: #10b981; font-size: 18px; font-weight: 600; }
          .instructions { background: #1a1a2e; border-radius: 8px; padding: 20px; margin-top: 30px; }
          .instructions h3 { color: #00aeff; margin-top: 0; }
          .instructions p { color: #ccc; line-height: 1.8; }
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
          
          <div class="info-box">
            <div class="info-text">✅ Your purchase of ${productName} is complete!</div>
          </div>
          
          <div class="instructions">
            <h3>📥 Download Your Product</h3>
            <p>Your download should be available on the Payhip order page. Simply click the download button to get your files.</p>
            <p>This product does not require a license key - just download and enjoy!</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://discord.gg/cJafcE7y5W" class="button">Join Discord Support</a>
          </div>
          
          <div class="footer">
            <p>Need help? Join our Discord for support.</p>
            <p>© ${new Date().getFullYear()} SJTweaks. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Thank you email sent to:', email);
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
    const buyer_email = req.body.email;
    const items = req.body.items || [];
    const firstItem = items[0] || {};
    const order_id = req.body.order_id || req.body.sale_id || `ORD-${Date.now()}`;
    
    const product_key = firstItem.product_key;
    const product_id = firstItem.product_id;
    const product_name = firstItem.product_name;
    const price = req.body.price || firstItem.price;

    if (!buyer_email) {
      console.error('❌ Missing email');
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!product_key && !product_id) {
      console.error('❌ Missing product info');
      return res.status(400).json({ error: 'Missing product info' });
    }

    console.log(`\n🛒 New sale: ${product_name}`);
    console.log(`👤 Buyer: ${buyer_email}`);
    console.log(`🔑 Product Key: ${product_key}`);
    console.log(`💰 Price: $${price}`);

    // Check if product requires license key
    const requiresLicense = !CONFIG.NO_LICENSE_PRODUCTS.includes(product_key);
    
    if (!requiresLicense) {
      console.log('📋 This product does NOT require a license key');
      
      const emailSent = await sendThankYouEmail(
        buyer_email,
        buyer_email.split('@')[0],
        product_name
      );

      const orderRecord = {
        date: new Date().toISOString(),
        order_id,
        email: buyer_email,
        product: product_name,
        product_key,
        price,
        license_key: null,
        requires_license: false,
        email_sent: emailSent
      };
      orders.unshift(orderRecord);
      saveOrders();

      console.log('✅ Webhook processed (no license needed)!\n');
      return res.status(200).json({ 
        success: true, 
        message: 'Order processed - no license key required',
        requires_license: false
      });
    }

    console.log('🔐 This product REQUIRES a license key');

    // Find product configuration
    let productConfig = CONFIG.PRODUCTS[product_key] || CONFIG.PRODUCTS[product_id];
    
    if (!productConfig) {
      for (const [key, config] of Object.entries(CONFIG.PRODUCTS)) {
        if (product_key === key || product_id === key || 
            (product_name && product_name.toLowerCase().includes(key.toLowerCase()))) {
          productConfig = config;
          break;
        }
      }
    }

    // Default to Premium Utility if no match
    if (!productConfig) {
      console.log('⚠️ Product not mapped, using default (Premium Utility)');
      productConfig = {
        keyauthApp: 'SJTweaks Premium Utility',
        productName: product_name || 'SJTweaks Product',
        expiry: 0,
        level: 1,
        mask: '******-******-******-******'
      };
    }

    // Generate KeyAuth license using the CORRECT seller key
    const licenseKey = await generateKeyAuthLicense(productConfig);
    
    if (!licenseKey) {
      console.error('❌ Failed to generate license key');
      
      const orderRecord = {
        date: new Date().toISOString(),
        order_id,
        email: buyer_email,
        product: product_name,
        product_key,
        price,
        license_key: null,
        keyauth_app: productConfig.keyauthApp,
        requires_license: true,
        license_generated: false,
        email_sent: false,
        error: 'Failed to generate license key'
      };
      orders.unshift(orderRecord);
      saveOrders();
      
      return res.status(500).json({ error: 'Failed to generate license key' });
    }

    // Send email with license key
    const emailSent = await sendLicenseEmail(
      buyer_email,
      buyer_email.split('@')[0],
      licenseKey,
      productConfig.productName || product_name
    );

    // Save order
    const orderRecord = {
      date: new Date().toISOString(),
      order_id,
      email: buyer_email,
      product: product_name,
      product_key,
      price,
      license_key: licenseKey,
      keyauth_app: productConfig.keyauthApp,
      requires_license: true,
      license_generated: true,
      email_sent: emailSent
    };
    orders.unshift(orderRecord);
    saveOrders();

    console.log('✅ Webhook processed successfully!\n');
    res.status(200).json({ 
      success: true, 
      message: 'License key generated and email sent',
      requires_license: true,
      keyauth_app: productConfig.keyauthApp
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

app.get('/api/orders', (req, res) => {
  const authKey = req.headers.authorization;
  if (authKey !== CONFIG.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ success: true, orders });
});

app.get('/api/stats', (req, res) => {
  const authKey = req.headers.authorization;
  if (authKey !== CONFIG.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const stats = {
    totalOrders: orders.length,
    ordersWithLicense: orders.filter(o => o.requires_license && o.license_generated).length,
    ordersWithoutLicense: orders.filter(o => !o.requires_license).length,
    emailsSent: orders.filter(o => o.email_sent).length,
    emailsFailed: orders.filter(o => !o.email_sent).length
  };
  
  res.json({ success: true, stats });
});

// ============================================
// TEST ENDPOINTS
// ============================================
app.get('/test', async (req, res) => {
  res.json({ 
    status: 'Server is running!',
    time: new Date().toISOString(),
    config: {
      emailConfigured: !!CONFIG.EMAIL_USER,
      appsConfigured: Object.keys(CONFIG.KEYAUTH_SELLER_KEYS).length,
      productsConfigured: Object.keys(CONFIG.PRODUCTS).length,
      noLicenseProducts: CONFIG.NO_LICENSE_PRODUCTS.length
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║            SJTweaks License Webhook Server v2.1              ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                              ║
║  📍 Webhook URL: /webhook/payhip                             ║
║  🧪 Test URL: /test                                          ║
╚══════════════════════════════════════════════════════════════╝

📱 KeyAuth Applications with Seller Keys:
  ✅ SJTweaks Zero Delay
  ✅ SJTweaks Zero Delay Plus
  ✅ SJTweaks FPS Boost
  ✅ SJ Tweaks Ping Optimizer
  ✅ SJTweaks Premium Utility
  ✅ SJTweaks Aim Bundle
  ✅ SJTweaks Shotgun Pack
  ✅ SJTweaks Keyboard Macro

🔒 Products WITHOUT license keys:
  • PlayStation Zero Delay (0S1TA)
  • SJ Macro Controller (TJEjb)
  • Pickup Macro (1uqb8)
  `);
});
