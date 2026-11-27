import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
  deliverySlots: [
    '08:00 AM - 12:00 PM',
    '01:00 PM - 05:00 PM',
    '06:00 PM - 10:00 PM',
  ],
  supportHotline: {
    tollFree: '1800-DIESEL-EX (1800-343-7353)',
    phone: '+91 9989551305',
    email: 'support@extradiesel.in',
    whatsapp: '+91 9989551305',
    deskStatus: 'Bowser Dispatch Desk: Live & Active',
  },
  qualityCompliance: {
    licenseNo: 'LM/HYD/2026/FM-4910',
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
  termsAndConditions: [
    { id: 'tc-1', title: '100% Pure BS-VI High-Speed Diesel', desc: 'All diesel delivered is sourced directly from authorized oil marketing terminal depots and meets strict BS-VI environmental and engine standards.' },
    { id: 'tc-2', title: 'Legal Metrology Calibrated Smart Bowsers', desc: 'Deliveries are executed strictly via automated smart bowsers equipped with government-stamped Legal Metrology flow meters and spark arrestors.' },
    { id: 'tc-3', title: 'Legal Metrology Calibrated Metering', desc: 'Each smart bowser is equipped with an electronic flow meter calibrated and stamped by Legal Metrology (±0.1% accuracy).' },
    { id: 'tc-4', title: 'Minimum Order Quantity (MOQ)', desc: 'The minimum delivery volume per doorstep order is 100 Liters.' },
    { id: 'tc-5', title: 'Free Delivery Threshold', desc: 'Deliveries of 200 Liters and above enjoy zero delivery charges. Orders below 200L are subject to standard delivery fees.' },
    { id: 'tc-6', title: 'Mandatory Static Earthing', desc: 'Before dispensing begins, the operator must connect a safety bonding wire to prevent static electrical discharge.' },
    { id: 'tc-7', title: '15-Meter Safety Zone', desc: 'The fueling area must maintain a 15-meter clearance free of open flames, smoking, welding, or electrical spark hazards during discharge.' },
    { id: 'tc-8', title: 'Certified Hazardous Material Drivers', desc: 'All bowser drivers and operators hold valid hazardous material transport licenses and emergency response training.' },
    { id: 'tc-9', title: 'Site Accessibility & Clear Passage', desc: 'The customer is responsible for ensuring the delivery bowser has unobstructed access to the fuel intake point.' },
    { id: 'tc-10', title: 'Dynamic Daily Price Transparency', desc: 'Diesel rates are updated daily based on state-notified fuel prices. The price locked at order placement is honored.' },
    { id: 'tc-11', title: 'Secure Online Payments via Razorpay', desc: 'All credit/debit card, UPI, and net banking transactions are processed via PCI-DSS compliant Razorpay gateway.' },
    { id: 'tc-12', title: 'Tax-Compliant 100% GST Invoices', desc: 'Instant digitally signed GST tax invoices are generated upon order completion and available for download.' },
    { id: 'tc-13', title: 'Tamper-Proof Electronic Delivery Receipts', desc: 'The smart bowser prints an automated receipt detailing start reading, finish reading, volume dispensed, and density.' },
    { id: 'tc-14', title: 'Free Order Cancellation', desc: 'Orders can be cancelled free of charge at any time prior to the bowser departing from the hub.' },
    { id: 'tc-15', title: 'On-Site Quality & Density Testing', desc: 'Customers are entitled to request an on-site hydrometer density check using our calibrated test equipment before discharge.' },
    { id: 'tc-16', title: 'Direct Refilling to Approved Receptors', desc: 'Fuel is dispensed directly into DG set fuel tanks, commercial vehicle fleets, agricultural machinery, or authorized storage.' },
    { id: 'tc-17', title: 'No Loose Container Fueling', desc: 'In compliance with safety and environmental regulations, dispensing into open buckets, jerry cans, or unapproved containers is strictly prohibited.' },
    { id: 'tc-18', title: 'Spill Prevention & Environmental Safety', desc: 'Our bowsers are equipped with emergency shut-off valves, automatic dry-break nozzles, and spill containment kits.' },
    { id: 'tc-19', title: 'Scheduled Recurring Refills', desc: 'Customers on weekly/monthly subscription refuels may pause, reschedule, or adjust quota up to 4 hours before the window.' },
    { id: 'tc-20', title: '24/7 Bowser Dispatch & Support Helpline', desc: 'For emergency fueling or delivery assistance, reach our 24x7 control room via 1800-DIESEL-EX or WhatsApp support.' },
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

// Default admin & pre-configured accounts
const DEFAULT_ACCOUNTS = [
  {
    name: 'Aadhya Fuels Admin',
    email: 'aadhyafuels9@gmail.com',
    phone: '+91 9876543210',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Akhil Harish Neela',
    email: 'neelaakhilharish@gmail.com',
    phone: '+91 8143372205',
    password: 'admin123',
    role: 'customer',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'AMMA (Bowser Captain)',
    email: '22wj8a05aq@gniindia.org',
    phone: '+91 9989551305',
    password: 'admin123',
    role: 'delivery',
    vehicleNumber: 'TS 09 UB 4521',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Ramesh Kumar (Captain)',
    email: 'delivery@extradiesel.in',
    phone: '+91 9876543211',
    password: 'admin123',
    role: 'delivery',
    vehicleNumber: 'TS 07 TG 9988',
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
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const PORT = process.env.PORT || 5000;

// Socket.io Real-Time Rooms & GPS Events
io.on('connection', (socket) => {
  // Join a specific order tracking channel
  socket.on('join_order_track', (orderId) => {
    if (orderId) {
      socket.join(`order_${orderId}`);
      console.log(`[Socket.io] Client ${socket.id} joined channel order_${orderId}`);
    }
  });

  socket.on('leave_order_track', (orderId) => {
    if (orderId) {
      socket.leave(`order_${orderId}`);
    }
  });

  // Driver joins their personal driver notification channel for instant order assignment alerts
  socket.on('join_driver_channel', (driverEmail) => {
    if (driverEmail) {
      const cleanEmail = driverEmail.toLowerCase().trim();
      socket.join(`driver_${cleanEmail}`);
      console.log(`[Socket.io] Driver ${cleanEmail} joined channel driver_${cleanEmail}`);
    }
  });

  // Captain emits live coordinates directly through WebSocket (sub-second sync)
  socket.on('captain_location_update', (data) => {
    const { orderId, driverEmail, lat, lon, heading, speed } = data || {};
    if (lat === undefined || lon === undefined) return;

    const numLat = Number(lat);
    const numLon = Number(lon);
    if (isNaN(numLat) || isNaN(numLon)) return;

    const allOrders = loadOrders();
    const ordersToBroadcast = [];

    if (orderId) {
      const idx = allOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        allOrders[idx].captainLat = numLat;
        allOrders[idx].captainLon = numLon;
        if (heading !== undefined && heading !== null && !isNaN(Number(heading))) {
          allOrders[idx].captainHeading = Number(heading);
        }
        if (speed !== undefined && speed !== null && !isNaN(Number(speed))) {
          allOrders[idx].captainSpeed = Number(speed);
        }
        allOrders[idx].lastLocationUpdate = new Date().toISOString();
        ordersToBroadcast.push(allOrders[idx]);
      }
    } else if (driverEmail) {
      const normEmail = driverEmail.toLowerCase().trim();
      allOrders.forEach((o) => {
        if (
          o.assignedTo &&
          o.assignedTo.toLowerCase().trim() === normEmail &&
          (o.status === 'out_for_delivery' || o.status === 'arrived' || o.status === 'assigned')
        ) {
          o.captainLat = numLat;
          o.captainLon = numLon;
          if (heading !== undefined && heading !== null && !isNaN(Number(heading))) {
            o.captainHeading = Number(heading);
          }
          if (speed !== undefined && speed !== null && !isNaN(Number(speed))) {
            o.captainSpeed = Number(speed);
          }
          o.lastLocationUpdate = new Date().toISOString();
          ordersToBroadcast.push(o);
        }
      });
    }

    if (ordersToBroadcast.length > 0) {
      saveOrders(allOrders);
      ordersToBroadcast.forEach((ord) => {
        io.to(`order_${ord.id}`).emit('bowser_location_changed', {
          orderId: ord.id,
          lat: numLat,
          lon: numLon,
          heading: ord.captainHeading ?? null,
          speed: ord.captainSpeed ?? null,
          timestamp: new Date().toISOString(),
        });
      });
    }
  });

  socket.on('disconnect', () => {});
});

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
      qualityCompliance,
      pesoCompliance,
      b2bCreditLimit,
      b2bCreditTerms,
      b2bBillingCycle,
      vehicleImages,
      termsAndConditions,
      deliverySlots,
    } = req.body;

    currentSettings = loadSettings();

    if (dieselRate !== undefined && !isNaN(Number(dieselRate)) && Number(dieselRate) > 0) {
      currentSettings.dieselRate = parseFloat(Number(dieselRate).toFixed(2));
    }
    if (city) currentSettings.city = city.trim();
    if (deliveryChargeUpTo500 !== undefined) {
      currentSettings.deliveryChargeUpTo500 = (deliveryChargeUpTo500 === '' || deliveryChargeUpTo500 === null || isNaN(Number(deliveryChargeUpTo500))) ? 0 : Number(deliveryChargeUpTo500);
    }
    if (deliveryChargeAbove500 !== undefined && !isNaN(Number(deliveryChargeAbove500))) {
      currentSettings.deliveryChargeAbove500 = Number(deliveryChargeAbove500);
    }
    if (tier1MaxLiters !== undefined && !isNaN(Number(tier1MaxLiters))) {
      currentSettings.tier1MaxLiters = Number(tier1MaxLiters);
    }
    if (taxRatePercent !== undefined) {
      currentSettings.taxRatePercent = (taxRatePercent === '' || taxRatePercent === null || isNaN(Number(taxRatePercent))) ? 0 : Number(taxRatePercent);
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
    const incomingCompliance = qualityCompliance || pesoCompliance;
    if (incomingCompliance && typeof incomingCompliance === 'object') {
      currentSettings.qualityCompliance = {
        ...currentSettings.qualityCompliance,
        ...incomingCompliance
      };
      delete currentSettings.pesoCompliance;
    }
    if (vehicleImages && Array.isArray(vehicleImages)) {
      currentSettings.vehicleImages = vehicleImages.filter(Boolean);
    }
    if (termsAndConditions && Array.isArray(termsAndConditions)) {
      currentSettings.termsAndConditions = termsAndConditions;
    }
    if (deliverySlots && Array.isArray(deliverySlots)) {
      currentSettings.deliverySlots = deliverySlots.filter(Boolean);
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

// Endpoint to Resolve and Reverse-Geocode Pasted Google Maps Links (handles maps.app.goo.gl, coords, etc.)
app.get('/api/location/resolve-link', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Google Maps URL is required' });
    }

    let targetUrl = rawUrl.trim();
    let lat = null;
    let lon = null;

    // 1. Direct coordinate pattern e.g., "17.313112, 78.545285"
    const directMatch = targetUrl.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (directMatch) {
      lat = parseFloat(directMatch[1]);
      lon = parseFloat(directMatch[2]);
    }

    // 2. If it is a short link like maps.app.goo.gl or goo.gl, follow redirect
    if ((!lat || !lon) && /goo\.gl|maps\.app\.goo\.gl/i.test(targetUrl)) {
      try {
        const headRes = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        targetUrl = headRes.url || targetUrl;
      } catch (redirectErr) {
        console.warn('[Resolve Link] Redirect error:', redirectErr.message);
      }
    }

    // 3. Extract coordinates from expanded Google Maps URL patterns
    if (!lat || !lon) {
      const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        lat = parseFloat(atMatch[1]);
        lon = parseFloat(atMatch[2]);
      }
    }
    if (!lat || !lon) {
      const qMatch = targetUrl.match(/(?:q|destination|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lon = parseFloat(qMatch[2]);
      }
    }
    if (!lat || !lon) {
      const dMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dMatch) {
        lat = parseFloat(dMatch[1]);
        lon = parseFloat(dMatch[2]);
      }
    }

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract GPS coordinates from this Google Maps link. Please verify the URL or drop a GPS pin.',
      });
    }

    // Forward to internal reverse-geocode handler for accurate Colony & Address
    const geoUrl = `http://localhost:${PORT}/api/location/reverse-geocode?lat=${lat}&lon=${lon}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    let fullAddress = '';
    let shortAddress = '';
    let locationObj = null;

    if (geoData.success && geoData.location) {
      locationObj = {
        ...geoData.location,
        mapsLink: `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`,
      };
      fullAddress = geoData.location.fullAddress;
      shortAddress = geoData.location.shortAddress;
    } else {
      locationObj = {
        lat,
        lon,
        fullAddress: `Site Coordinates (${lat.toFixed(6)}, ${lon.toFixed(6)})`,
        shortAddress: `Site Pin (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        mapsLink: `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`,
      };
      fullAddress = locationObj.fullAddress;
      shortAddress = locationObj.shortAddress;
    }

    return res.json({
      success: true,
      resolvedUrl: targetUrl,
      lat,
      lon,
      fullAddress,
      shortAddress,
      mapsLink: `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`,
      location: locationObj,
    });
  } catch (err) {
    console.error('[Resolve Link Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal link resolver error' });
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
    let colony = '';
    let suburb = '';
    let street = '';
    let city = 'Hyderabad';
    let state = 'Telangana';
    let pincode = '';
    let landmark = '';
    let plotNo = '';

    // 1. OpenStreetMap Nominatim for exact Indian Neighbourhood / Colony name
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latFloat)}&lon=${encodeURIComponent(lonFloat)}&zoom=18&addressdetails=1`;
      const osmRes = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'ExtraDieselApp/1.0 (contact@extradiesel.in)',
          'Accept-Language': 'en'
        }
      });
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const a = osmData.address || {};
        colony = a.neighbourhood || a.residential || a.subdistrict || a.quarter || '';
        suburb = a.suburb || a.locality || '';
        street = a.road || a.pedestrian || a.street || '';
        city = a.city || a.town || a.village || city;
        state = a.state || state;
        pincode = a.postcode || '';
        landmark = a.amenity || a.place_of_worship || a.temple || a.commercial || a.shop || a.leisure || a.tourism || a.building || '';
        plotNo = a.house_number || '';
      }
    } catch (osmErr) {
      console.warn('[Reverse Geocode] OSM error:', osmErr.message);
    }

    // 2. Mapbox Places API for Street, POI Landmark & context refinement
    if (mapboxToken) {
      try {
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lonFloat},${latFloat}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,locality,place,postcode`;
        const mbRes = await fetch(mbUrl);
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          if (mbData.features && mbData.features.length > 0) {
            const feat = mbData.features[0];
            const ctx = feat.context || [];

            // Ignore Plus codes (e.g. 8G7W+54M)
            const isPlusCode = (t) => t && /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/i.test(t.trim());

            if (!street && feat.text && !isPlusCode(feat.text)) {
              street = feat.text;
            }

            ctx.forEach(c => {
              if (!colony && c.id.startsWith('neighborhood')) colony = c.text;
              if (!suburb && c.id.startsWith('locality')) suburb = c.text;
              if (!pincode && c.id.startsWith('postcode')) pincode = c.text;
              if (c.id.startsWith('place')) city = c.text;
              if (c.id.startsWith('region')) state = c.text;
            });

            const poi = mbData.features.find(f => f.place_type && f.place_type.includes('poi'));
            if (poi && poi.text && !landmark) landmark = poi.text;
          }
        }
      } catch (mbErr) {
        console.warn('[Reverse Geocode] Mapbox error:', mbErr.message);
      }
    }

    // Clean up Plus Codes or raw segment numbers in plotNo
    if (plotNo && (/^\d{3,}$/.test(plotNo) || /^[A-Z0-9]{4,8}\+/i.test(plotNo))) {
      plotNo = '';
    }

    let landmarkText = landmark ? (landmark.toLowerCase().startsWith('near') ? landmark : `near ${landmark}`) : '';
    let plotText = plotNo ? (/^\d+$/.test(plotNo) ? `Plot No ${plotNo}` : plotNo) : '';

    const area = [colony, suburb && suburb !== colony ? suburb : ''].filter(Boolean).join(', ') || city;
    const shortAddress = [colony || street, suburb && suburb !== colony ? suburb : city].filter(Boolean).join(', ') || area;
    const fullParts = [plotText, street, colony, landmarkText, suburb && suburb !== colony ? suburb : '', city, state ? `${state} ${pincode}`.trim() : pincode].filter(Boolean);
    const fullAddress = fullParts.join(', ') || `${city}, ${state}`;

    return res.json({
      success: true,
      location: {
        lat: latFloat,
        lon: lonFloat,
        plotNo: plotText,
        street,
        colony,
        suburb,
        area,
        landmark: landmarkText,
        city,
        state,
        pincode,
        fullAddress,
        shortAddress
      }
    });

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

