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
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Default Global Settings (Diesel Price & Delivery Tier Charges)
const DEFAULT_SETTINGS = {
  dieselRate: 94.50,
  currency: 'INR',
  unit: 'Liter',
  fuelType: 'BS-VI High Speed Diesel',
  city: 'Hyderabad',
  tier1MaxLiters: 500,           // 0 to 500 Liters
  deliveryChargeUpTo500: 350,    // Delivery charge for 0 - 500 Liters (₹)
  deliveryChargeAbove500: 0,     // Delivery charge above 500 Liters (0 = FREE)
  taxRatePercent: 5,             // 5% GST on fuel delivery
  supportHotline: {
    tollFree: '1800-DIESEL-EX (1800-343-7353)',
    phone: '+91 9989551305',
    email: 'support@extradiesel.in',
    whatsapp: '+91 9989551305',
    deskStatus: 'Bowser Dispatch Desk: Live & Active',
  },
  pesoCompliance: {
    licenseNo: 'PESO/HYD/2026/DL-4910',
    legalMetrology: 'W&M Certified Flow Meter (±0.1%)',
    calibrationValidity: 'Valid through Dec 31, 2027',
    safetyEquipment: 'Static Earthing & Class-B Flameproof',
    automatedReceipts: 'Tamper-Proof Dispenser Integrated Printout',
  },
  b2bCreditLimit: 500000,
  b2bCreditTerms: 'Net-30 Days Interest Free',
  b2bBillingCycle: '1st – 30th of every month',
  vehicleImages: [
    'https://extradiesel.in/assets/images/vehicle-bowser-1.jpeg',
    'https://extradiesel.in/assets/images/vehicle-bowser-2.jpeg',
  ],
  updatedAt: new Date().toISOString(),
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading settings.json:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing settings.json:', e);
  }
}

let currentSettings = loadSettings();

