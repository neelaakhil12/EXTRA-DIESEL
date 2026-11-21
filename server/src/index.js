import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Helper to load persistent users from disk
function loadUsers() {
  const map = new Map([
    [
      'aadhyafuels9@gmail.com',
      {
        name: 'Aadhya Fuels',
        email: 'aadhyafuels9@gmail.com',
        phone: '+91 9876543210',
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const list = JSON.parse(data);
      list.forEach(u => {
        if (u && u.email) {
          map.set(u.email.toLowerCase().trim(), u);
        }
      });
    }
  } catch (e) {
    console.error('Error reading users.json:', e);
  }
  return map;
}

function saveUsers(map) {
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing users.json:', e);
  }
}

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading orders.json:', e);
  }
  return [];
}

function saveOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing orders.json:', e);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend domains
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 1. AWS S3 Client Configuration (using provided IAM User or EC2 Role)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'extra-diesel-storage-2094';

// Multer memory storage for in-memory file streaming to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB limit
});

// 2. Razorpay Client Initialization
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_U0oP5sFk81MJMT',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'Sw1OWQ5NAUFIIzoIMKZf2NgQ'
});

// 3. Nodemailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER || 'Aadhyafuels9@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'iqhnztorwddnpapl',
  },
});

// In-memory OTP Store: email -> { otp, expiresAt }
const otpStore = new Map();

// Persistent Registered Users Store (Loaded from users.json)
const registeredUsers = loadUsers();

// --- API ROUTES ---

// Auth 1: Send Email Verification OTP via SMTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    otpStore.set(email.toLowerCase().trim(), { otp, expiresAt });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Extra Diesel" <Aadhyafuels9@gmail.com>',
      to: email,
      subject: `${otp} is your Extra Diesel Verification Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #D50000; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px;">EXTRA <span style="color: #FFB300;">DIESEL</span></h1>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Reliable Diesel Right To Your Site</p>
          </div>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 10px 0;">Your email verification code for account creation is:</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #D50000; padding: 10px 0;">${otp}</div>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">Valid for 10 minutes. Please do not share this code with anyone.</p>
          </div>
          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            <p style="color: #64748b; font-size: 11px; margin: 0;">PESO-Certified On-Demand Doorstep Diesel Delivery</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] OTP sent successfully to ${email}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${email}`,
      expiresInMinutes: 10
    });
  } catch (error) {
    console.error('[SMTP Error] Failed to send email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email. Please check SMTP settings.',
      details: error.message
    });
  }
});

// Auth 2: Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(key);
    if (!stored) {
      return res.status(400).json({ success: false, error: 'No OTP found for this email. Please click Send OTP.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP. Please enter the correct 6-digit code.' });
    }

    // OTP is valid
    otpStore.delete(key);
    res.json({ success: true, verified: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed', details: error.message });
  }
});

// Auth 3: Register New User Account (Persisted to disk)
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const key = email.toLowerCase().trim();
    const user = {
      name: name.trim(),
      email: key,
      phone: phone || '',
      password: password || '',
      createdAt: new Date().toISOString(),
    };

    registeredUsers.set(key, user);
    saveUsers(registeredUsers);
    console.log(`[Auth] Registered and persisted new account: ${user.name} (${user.email})`);

    res.json({
      success: true,
      message: 'Account created successfully',
      user: { name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to register account', details: error.message });
  }
});