// Location Search / Autocomplete Endpoint (Mapbox Places + OSM fallback)
app.get('/api/location/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, results: [] });
    }

    const q = query.trim();
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    if (mapboxToken) {
      try {
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&country=IN&proximity=78.4867,17.3850&types=poi,address,neighborhood,locality,place`;
        const mbRes = await fetch(mbUrl);
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          if (mbData.features && mbData.features.length > 0) {
            const results = mbData.features.map(f => {
              const ctx = f.context || [];
              let plotNo = f.address || '';
              let street = f.text || '';
              let area = '';
              let city = 'Hyderabad';
              let state = 'Telangana';
              let pincode = '';
              let landmark = '';

              ctx.forEach(c => {
                if (c.id.startsWith('postcode')) pincode = c.text;
                else if (c.id.startsWith('neighborhood') || c.id.startsWith('locality')) area = c.text;
                else if (c.id.startsWith('place')) city = c.text;
                else if (c.id.startsWith('region')) state = c.text;
              });

              if (f.place_type && f.place_type.includes('poi')) {
                landmark = f.text;
              }

              return {
                id: f.id,
                name: f.text,
                placeName: f.place_name,
                lat: f.center[1],
                lon: f.center[0],
                plotNo,
                street,
                area: area || f.text,
                landmark,
                city,
                state,
                pincode,
              };
            });
            return res.json({ success: true, results });
          }
        }
      } catch (mbErr) {
        console.warn('[Location Search] Mapbox search error:', mbErr.message);
      }
    }

    // Fallback: OpenStreetMap Nominatim
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Hyderabad')}&countrycodes=in&limit=5&addressdetails=1`;
      const osmRes = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'ExtraDieselApp/1.0 (contact@extradiesel.in)',
          'Accept-Language': 'en'
        }
      });
      if (osmRes.ok) {
        const data = await osmRes.json();
        const results = (data || []).map((item, idx) => {
          const a = item.address || {};
          return {
            id: `osm-${idx}-${item.place_id || idx}`,
            name: item.display_name.split(',')[0],
            placeName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            plotNo: a.house_number || a.building || '',
            street: a.road || a.pedestrian || a.street || '',
            area: a.suburb || a.neighbourhood || a.residential || '',
            landmark: a.amenity || a.commercial || '',
            city: a.city || a.town || 'Hyderabad',
            state: a.state || 'Telangana',
            pincode: a.postcode || '',
          };
        });
        return res.json({ success: true, results });
      }
    } catch (osmErr) {
      console.warn('[Location Search] OSM search error:', osmErr.message);
    }

    res.json({ success: true, results: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Location search failed', details: err.message });
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
            <p style="color: #64748b; font-size: 11px; margin: 0;">Legal Metrology Certified On-Demand Doorstep Diesel Delivery</p>
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
    const { email, password, loginRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const key = email.toLowerCase().trim();
    let user = registeredUsers.get(key);
    const adminEmails = ['aadhyafuels9@gmail.com'];

    // 1. DELIVERY PARTNER LOGIN MODE
    if (loginRole === 'delivery') {
      if (!user || user.role !== 'delivery') {
        return res.status(404).json({
          success: false,
          error: 'Account not found. Please contact Extra Diesel admin for delivery partner credentials.',
        });
      }
      if (user.password && user.password !== password) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect password. Please verify credentials with admin.',
        });
      }
      console.log(`[Delivery Login] Captain ${user.name} (${user.email}) logged in.`);
      return res.json({
        success: true,
        message: 'Delivery Captain logged in successfully',
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: 'delivery',
          vehicleNumber: user.vehicleNumber || 'Bowser TS 09 UB 4521',
          profileImage: user.profileImage || null,
        },
      });
    }

    // 2. CUSTOMER / ADMIN LOGIN MODE
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
        // Unregistered credentials: Do NOT auto-create; return 404
        return res.status(404).json({
          success: false,
          error: 'Account not found. Please click Sign Up to create your Extra Diesel account.',
        });
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