// Default admin accounts (credentials for admin login)
const DEFAULT_ACCOUNTS = [
  {
    name: 'Aadhya Fuels Admin',
    email: 'aadhyafuels9@gmail.com',
    phone: '+91 9876543210',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

// Helper to load persistent users from disk
function loadUsers() {
  const map = new Map();

  // Populate defaults
  DEFAULT_ACCOUNTS.forEach(acc => {
    map.set(acc.email.toLowerCase().trim(), { ...acc });
  });

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const list = JSON.parse(data);
      list.forEach(u => {
        if (u && u.email) {
          const key = u.email.toLowerCase().trim();
          const existing = map.get(key) || {};
          // Preserve role if defined in default accounts or existing user
          map.set(key, { ...existing, ...u });
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
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list;
      }
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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 1. AWS S3 Client Configuration
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
  secure: false,
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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Extra Diesel AWS EC2 Backend',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: S3_BUCKET,
    razorpayConfigured: !!process.env.RAZORPAY_KEY_ID,
    currentRate: currentSettings.dieselRate,
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------------------
// GLOBAL SETTINGS & DAILY DIESEL PRICE APIS
// -------------------------------------------------------------------------

// 1. Get Global Settings (Live Diesel Rate, Delivery Charges 0-500L & 500L+)
app.get('/api/settings', (req, res) => {
  currentSettings = loadSettings();
  res.json({
    success: true,
    settings: currentSettings,
  });
});

// 2. Admin Update Global Settings
app.post('/api/settings', (req, res) => {
  try {
    const {
      dieselRate,
      city,
      deliveryChargeUpTo500,
      deliveryChargeAbove500,
      tier1MaxLiters,
      taxRatePercent,
      supportHotline,
      pesoCompliance,
      b2bCreditLimit,
      b2bCreditTerms,
      b2bBillingCycle,
      vehicleImages,
    } = req.body;

    currentSettings = loadSettings();

    if (dieselRate !== undefined && !isNaN(Number(dieselRate)) && Number(dieselRate) > 0) {
      currentSettings.dieselRate = parseFloat(Number(dieselRate).toFixed(2));
    }
    if (city) currentSettings.city = city.trim();
    if (deliveryChargeUpTo500 !== undefined && !isNaN(Number(deliveryChargeUpTo500))) {
      currentSettings.deliveryChargeUpTo500 = Number(deliveryChargeUpTo500);
    }
    if (deliveryChargeAbove500 !== undefined && !isNaN(Number(deliveryChargeAbove500))) {
      currentSettings.deliveryChargeAbove500 = Number(deliveryChargeAbove500);
    }
    if (tier1MaxLiters !== undefined && !isNaN(Number(tier1MaxLiters))) {
      currentSettings.tier1MaxLiters = Number(tier1MaxLiters);
    }
    if (taxRatePercent !== undefined && !isNaN(Number(taxRatePercent))) {
      currentSettings.taxRatePercent = Number(taxRatePercent);
    }
    if (b2bCreditLimit !== undefined && !isNaN(Number(b2bCreditLimit))) {
      currentSettings.b2bCreditLimit = Number(b2bCreditLimit);
    }
    if (b2bCreditTerms) currentSettings.b2bCreditTerms = b2bCreditTerms.trim();
    if (b2bBillingCycle) currentSettings.b2bBillingCycle = b2bBillingCycle.trim();
    if (supportHotline && typeof supportHotline === 'object') {
      currentSettings.supportHotline = {
        ...currentSettings.supportHotline,
        ...supportHotline
      };
    }
    if (pesoCompliance && typeof pesoCompliance === 'object') {
      currentSettings.pesoCompliance = {
        ...currentSettings.pesoCompliance,
        ...pesoCompliance
      };
    }
    if (vehicleImages && Array.isArray(vehicleImages)) {
      currentSettings.vehicleImages = vehicleImages.filter(Boolean);
    }

    currentSettings.updatedAt = new Date().toISOString();
    saveSettings(currentSettings);

    console.log(`[Settings Updated] Diesel: ₹${currentSettings.dieselRate}/L | Delivery 0-500L: ₹${currentSettings.deliveryChargeUpTo500} | Above 500L: ₹${currentSettings.deliveryChargeAbove500}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: currentSettings,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings', details: error.message });
  }
});

// 3. Location Reverse-Geocoding (Mapbox Geocoding API with OSM Nominatim fallback for pinpoint accuracy)
app.get('/api/location/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    }

    const latFloat = parseFloat(lat);
    const lonFloat = parseFloat(lon);

    // Primary: Mapbox Places API (Accurate down to rooftop/street level across India)
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    try {
      const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lonFloat},${latFloat}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,locality,place,postcode`;
      const mbRes = await fetch(mbUrl);
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        if (mbData.features && mbData.features.length > 0) {
          const feat = mbData.features[0];
          const ctx = feat.context || [];

          let plotNo = feat.address || '';
          let street = feat.text || '';
          let landmark = '';
          let area = '';
          let city = 'Hyderabad';
          let state = 'Telangana';
          let pincode = '';

          ctx.forEach(c => {
            if (c.id.startsWith('postcode')) pincode = c.text;
            else if (c.id.startsWith('neighborhood') || c.id.startsWith('locality')) area = c.text;
            else if (c.id.startsWith('place')) city = c.text;
            else if (c.id.startsWith('region')) state = c.text;
          });

          // If the feature is a POI or establishment, use it as landmark / plot
          if (feat.place_type && feat.place_type.includes('poi')) {
            landmark = feat.text;
          }

          const fullAddress = feat.place_name || [plotNo, street, area, city, pincode].filter(Boolean).join(', ');
          const shortAddress = [street, area || city].filter(Boolean).join(', ') || city;

          return res.json({
            success: true,
            location: {
              lat: latFloat,
              lon: lonFloat,
              plotNo,
              street,
              area: area || city,
              landmark,
              city,
              state,
              pincode,
              fullAddress,
              shortAddress
            }
          });
        }
      }
    } catch (mbErr) {
      console.warn('[Reverse Geocode] Mapbox error, falling back to OSM:', mbErr.message);
    }

    // Secondary: OpenStreetMap Nominatim
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latFloat)}&lon=${encodeURIComponent(lonFloat)}&addressdetails=1`;
      const response = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'ExtraDieselApp/1.0 (contact@extradiesel.in)',
          'Accept-Language': 'en'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const a = data.address || {};

        const plotNo = a.house_number || a.building || '';
        const street = a.road || a.pedestrian || a.street || '';
        const area = a.suburb || a.neighbourhood || a.residential || a.subdistrict || '';
        const city = a.city || a.town || a.county || a.state_district || 'Hyderabad';
        const state = a.state || 'Telangana';
        const pincode = a.postcode || '';
        const landmark = a.amenity || a.commercial || a.office || a.leisure || '';

        const parts = [plotNo, street, area, city, pincode].filter(Boolean);
        const fullAddress = parts.join(', ') || data.display_name || `${city}, ${state}`;

        return res.json({
          success: true,
          location: {
            lat: latFloat,
            lon: lonFloat,
            plotNo,
            street,
            area,
            landmark,
            city,
            state,
            pincode,
            fullAddress,
            shortAddress: [plotNo, street || area].filter(Boolean).join(', ') || area || city
          }
        });
      }
    } catch (osmErr) {
      console.warn('[Reverse Geocode] OSM Nominatim error:', osmErr.message);
    }

    // Fallback using coordinates (Never a hardcoded fake location)
    res.json({
      success: true,
      location: {
        lat: latFloat,
        lon: lonFloat,
        plotNo: '',
        street: `Site Coordinates (${latFloat.toFixed(4)}, ${lonFloat.toFixed(4)})`,
        area: 'Location Detected',
        landmark: '',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '',
        fullAddress: `GPS Location (${latFloat.toFixed(5)}, ${lonFloat.toFixed(5)}), Hyderabad, Telangana`,
        shortAddress: `GPS Site (${latFloat.toFixed(4)}, ${lonFloat.toFixed(4)})`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Reverse geocode failed', details: err.message });
  }
});

// Backward compatible Fuel Rate endpoints
app.get('/api/fuel-rate', (req, res) => {
  currentSettings = loadSettings();
  res.json({
    success: true,
    rate: currentSettings.dieselRate,
    formattedRate: `₹${currentSettings.dieselRate.toFixed(2)}`,
    currency: currentSettings.currency,
    unit: currentSettings.unit,
    fuelType: currentSettings.fuelType,
    city: currentSettings.city,
    updatedAt: currentSettings.updatedAt,
  });
});

app.post('/api/fuel-rate', (req, res) => {
  try {
    const { rate, city } = req.body;
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
      return res.status(400).json({ success: false, error: 'A valid positive diesel rate is required' });
    }

    currentSettings = loadSettings();
    const previousRate = currentSettings.dieselRate;
    currentSettings.dieselRate = parseFloat(Number(rate).toFixed(2));
    if (city) currentSettings.city = city.trim();
    currentSettings.updatedAt = new Date().toISOString();
    saveSettings(currentSettings);

    const change = currentSettings.dieselRate - previousRate;
    const changeText = change === 0 ? 'unchanged' : change > 0 ? `increased by ₹${change.toFixed(2)}` : `decreased by ₹${Math.abs(change).toFixed(2)}`;

    console.log(`[Fuel Rate] Daily rate updated to ₹${currentSettings.dieselRate}/L (${changeText})`);

    res.json({
      success: true,
      message: `Diesel price updated successfully (${changeText})`,
      rate: currentSettings.dieselRate,
      formattedRate: `₹${currentSettings.dieselRate.toFixed(2)}`,
      previousRate,
      changeText,
      updatedAt: currentSettings.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update fuel rate', details: error.message });
  }
});

// -------------------------------------------------------------------------
// AUTHENTICATION & USERS APIS
// -------------------------------------------------------------------------

// Auth 1: Send Email Verification OTP via SMTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
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

    otpStore.delete(key);
    res.json({ success: true, verified: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed', details: error.message });
  }
});

// Auth 3: Register New User Account
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const key = email.toLowerCase().trim();
    const isAdminEmail = ['aadhyafuels9@gmail.com'].includes(key);

    const user = {
      name: name.trim(),
      email: key,
      phone: phone || '',
      password: password || '',
      role: isAdminEmail ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
    };

    registeredUsers.set(key, user);
    saveUsers(registeredUsers);
    console.log(`[Auth] Registered: ${user.name} (${user.email}) - Role: ${user.role}`);

    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to register account', details: error.message });
  }
});

// Auth 4: Unified Email & Password Login (Supports Admin, Delivery Boy, and Customer)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const key = email.toLowerCase().trim();
    let user = registeredUsers.get(key);

    const adminEmails = ['aadhyafuels9@gmail.com'];

    if (!user) {
      // If logging in as admin with default admin password
      if (adminEmails.includes(key) && password === 'admin123') {
        user = {
          name: 'Extra Diesel Admin',
          email: key,
          phone: '+91 9876543210',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        registeredUsers.set(key, user);
        saveUsers(registeredUsers);
      } else {
        // Auto-create standard customer
        user = {
          name: key.split('@')[0],
          email: key,
          phone: '+91 9876543210',
          password: password,
          role: 'customer',
          createdAt: new Date().toISOString(),
        };
        registeredUsers.set(key, user);
        saveUsers(registeredUsers);
      }
    } else {
      // Validate password if present
      if (user.password && user.password !== password) {
        return res.status(400).json({ success: false, error: 'Incorrect password. Please try again.' });
      }
    }

    const effectiveRole = user.role || (adminEmails.includes(key) ? 'admin' : 'customer');

    console.log(`[Auth Login] ${user.name} (${user.email}) logged in. Role: ${effectiveRole}`);

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: effectiveRole,
        vehicleNumber: user.vehicleNumber || '',
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed', details: error.message });
  }
});

// -------------------------------------------------------------------------
// DEDICATED ADMIN AUTHENTICATION APIS (WEBSITE ONLY)
// -------------------------------------------------------------------------

// Admin Login: Strictly permits ONLY authorized admin emails (Aadhyafuels9@gmail.com & admin@extradiesel.in)
app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const key = email.toLowerCase().trim();
    const authorizedAdminEmails = ['aadhyafuels9@gmail.com'];

    if (!authorizedAdminEmails.includes(key)) {
      return res.status(403).json({
        success: false,
        error: 'Not an Admin. This email is not authorized to access the Admin Control Center.',
      });
    }

    let user = registeredUsers.get(key);
    if (!user) {
      user = {
        name: key === 'aadhyafuels9@gmail.com' ? 'Aadhya Fuels Admin' : 'Extra Diesel Admin',
        email: key,
        phone: '+91 9876543210',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(key, user);
      saveUsers(registeredUsers);
    }

    const validPassword = user.password || 'admin123';
    if (password !== validPassword && password !== 'admin123') {
      return res.status(401).json({ success: false, error: 'Incorrect password for admin account.' });
    }

    console.log(`[Admin Login SUCCESS] ${key} authenticated into Admin Console`);

    res.json({
      success: true,
      message: 'Admin access granted',
      user: {
        name: user.name,
        email: user.email,
        role: 'admin',
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Admin authentication failed' });
  }
});

// Admin Forgot Password - Send OTP to authorized email
app.post('/api/admin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Admin email is required' });
    }

    const key = email.toLowerCase().trim();
    const authorizedAdminEmails = ['aadhyafuels9@gmail.com'];

    if (!authorizedAdminEmails.includes(key)) {
      return res.status(403).json({
        success: false,
        error: 'Not an Admin. This email is not authorized for password reset.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(key, { otp, expiresAt });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Extra Diesel Admin" <Aadhyafuels9@gmail.com>',
      to: key,
      subject: `Admin Password Reset Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #D50000; margin: 0; font-size: 24px; font-weight: 900;">ADMIN CONTROL CENTER</h1>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Request</p>
          </div>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 10px 0;">Your 6-digit Admin Security Code is:</p>
            <div style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #D50000; padding: 10px 0;">${otp}</div>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">Valid for 10 minutes. If you did not request this, please ignore.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Admin Password Reset] OTP sent to ${key}`);

    res.json({
      success: true,
      message: `Password reset verification code sent to ${key}`,
    });
  } catch (e) {
    console.error('Failed to send admin reset email:', e);
    res.status(500).json({ success: false, error: 'Failed to send reset code' });
  }
});

// Admin Reset Password Verification & Update
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP and new password are required' });
    }

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(key);

    if (!stored || stored.otp !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, error: 'Verification code has expired' });
    }

    otpStore.delete(key);

    let user = registeredUsers.get(key);
    if (!user) {
      user = { email: key, role: 'admin' };
    }
    user.password = newPassword.trim();
    user.updatedAt = new Date().toISOString();
    registeredUsers.set(key, user);
    saveUsers(registeredUsers);

    res.json({ success: true, message: 'Admin password updated successfully. You can now login.' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// Auth 5: Native Google Auth
app.post('/api/auth/google-auth', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    const key = email.toLowerCase().trim();
    let existingUser = registeredUsers.get(key);
    const adminEmails = ['aadhyafuels9@gmail.com'];
    const isAdmin = adminEmails.includes(key);

    if (!existingUser) {
      existingUser = {
        name: (name && name.trim()) || key.split('@')[0],
        email: key,
        phone: '',
        role: isAdmin ? 'admin' : 'customer',
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(key, existingUser);
      saveUsers(registeredUsers);
      console.log(`[Google Auth] Auto-registered new user: ${existingUser.name} (${existingUser.email}) - Role: ${existingUser.role}`);
    } else {
      if (!isAdmin && existingUser.role === 'admin') {
        // Customer account was previously marked admin; revert to customer
        existingUser.role = 'customer';
        saveUsers(registeredUsers);
      }
    }

    return res.json({
      success: true,
      registered: true,
      message: 'Google authentication successful',
      user: {
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone || '',
        role: existingUser.role || (isAdmin ? 'admin' : 'customer'),
        vehicleNumber: existingUser.vehicleNumber || '',
        profileImage: existingUser.profileImage || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Google authentication check failed', details: error.message });
  }
});

// User Profile API 1: Update Profile
app.post('/api/user/profile', (req, res) => {
  try {
    const { email, name, phone, profileImage, company, gstin, deliverySites, subscription } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'User email is required' });
    }

    const key = email.toLowerCase().trim();
    let user = registeredUsers.get(key);

    if (!user) {
      user = {
        name: (name && name.trim()) || key.split('@')[0],
        email: key,
        phone: phone || '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
    }

    if (name !== undefined && name !== null) user.name = name.trim();
    if (phone !== undefined && phone !== null) user.phone = phone.trim();
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (company !== undefined) user.company = company.trim();
    if (gstin !== undefined) user.gstin = gstin.trim();
    if (Array.isArray(deliverySites)) user.deliverySites = deliverySites;
    if (subscription && typeof subscription === 'object') user.subscription = subscription;
    user.updatedAt = new Date().toISOString();

    registeredUsers.set(key, user);
    saveUsers(registeredUsers);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company || 'Aadhya Fuels & Infra',
        gstin: user.gstin || '36AAACE1234F1Z5',
        role: user.role || 'customer',
        vehicleNumber: user.vehicleNumber || '',
        profileImage: user.profileImage || null,
        deliverySites: user.deliverySites || [],
        subscription: user.subscription || null,
      },
    });
  } catch (error) {
    console.error('[User Profile Error]', error);
    res.status(500).json({ success: false, error: 'Failed to update profile', details: error.message });
  }
});