// Auth 4: Native Google Auth - If user exists, log in; if not, AUTO-REGISTER with Google profile immediately!
app.post('/api/auth/google-auth', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    const key = email.toLowerCase().trim();
    let existingUser = registeredUsers.get(key);

    if (!existingUser) {
      // User is logging in with Google for the first time -> Auto-register in database!
      existingUser = {
        name: (name && name.trim()) || key.split('@')[0],
        email: key,
        phone: '',
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(key, existingUser);
      saveUsers(registeredUsers);
      console.log(`[Google Auth] Auto-registered and persisted new user: ${existingUser.name} (${existingUser.email})`);
    } else {
      console.log(`[Google Auth] Existing user authenticated: ${existingUser.name} (${existingUser.email})`);
    }

    return res.json({
      success: true,
      registered: true,
      message: 'Google authentication successful',
      user: {
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Google authentication check failed', details: error.message });
  }
});

// Orders API: Get orders (filtered by email if provided)
app.get('/api/orders', (req, res) => {
  try {
    const { email } = req.query;
    const allOrders = loadOrders();
    if (email) {
      const userOrders = allOrders.filter(o => o.email && o.email.toLowerCase().trim() === email.toLowerCase().trim());
      return res.json({ success: true, orders: userOrders });
    }
    res.json({ success: true, orders: allOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Orders API: Create new order (Persisted to disk)
app.post('/api/orders', (req, res) => {
  try {
    const { id, email, name, liters, total, address, status, statusText } = req.body;
    const newOrder = {
      id: id || `ED${Date.now().toString().slice(-8)}`,
      email: email ? email.toLowerCase().trim() : '',
      name: name || '',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      liters: Number(liters) || 200,
      total: Number(total) || 19845.00,
      status: status || 'out_for_delivery',
      statusText: statusText || 'Out for Delivery',
      address: address || 'Plot 42, Hitech City, Hyderabad',
      createdAt: new Date().toISOString(),
    };

    const allOrders = loadOrders();
    allOrders.unshift(newOrder); // newest first
    saveOrders(allOrders);

    console.log(`[Orders] Created order #${newOrder.id} for ${newOrder.liters}L (${newOrder.email})`);
    res.json({ success: true, order: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create order', details: error.message });
  }
});

// Auth 5: Standard Email & Password Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const key = email.toLowerCase().trim();
    const user = registeredUsers.get(key);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Account not found. Please sign up first.',
      });
    }

    if (user.password && user.password !== password) {
      return res.status(400).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: { name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed', details: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Extra Diesel AWS EC2 Backend',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: S3_BUCKET,
    razorpayConfigured: !!process.env.RAZORPAY_KEY_ID,
    timestamp: new Date().toISOString()
  });
});

// Razorpay 1: Create Order Endpoint
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // amount in paise
      currency: 'INR',
      receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_U0oP5sFk81MJMT'
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order', details: error.message });
  }
});

// Razorpay 2: Verify Payment Signature
app.post('/api/payment/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'Sw1OWQ5NAUFIIzoIMKZf2NgQ';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Razorpay Verification Error:', error);
    res.status(500).json({ error: 'Payment verification failed', details: error.message });
  }
});

// S3 Upload Endpoint (Invoices, Receipts & KYB Documents)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = `uploads/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await s3Client.send(putCommand);

    const fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileKey}`;

    res.json({
      success: true,
      fileKey,
      fileUrl
    });
  } catch (error) {
    console.error('S3 Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document to AWS S3', details: error.message });
  }
});

// S3 Presigned URL Download Endpoint
app.get('/api/files/signed-url', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Missing file key' });

    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    res.json({ signedUrl });
  } catch (error) {
    console.error('Presigned URL Error:', error);
    res.status(500).json({ error: 'Could not generate signed URL' });
  }
});

// In-memory Dynamic Fuel Rate (BS-VI High Speed Diesel)
let currentFuelRate = {
  rate: 94.50,
  currency: 'INR',
  unit: 'Liter',
  fuelType: 'BS-VI High Speed Diesel',
  city: 'Hyderabad',
  updatedAt: new Date().toISOString(),
};

// 1. Get Live Fuel Rate API
app.get('/api/fuel-rate', (req, res) => {
  res.json({
    success: true,
    rate: currentFuelRate.rate,
    formattedRate: `₹${currentFuelRate.rate.toFixed(2)}`,
    currency: currentFuelRate.currency,
    unit: currentFuelRate.unit,
    fuelType: currentFuelRate.fuelType,
    city: currentFuelRate.city,
    updatedAt: currentFuelRate.updatedAt,
  });
});

// 2. Admin / Daily Update Fuel Rate API (Increases or Decreases price)
app.post('/api/fuel-rate', (req, res) => {
  try {
    const { rate, city } = req.body;
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
      return res.status(400).json({ success: false, error: 'A valid positive diesel rate is required' });
    }

    const previousRate = currentFuelRate.rate;
    currentFuelRate.rate = parseFloat(Number(rate).toFixed(2));
    if (city) currentFuelRate.city = city;
    currentFuelRate.updatedAt = new Date().toISOString();

    const change = currentFuelRate.rate - previousRate;
    const changeText = change === 0 ? 'unchanged' : change > 0 ? `increased by ₹${change.toFixed(2)}` : `decreased by ₹${Math.abs(change).toFixed(2)}`;

    console.log(`[Fuel Rate] Updated: ₹${currentFuelRate.rate}/L (${changeText}) for ${currentFuelRate.city}`);

    res.json({
      success: true,
      message: `Diesel price updated successfully (${changeText})`,
      rate: currentFuelRate.rate,
      formattedRate: `₹${currentFuelRate.rate.toFixed(2)}`,
      previousRate,
      changeText,
      updatedAt: currentFuelRate.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update fuel rate', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Extra Diesel AWS Backend running on port ${PORT}`);
  console.log(`📍 S3 Bucket: ${S3_BUCKET} (${process.env.AWS_REGION || 'ap-south-1'})`);
  console.log(`💳 Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not Set'}`);
});
