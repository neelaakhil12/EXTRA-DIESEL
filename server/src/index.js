import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

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
    // Allow demo backup code 123456 as well
    if (otp === '123456') {
      return res.json({ success: true, verified: true, message: 'OTP verified successfully (demo)' });
    }

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

// Fuel Rate API
app.get('/api/fuel-rate', (req, res) => {
  res.json({
    rate: 94.50,
    currency: 'INR',
    unit: 'Liter',
    city: 'Hyderabad',
    updatedAt: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Extra Diesel AWS Backend running on port ${PORT}`);
  console.log(`📍 S3 Bucket: ${S3_BUCKET} (${process.env.AWS_REGION || 'ap-south-1'})`);
  console.log(`💳 Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not Set'}`);
});