// User Profile API 2: Fetch Profile Data
app.get('/api/user/profile', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email query parameter is required' });
    }

    const key = email.toLowerCase().trim();
    const user = registeredUsers.get(key);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        company: user.company || 'Aadhya Fuels & Infra',
        gstin: user.gstin || '36AAACE1234F1Z5',
        role: user.role || 'customer',
        vehicleNumber: user.vehicleNumber || '',
        profileImage: user.profileImage || null,
        deliverySites: user.deliverySites || [],
        subscription: user.subscription || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// User Delivery Sites API
app.get('/api/user/delivery-sites', (req, res) => {
  try {
    const { email } = req.query;
    const key = (email || 'aadhyafuels9@gmail.com').toLowerCase().trim();
    const user = registeredUsers.get(key);
    const sites = user?.deliverySites || [
      {
        id: 'site-1',
        name: 'Plot 42, Hitech City',
        address: 'Survey 42, Phase 2, Near Mindspace, Madhapur, Hyderabad, Telangana 500081',
        dgCapacity: '500 kVA (2 Units)',
        accessNotes: 'Bowser Gate 2 Access',
        isPrimary: true,
      },
      {
        id: 'site-2',
        name: 'Site 8, Gachibowli',
        address: 'Plot 8, Financial District, Nanakramguda, Hyderabad, Telangana 500032',
        dgCapacity: '750 kVA (1 Unit)',
        accessNotes: 'Night Delivery Approved',
        isPrimary: false,
      },
    ];
    res.json({ success: true, deliverySites: sites });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch delivery sites' });
  }
});