// Auth: Forgot Password - Step 1: Send Reset OTP via SMTP
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    const key = email.toLowerCase().trim();
    const user = registeredUsers.get(key);
    const adminEmails = ['aadhyafuels9@gmail.com'];
    const isAdmin = adminEmails.includes(key);

    if (!user && !isAdmin) {
      return res.status(404).json({
        success: false,
        error: 'No account registered with this email address.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(`reset_${key}`, { otp, expiresAt, email: key });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Extra Diesel" <Aadhyafuels9@gmail.com>',
      to: email,
      subject: `${otp} is your Extra Diesel Password Reset Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #D50000; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px;">EXTRA <span style="color: #FFB300;">DIESEL</span></h1>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Request</p>
          </div>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 10px 0;">Use the 6-digit code below to reset your Extra Diesel password:</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #D50000; padding: 10px 0;">${otp}</div>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">Valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            <p style="color: #64748b; font-size: 11px; margin: 0;">Legal Metrology Certified On-Demand Doorstep Diesel Delivery</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Password reset OTP sent to ${email}`);

    res.json({
      success: true,
      message: `Password reset code sent to ${email}`,
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ success: false, error: 'Failed to send reset code', details: error.message });
  }
});

// Auth: Forgot Password - Step 2: Verify OTP and Set New Password
app.post('/api/auth/forgot-password/reset', (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(`reset_${key}`);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'No active reset request found. Please request a new OTP.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(`reset_${key}`);
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code. Please check your email.' });
    }

    let user = registeredUsers.get(key);
    if (!user) {
      const adminEmails = ['aadhyafuels9@gmail.com'];
      if (adminEmails.includes(key)) {
        user = {
          name: 'Extra Diesel Admin',
          email: key,
          phone: '+91 9876543210',
          password: newPassword,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        registeredUsers.set(key, user);
      } else {
        return res.status(404).json({ success: false, error: 'User account not found' });
      }
    } else {
      user.password = newPassword;
      registeredUsers.set(key, user);
    }

    saveUsers(registeredUsers);
    otpStore.delete(`reset_${key}`);
    console.log(`[Auth] Password updated for ${key}`);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset password', details: error.message });
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

// Auth 5: Native Google Auth (Requires existing registered account; un-registered users must Sign Up)
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

    if (!existingUser && !isAdmin) {
      return res.status(404).json({
        success: false,
        accountNotFound: true,
        error: 'Account not found. No account is registered with this Google ID. Please click Sign Up to create your Extra Diesel account.',
      });
    }

    if (!existingUser && isAdmin) {
      existingUser = {
        name: (name && name.trim()) || 'Extra Diesel Admin',
        email: key,
        phone: '+91 9876543210',
        role: 'admin',
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(key, existingUser);
      saveUsers(registeredUsers);
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
        name: 'Primary Site',
        address: 'Site Location, Hyderabad, Telangana',
        dgCapacity: '500 kVA',
        accessNotes: 'Bowser Gate Access',
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
    if (!email) {
      return res.json({ success: true, subscription: null });
    }
    const key = email.toLowerCase().trim();
    const user = registeredUsers.get(key);
    const subscription = user?.subscription || null;
    res.json({ success: true, subscription });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

app.post('/api/user/subscription', (req, res) => {
  try {
    const { email, subscription } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    const key = email.toLowerCase().trim();
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

app.delete('/api/user/subscription', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    const key = email.toLowerCase().trim();
    const user = registeredUsers.get(key);
    if (user) {
      user.subscription = null;
      user.updatedAt = new Date().toISOString();
      registeredUsers.set(key, user);
      saveUsers(registeredUsers);
    }
    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Admin Subscriptions API - Fetch all user subscriptions
app.get('/api/admin/subscriptions', (req, res) => {
  try {
    const subscriptionsList = [];
    for (const [emailKey, user] of registeredUsers.entries()) {
      if (user.subscription && user.subscription.status !== 'cancelled') {
        subscriptionsList.push({
          customerName: user.name || emailKey.split('@')[0],
          customerEmail: user.email || emailKey,
          customerPhone: user.phone || 'N/A',
          address: user.deliverySites?.[0]?.address || user.subscription.siteName || 'Site Location',
          subscription: user.subscription,
        });
      }
    }
    res.json({ success: true, subscriptions: subscriptionsList });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin subscriptions' });
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
    const { id, email, name, phone, liters, address, vehicleType, slot, deliveryDate, deliverySlot, paymentId, paymentStatus, paymentMethod } = req.body;
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
    const formattedDate = now.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' • ' + now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newOrder = {
      id: id || `ED${now.getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`,
      email: email ? email.toLowerCase().trim() : '',
      name: name || 'Customer',
      phone: phone || '',
      date: req.body.date || (deliveryDate ? `${deliveryDate} • ${deliverySlot || slot || ''}` : formattedDate),
      deliveryDate: deliveryDate || req.body.deliveryDate || null,
      liters: orderLiters,
      fuelRate: rate,
      deliveryFee,
      tax: parseFloat(tax.toFixed(2)),
      total: totalAmount,
      status: 'pending',
      statusText: 'Order Placed - Pending Confirmation',
      address: address || 'Plot 42, Hitech City, Hyderabad',
      mapsLink: req.body.mapsLink || req.body.googleMapsLink || req.body.locationLink || null,
      vehicleType: vehicleType || req.body.equipment || 'DG Set',
      slot: slot || deliverySlot || '08:00 AM - 12:00 PM',
      deliverySlot: deliverySlot || slot || '08:00 AM - 12:00 PM',
      paymentId: paymentId || req.body.paymentId || null,
      paymentStatus: paymentStatus || 'paid',
      paymentMethod: paymentMethod || 'Razorpay UPI / Cards / NetBanking',
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

    // Emit live status update to customer tracking room
    io.to(`order_${orderId}`).emit('order_status_changed', {
      orderId,
      status: allOrders[orderIndex].status,
      statusText: allOrders[orderIndex].statusText,
      order: allOrders[orderIndex],
    });

    // Emit instant alert to the assigned Captain (triggers status bar and in-app sound/notification)
    const cleanDriverEmail = deliveryBoyEmail.toLowerCase().trim();
    io.to(`driver_${cleanDriverEmail}`).emit('order_assigned_to_captain', {
      orderId,
      order: allOrders[orderIndex],
      assignedTo: cleanDriverEmail,
      message: `New diesel trip assigned: Order #${orderId} (${allOrders[orderIndex].liters}L)`
    });
    io.emit('driver_orders_updated', { orderId, driverEmail: cleanDriverEmail });

    res.json({ success: true, message: 'Order assigned successfully', order: allOrders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to assign order', details: error.message });
  }
});

// 4. Update Order Status (Admin or Delivery Boy: Out for Delivery, Delivered, Cancelled)
app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusText, paymentStatus, paymentMethod } = req.body;

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
      arrived: 'Captain Arrived at Site (Ready to Dispense)',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    allOrders[orderIndex].status = status;
    allOrders[orderIndex].statusText = statusText || readableStatusMap[status] || status;

    if (paymentStatus) {
      allOrders[orderIndex].paymentStatus = paymentStatus;
    }
    if (paymentMethod) {
      allOrders[orderIndex].paymentMethod = paymentMethod;
    }

    if (status === 'out_for_delivery') {
      allOrders[orderIndex].dispatchedAt = new Date().toISOString();
    } else if (status === 'arrived') {
      allOrders[orderIndex].arrivedAt = new Date().toISOString();
    } else if (status === 'delivered') {
      allOrders[orderIndex].deliveredAt = new Date().toISOString();
      if (allOrders[orderIndex].paymentMethod && allOrders[orderIndex].paymentMethod.toLowerCase().includes('cash')) {
        allOrders[orderIndex].paymentStatus = 'paid';
      }
    }

    saveOrders(allOrders);
    console.log(`[Orders] Updated order #${id} status to ${status} (paymentStatus: ${allOrders[orderIndex].paymentStatus})`);

    // Emit live status update to customer tracking room
    io.to(`order_${id}`).emit('order_status_changed', {
      orderId: id,
      status: allOrders[orderIndex].status,
      statusText: allOrders[orderIndex].statusText,
      order: allOrders[orderIndex],
    });

    res.json({ success: true, message: 'Order status updated successfully', order: allOrders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update order status', details: error.message });
  }
});

// Captain Live GPS Broadcast Endpoint (Rapido / Swiggy style live tanker tracking)
app.post('/api/orders/:id/location', (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lon, heading, speed, driverEmail } = req.body;

    if (!id || lat === undefined || lon === undefined) {
      return res.status(400).json({ success: false, error: 'Order ID, latitude, and longitude are required' });
    }

    const allOrders = loadOrders();
    const orderIndex = allOrders.findIndex(o => o.id === id);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    allOrders[orderIndex].captainLat = Number(lat);
    allOrders[orderIndex].captainLon = Number(lon);
    if (heading !== undefined) allOrders[orderIndex].captainHeading = Number(heading);
    if (speed !== undefined) allOrders[orderIndex].captainSpeed = Number(speed);
    allOrders[orderIndex].lastLocationUpdate = new Date().toISOString();

    saveOrders(allOrders);

    // Instant broadcast via WebSocket to live customer map
    io.to(`order_${id}`).emit('bowser_location_changed', {
      orderId: id,
      lat: allOrders[orderIndex].captainLat,
      lon: allOrders[orderIndex].captainLon,
      heading: allOrders[orderIndex].captainHeading || null,
      speed: allOrders[orderIndex].captainSpeed || null,
      timestamp: allOrders[orderIndex].lastLocationUpdate,
    });

    res.json({
      success: true,
      message: 'Captain location updated',
      orderId: id,
      captainLat: allOrders[orderIndex].captainLat,
      captainLon: allOrders[orderIndex].captainLon,
      lastLocationUpdate: allOrders[orderIndex].lastLocationUpdate,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update captain location', details: error.message });
  }
});

// Single Order fetch with live location
app.get('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allOrders = loadOrders();
    const order = allOrders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch order', details: error.message });
  }
});

// 5. Generate & View/Download GST Tax Invoice HTML / PDF
app.get('/api/invoice/:orderId/html', (req, res) => {
  try {
    const { orderId } = req.params;
    const allOrders = loadOrders();
    const order = allOrders.find(o => o.id === orderId) || allOrders[0] || {
      id: orderId,
      name: 'Valued Customer',
      email: 'customer@example.com',
      phone: '+91 9989551305',
      address: 'Hyderabad Site, Telangana',
      liters: 200,
      fuelRate: 94.50,
      deliveryFee: 350,
      tax: 962.50,
      total: 20212.50,
      date: new Date().toLocaleDateString('en-GB'),
      paymentId: 'pay_online_success',
      paymentStatus: 'paid',
    };

    const fuelTotal = (Number(order.liters) || 200) * (Number(order.fuelRate) || 94.50);
    const delFee = Number(order.deliveryFee) || 0;
    const taxAmt = Number(order.tax) || 0;
    const cgst = (taxAmt / 2).toFixed(2);
    const sgst = (taxAmt / 2).toFixed(2);
    const grandTotal = Number(order.total) || (fuelTotal + delFee + taxAmt);

    const isCod = order.paymentMethod && order.paymentMethod.toLowerCase().includes('cash');
    const isPaid = order.paymentStatus === 'paid' || order.status === 'delivered';
    const paymentBadgeHtml = isCod
      ? (isPaid
          ? '<div class="badge-paid" style="background: #DCFCE7; color: #15803D;">✓ CASH COLLECTED ON DELIVERY</div>'
          : '<div class="badge-paid" style="background: #FEF3C7; color: #B45309;">💵 CASH ON DELIVERY (TO COLLECT AT SITE)</div>')
      : '<div class="badge-paid">✓ PAID ONLINE (UPI / CARDS / NETBANKING)</div>';

    const paymentModeLabel = isCod ? 'Cash on Delivery (Pay at Site)' : (order.paymentMethod || 'Online Prepaid (UPI / Cards / NetBanking)');
    const paymentStatusLabel = isCod
      ? (isPaid ? 'Cash Received & Fuel Delivered' : 'Pending Cash Collection on Delivery')
      : 'Completed & Reconciled (Prepaid)';

    // Read high-res EXTRA DIESEL logo from disk and embed as Base64 for 100% offline & PDF reliability
    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../../mobile-app/assets/images/logo.png');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (e) {
      console.warn('Could not read logo image:', e.message);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Tax Invoice #${order.id} - EXTRA DIESEL</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; overflow-x: hidden; background: #F8FAFC; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; padding: 16px 8px; }
    
    .print-bar { max-width: 820px; width: 100%; margin: 0 auto 12px auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .print-bar-title { font-size: 13px; color: #64748B; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .btn-group { display: flex; gap: 8px; }
    .btn-action { border: none; padding: 9px 16px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
    .btn-download { background: #DC2626; color: white; box-shadow: 0 2px 8px rgba(220,38,38,0.3); }
    .btn-print { background: #0F172A; color: white; }
    .btn-action:hover { opacity: 0.9; }

    .invoice-card { max-width: 820px; width: 100%; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #DC2626; padding-bottom: 16px; flex-wrap: wrap; gap: 14px; }
    .brand-section { display: flex; align-items: center; gap: 12px; }
    .brand-logo-img { height: 48px; max-width: 120px; object-fit: contain; }
    .brand-name { font-size: 22px; font-weight: 900; color: #DC2626; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748B; font-weight: 600; margin-top: 2px; }
    .brand-cert { font-size: 10.5px; color: #059669; font-weight: 700; margin-top: 3px; display: inline-block; }
    
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: 0.5px; }
    .invoice-num { font-size: 13px; font-weight: 800; color: #DC2626; margin-top: 2px; }
    .invoice-date { font-size: 12px; color: #64748B; margin-top: 2px; }
    .badge-paid { display: inline-block; background: #DCFCE7; color: #15803D; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-top: 6px; }

    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; padding: 14px; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; }
    .party-title { font-size: 10.5px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .party-name { font-size: 14px; font-weight: 800; color: #0F172A; }
    .party-detail { font-size: 12px; color: #475569; margin-top: 3px; line-height: 17px; word-break: break-word; }

    .table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 16px 0; border: 1px solid #E2E8F0; border-radius: 10px; }
    .items-table { width: 100%; border-collapse: collapse; min-width: 520px; }
    .items-table th { background: #0F172A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #334155; }
    .items-table td.num { text-align: right; font-weight: 600; white-space: nowrap; }
    .items-table th.num { text-align: right; }

    .totals-area { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals-box { width: 320px; max-width: 100%; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; color: #475569; }
    .totals-row.grand { border-top: 2px solid #0F172A; padding-top: 8px; margin-top: 6px; font-size: 15px; font-weight: 900; color: #0F172A; }
    .totals-row.grand .val { color: #DC2626; }

    .compliance-strip { margin-top: 18px; padding: 12px; background: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 8px; font-size: 11px; color: #991B1B; line-height: 16px; }
    .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px dashed #CBD5E1; flex-wrap: wrap; gap: 14px; }
    .sig-block { font-size: 11.5px; color: #64748B; line-height: 17px; }
    .sig-stamp { font-weight: 800; color: #0F172A; margin-top: 16px; font-size: 12px; }

    @media (max-width: 640px) {
      body { padding: 6px 4px; }
      .invoice-card { padding: 14px 10px; border-radius: 12px; }
      .header { flex-direction: column; align-items: flex-start; gap: 10px; }
      .invoice-meta { text-align: left; }
      .parties-grid { grid-template-columns: 1fr; gap: 10px; padding: 10px; }
      .totals-box { width: 100%; }
      .signatures { flex-direction: column; align-items: flex-start; }
    }

    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .print-bar { display: none !important; }
      .table-container { border: none; overflow: visible; }
      .items-table { min-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div class="print-bar-title">Official Tax Invoice • <strong>EXTRA DIESEL</strong></div>
    <div class="btn-group">
      <button class="btn-action btn-download" onclick="downloadInvoicePDF()">📥 Download PDF</button>
      <button class="btn-action btn-print" onclick="window.print()">🖨️ Print</button>
    </div>
  </div>

  <div class="invoice-card" id="invoiceCard">
    <div class="header">
      <div class="brand-section">
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="EXTRA DIESEL" class="brand-logo-img" />` : ''}
        <div>
          <div class="brand-name">EXTRA DIESEL</div>
          <div class="brand-sub">Aadhya Fuels & Infra • Doorstep Fueling Bowser Fleet</div>
          <div class="brand-cert">✓ Legal Metrology Certified (Weights & Measures)</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-num">#INV-${order.id}</div>
        <div class="invoice-date">Date: ${order.date || new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        ${paymentBadgeHtml}
      </div>
    </div>

    <div class="parties-grid">
      <div>
        <div class="party-title">Supplier / Seller Details</div>
        <div class="party-name">Aadhya Fuels & Infra</div>
        <div class="party-detail"><strong>GSTIN:</strong> 36AAACE1234F1Z5</div>
        <div class="party-detail">Plot 42, Hitech City, Hyderabad, Telangana - 500081</div>
        <div class="party-detail"><strong>Hotline:</strong> +91 9989551305 | support@extradiesel.in</div>
      </div>
      <div>
        <div class="party-title">Billed & Delivered To</div>
        <div class="party-name">${order.name || 'Valued Customer'}</div>
        <div class="party-detail"><strong>Phone:</strong> ${order.phone || '+91 9989551305'}</div>
        <div class="party-detail"><strong>Email:</strong> ${order.email || 'customer@example.com'}</div>
        <div class="party-detail"><strong>Site Address:</strong> ${order.address || 'Delivery Site, Hyderabad'}</div>
      </div>
    </div>

    <div class="table-container">
      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description of Goods / Services</th>
            <th>HSN / SAC</th>
            <th class="num">Qty</th>
            <th class="num">Rate</th>
            <th class="num">Taxable Amt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong>High Speed BS-VI Diesel (HSD)</strong><br>
              <span style="font-size: 11px; color: #64748B;">Automated calibrated bowser digital dispensing</span>
            </td>
            <td>27101951</td>
            <td class="num">${order.liters} Liters</td>
            <td class="num">₹${(Number(order.fuelRate) || 94.50).toFixed(2)}</td>
            <td class="num">₹${fuelTotal.toFixed(2)}</td>
          </tr>
          ${delFee > 0 ? `
          <tr>
            <td>2</td>
            <td>
              <strong>Doorstep Bowser Transport & Fuel Dispensing Service</strong>
            </td>
            <td>996511</td>
            <td class="num">1 Delivery</td>
            <td class="num">₹${delFee.toFixed(2)}</td>
            <td class="num">₹${delFee.toFixed(2)}</td>
          </tr>` : ''}
        </tbody>
      </table>
    </div>

    <div class="totals-area">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal (Taxable Value):</span>
          <span style="font-weight: 700;">₹${(fuelTotal + delFee).toFixed(2)}</span>
        </div>
        ${taxAmt > 0 ? `
        <div class="totals-row">
          <span>CGST (2.5%):</span>
          <span>₹${cgst}</span>
        </div>
        <div class="totals-row">
          <span>SGST (2.5%):</span>
          <span>₹${sgst}</span>
        </div>` : ''}
        <div class="totals-row grand">
          <span>Total Amount Payable:</span>
          <span class="val">₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="compliance-strip">
      <strong>Legal Metrology & Quality Declaration:</strong> Fuel dispensed with micro-filtered flow meters certified by the Department of Legal Metrology (Weights & Measures). Density BS-VI verified (820-845 kg/m³). Tamper-evident automated digital register delivery.
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div><strong>Payment Mode:</strong> ${paymentModeLabel}</div>
        <div><strong>Transaction Status:</strong> ${paymentStatusLabel}</div>
        <div style="margin-top: 6px; font-size: 11px; color: #94A3B8;">This is a computer-generated tax invoice and requires no physical signature.</div>
      </div>
      <div style="text-align: right;">
        <div class="sig-stamp">For AADHYA FUELS & INFRA</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Authorized Signatory</div>
      </div>
    </div>
  </div>

  <script>
    function downloadInvoicePDF() {
      const element = document.getElementById('invoiceCard');
      const btn = document.querySelector('.btn-download');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Saving PDF...';
      btn.disabled = true;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: 'EXTRA_DIESEL_Invoice_${order.id}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }).catch((err) => {
        console.error('PDF error:', err);
        window.print();
        btn.innerHTML = originalText;
        btn.disabled = false;
      });
    }

    // Auto-trigger download if ?download=1 in query
    if (window.location.search.includes('download=1') || window.location.search.includes('download=true')) {
      setTimeout(downloadInvoicePDF, 600);
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('<h3>Failed to generate invoice</h3>');
  }
});

// -------------------------------------------------------------------------
// ADMIN DASHBOARD STATS & CSV EXPORT
// -------------------------------------------------------------------------

// 1. Dashboard Metrics (Total Earnings, Today's Earnings, Pending & Delivered counts)
app.get('/api/admin/stats', (req, res) => {
  try {
    const allOrders = loadOrders();
    const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }); // matches Indian date

    let totalEarnings = 0;
    let todayEarnings = 0;
    let pendingOrdersCount = 0;
    let deliveredOrdersCount = 0;

    allOrders.forEach(o => {
      const orderTotal = Number(o.total) || 0;
      if (o.status !== 'cancelled') {
        totalEarnings += orderTotal;

        // Check if created today
        const orderDateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : '';
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
// SERVE EXPORTED REACT NATIVE WEB BUILD & ASSETS
// -------------------------------------------------------------------------
const ASSETS_PATH = path.join(__dirname, '../../mobile-app/assets');
if (fs.existsSync(ASSETS_PATH)) {
  console.log(`[Static] Serving assets from ${ASSETS_PATH}`);
  app.use('/assets', express.static(ASSETS_PATH));
}

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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Extra Diesel AWS Backend with Socket.io running on port ${PORT}`);
  console.log(`📍 S3 Bucket: ${S3_BUCKET} (${process.env.AWS_REGION || 'ap-south-1'})`);
  console.log(`⛽ Live Rate: ₹${currentSettings.dieselRate}/L | Delivery 0-500L: ₹${currentSettings.deliveryChargeUpTo500}`);
});