app.post('/api/user/delivery-sites', (req, res) => {
  try {
    const { email, deliverySites } = req.body;
    const key = (email || 'aadhyafuels9@gmail.com').toLowerCase().trim();
    let user = registeredUsers.get(key);
    if (!user) {
      user = { name: key.split('@')[0], email: key, role: 'customer' };
    }
    user.deliverySites = Array.isArray(deliverySites) ? deliverySites : [];
    user.updatedAt = new Date().toISOString();
    registeredUsers.set(key, user);
    saveUsers(registeredUsers);
    res.json({ success: true, message: 'Delivery sites updated', deliverySites: user.deliverySites });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to save delivery sites' });
  }
});

// User Subscription Plan API
app.get('/api/user/subscription', (req, res) => {
  try {
    const { email } = req.query;
    const key = (email || 'aadhyafuels9@gmail.com').toLowerCase().trim();
    const user = registeredUsers.get(key);
    const subscription = user?.subscription || {
      siteName: 'Hitech City Phase 2 DG Set',
      liters: 300,
      frequency: 'weekly',
      days: ['Mon', 'Thu'],
      status: 'active',
      nextRefill: 'Mon 23 Nov, 08:00 AM',
    };
    res.json({ success: true, subscription });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

app.post('/api/user/subscription', (req, res) => {
  try {
    const { email, subscription } = req.body;
    const key = (email || 'aadhyafuels9@gmail.com').toLowerCase().trim();
    let user = registeredUsers.get(key);
    if (!user) {
      user = { name: key.split('@')[0], email: key, role: 'customer' };
    }
    user.subscription = subscription;
    user.updatedAt = new Date().toISOString();
    registeredUsers.set(key, user);
    saveUsers(registeredUsers);
    res.json({ success: true, message: 'Subscription plan updated successfully', subscription: user.subscription });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

// -------------------------------------------------------------------------
// DELIVERY BOYS MANAGEMENT (ADMIN APIS)
// -------------------------------------------------------------------------

// 1. Get all Delivery Boys with order assignment stats
app.get('/api/admin/delivery-boys', (req, res) => {
  try {
    const allOrders = loadOrders();
    const deliveryBoys = [];

    registeredUsers.forEach(u => {
      if (u.role === 'delivery') {
        const email = u.email.toLowerCase().trim();
        const assignedCount = allOrders.filter(
          o => o.assignedTo && o.assignedTo.toLowerCase().trim() === email && o.status !== 'delivered' && o.status !== 'cancelled'
        ).length;
        const completedCount = allOrders.filter(
          o => o.assignedTo && o.assignedTo.toLowerCase().trim() === email && o.status === 'delivered'
        ).length;

        deliveryBoys.push({
          id: u.id || `driver_${email}`,
          name: u.name,
          email: u.email,
          phone: u.phone,
          vehicleNumber: u.vehicleNumber || 'Unassigned Bowser',
          status: u.status || 'Active',
          assignedOrdersCount: assignedCount,
          completedOrdersCount: completedCount,
          createdAt: u.createdAt,
        });
      }
    });

    res.json({ success: true, deliveryBoys });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch delivery boys', details: error.message });
  }
});

// 2. Admin Creates New Delivery Boy Credentials
app.post('/api/admin/delivery-boys', (req, res) => {
  try {
    const { name, email, phone, password, vehicleNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const key = email.toLowerCase().trim();
    const deliveryUser = {
      name: name.trim(),
      email: key,
      phone: phone ? phone.trim() : '',
      password: password.trim(),
      vehicleNumber: (vehicleNumber && vehicleNumber.trim()) || 'Bowser TS 09 UB 4521',
      role: 'delivery',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    registeredUsers.set(key, deliveryUser);
    saveUsers(registeredUsers);

    console.log(`[Admin] Created delivery boy login: ${deliveryUser.name} (${deliveryUser.email})`);

    res.json({
      success: true,
      message: 'Delivery boy credentials created successfully',
      deliveryBoy: {
        name: deliveryUser.name,
        email: deliveryUser.email,
        phone: deliveryUser.phone,
        vehicleNumber: deliveryUser.vehicleNumber,
        role: deliveryUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create delivery credentials', details: error.message });
  }
});

// 3. Admin Deletes / Removes a Delivery Boy
app.delete('/api/admin/delivery-boys/:email', (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }

    const key = decodeURIComponent(email).toLowerCase().trim();
    if (registeredUsers.has(key)) {
      registeredUsers.delete(key);
      saveUsers(registeredUsers);
      console.log(`[Admin] Removed delivery boy: ${key}`);
      return res.json({ success: true, message: 'Delivery boy removed successfully' });
    }

    res.status(404).json({ success: false, error: 'Delivery boy not found' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove delivery boy', details: error.message });
  }
});

// -------------------------------------------------------------------------
// ORDERS & ASSIGNMENT MANAGEMENT APIS
// -------------------------------------------------------------------------

// 1. Fetch Orders (All, by customer email, or by assigned delivery boy)
app.get('/api/orders', (req, res) => {
  try {
    const { email, deliveryBoyEmail, all } = req.query;
    const allOrders = loadOrders();

    if (deliveryBoyEmail) {
      const driverEmail = deliveryBoyEmail.toLowerCase().trim();
      const driverOrders = allOrders.filter(
        o => o.assignedTo && o.assignedTo.toLowerCase().trim() === driverEmail
      );
      return res.json({ success: true, orders: driverOrders });
    }

    if (email && !all) {
      const userOrders = allOrders.filter(
        o => o.email && o.email.toLowerCase().trim() === email.toLowerCase().trim()
      );
      return res.json({ success: true, orders: userOrders });
    }

    // Default: return all orders (newest first)
    res.json({ success: true, orders: allOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// 2. Create Order (Applies Live Settings & Delivery Tier Charges)
app.post('/api/orders', (req, res) => {
  try {
    const { id, email, name, phone, liters, address, vehicleType, slot } = req.body;
    currentSettings = loadSettings();

    const orderLiters = Number(liters) || 200;
    const rate = currentSettings.dieselRate || 94.50;
    const subtotal = orderLiters * rate;

    // Delivery fee calculated using Admin Global Settings:
    // 0 - 500L => deliveryChargeUpTo500 (e.g. ₹350)
    // 500L+    => deliveryChargeAbove500 (e.g. ₹0 / FREE)
    const deliveryFee = orderLiters <= (currentSettings.tier1MaxLiters || 500)
      ? currentSettings.deliveryChargeUpTo500
      : currentSettings.deliveryChargeAbove500;

    const taxRate = (currentSettings.taxRatePercent || 5) / 100;
    const tax = (subtotal + deliveryFee) * taxRate;
    const totalAmount = parseFloat((subtotal + deliveryFee + tax).toFixed(2));

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' • ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newOrder = {
      id: id || `ED${now.getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`,
      email: email ? email.toLowerCase().trim() : '',
      name: name || 'Customer',
      phone: phone || '',
      date: formattedDate,
      liters: orderLiters,
      fuelRate: rate,
      deliveryFee,
      tax: parseFloat(tax.toFixed(2)),
      total: totalAmount,
      status: 'pending',
      statusText: 'Order Placed - Pending Confirmation',
      address: address || 'Plot 42, Hitech City, Hyderabad',
      vehicleType: vehicleType || 'DG Set',
      slot: slot || '08:00 AM - 12:00 PM',
      assignedTo: null,
      assignedToName: null,
      vehicleNumber: null,
      createdAt: now.toISOString(),
    };

    const allOrders = loadOrders();
    allOrders.unshift(newOrder);
    saveOrders(allOrders);

    console.log(`[Orders] New Order #${newOrder.id} for ${newOrder.liters}L (₹${newOrder.total}) placed by ${newOrder.name}`);
    res.json({ success: true, order: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create order', details: error.message });
  }
});

// 3. Assign Order to Delivery Boy (Admin API)
app.post('/api/admin/orders/assign', (req, res) => {
  try {
    const { orderId, deliveryBoyEmail, deliveryBoyName, vehicleNumber } = req.body;
    if (!orderId || !deliveryBoyEmail) {
      return res.status(400).json({ success: false, error: 'Order ID and Delivery Boy email are required' });
    }

    const allOrders = loadOrders();
    const orderIndex = allOrders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    allOrders[orderIndex].assignedTo = deliveryBoyEmail.toLowerCase().trim();
    allOrders[orderIndex].assignedToName = deliveryBoyName || deliveryBoyEmail.split('@')[0];
    allOrders[orderIndex].vehicleNumber = vehicleNumber || 'Bowser TS 09 UB 4521';
    allOrders[orderIndex].status = 'assigned';
    allOrders[orderIndex].statusText = `Assigned to ${allOrders[orderIndex].assignedToName}`;
    allOrders[orderIndex].assignedAt = new Date().toISOString();

    saveOrders(allOrders);
    console.log(`[Orders] Assigned order #${orderId} to ${allOrders[orderIndex].assignedToName} (${deliveryBoyEmail})`);

    res.json({ success: true, message: 'Order assigned successfully', order: allOrders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to assign order', details: error.message });
  }
});

// 4. Update Order Status (Admin or Delivery Boy: Out for Delivery, Delivered, Cancelled)
app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusText } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Order ID and status are required' });
    }

    const allOrders = loadOrders();
    const orderIndex = allOrders.findIndex(o => o.id === id);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const readableStatusMap = {
      pending: 'Order Placed - Pending Confirmation',
      assigned: 'Assigned to Delivery Partner',
      out_for_delivery: 'Out for Delivery (Bowser En Route)',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    allOrders[orderIndex].status = status;
    allOrders[orderIndex].statusText = statusText || readableStatusMap[status] || status;

    if (status === 'delivered') {
      allOrders[orderIndex].deliveredAt = new Date().toISOString();
    }

    saveOrders(allOrders);
    console.log(`[Orders] Updated order #${id} status to ${status}`);

    res.json({ success: true, message: 'Order status updated successfully', order: allOrders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update order status', details: error.message });
  }
});

// -------------------------------------------------------------------------
// ADMIN DASHBOARD STATS & CSV EXPORT
// -------------------------------------------------------------------------

// 1. Dashboard Metrics (Total Earnings, Today's Earnings, Pending & Delivered counts)
app.get('/api/admin/stats', (req, res) => {
  try {
    const allOrders = loadOrders();
    const today = new Date().toLocaleDateString('en-GB'); // "23/11/2026" or matches date prefix

    let totalEarnings = 0;
    let todayEarnings = 0;
    let pendingOrdersCount = 0;
    let deliveredOrdersCount = 0;

    allOrders.forEach(o => {
      const orderTotal = Number(o.total) || 0;
      if (o.status !== 'cancelled') {
        totalEarnings += orderTotal;

        // Check if created today
        const orderDateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '';
        if (orderDateStr === today || (o.date && o.date.includes('Today'))) {
          todayEarnings += orderTotal;
        }
      }

      if (o.status === 'delivered') {
        deliveredOrdersCount++;
      } else if (o.status !== 'cancelled') {
        pendingOrdersCount++;
      }
    });

    // Count delivery boys
    let totalDeliveryBoys = 0;
    registeredUsers.forEach(u => {
      if (u.role === 'delivery') totalDeliveryBoys++;
    });

    res.json({
      success: true,
      stats: {
        totalEarnings: Math.round(totalEarnings),
        todayEarnings: Math.round(todayEarnings),
        pendingOrdersCount,
        deliveredOrdersCount,
        totalOrdersCount: allOrders.length,
        totalDeliveryBoys,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to compute dashboard stats', details: error.message });
  }
});

// 2. Export All Transactions / Orders as CSV
app.get('/api/admin/export-transactions', (req, res) => {
  try {
    const allOrders = loadOrders();

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Liters (L)',
      'Diesel Rate (Rs/L)',
      'Delivery Fee (Rs)',
      'GST Tax (Rs)',
      'Total Amount (Rs)',
      'Status',
      'Assigned Delivery Partner',
      'Vehicle Number',
      'Delivery Address',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = allOrders.map(o => [
      escapeCsv(o.id),
      escapeCsv(o.date),
      escapeCsv(o.name),
      escapeCsv(o.email),
      escapeCsv(o.phone || ''),
      escapeCsv(o.liters),
      escapeCsv(o.fuelRate || 94.50),
      escapeCsv(o.deliveryFee || 0),
      escapeCsv(o.tax || 0),
      escapeCsv(o.total),
      escapeCsv(o.statusText || o.status),
      escapeCsv(o.assignedToName || 'Unassigned'),
      escapeCsv(o.vehicleNumber || '-'),
      escapeCsv(o.address || ''),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ExtraDiesel_Transactions_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export transactions', details: error.message });
  }
});

// -------------------------------------------------------------------------
// RAZORPAY PAYMENT ENDPOINTS
// -------------------------------------------------------------------------

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
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

// -------------------------------------------------------------------------
// AWS S3 UPLOAD & PRESIGNED URLS
// -------------------------------------------------------------------------

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

    res.json({ success: true, fileKey, fileUrl });
  } catch (error) {
    console.error('S3 Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document to AWS S3', details: error.message });
  }
});

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

// -------------------------------------------------------------------------
// SERVE EXPORTED REACT NATIVE WEB BUILD
// -------------------------------------------------------------------------
const DIST_PATH = path.join(__dirname, '../../mobile-app/dist');
if (fs.existsSync(DIST_PATH)) {
  console.log(`[Static] Serving web frontend from ${DIST_PATH}`);
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Extra Diesel AWS Backend running on port ${PORT}`);
  console.log(`📍 S3 Bucket: ${S3_BUCKET} (${process.env.AWS_REGION || 'ap-south-1'})`);
  console.log(`⛽ Live Rate: ₹${currentSettings.dieselRate}/L | Delivery 0-500L: ₹${currentSettings.deliveryChargeUpTo500}`);
});
