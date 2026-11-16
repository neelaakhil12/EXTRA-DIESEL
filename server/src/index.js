import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend domain (Vercel or localhost)
app.use(cors({
  origin: '*', // Adjust to specific frontend domains in production: ['https://extra-diesel.vercel.app', 'http://localhost:3000']
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// S3 Client Configuration (uses IAM Role on EC2 or ENV credentials)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined // If undefined, AWS SDK automatically picks up the EC2 IAM Instance Role!
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'extra-diesel-storage-ap-south-1';

// Multer memory storage for in-memory file streaming to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// 1. Health check endpoint (for Load Balancer and EC2 verification)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Extra Diesel Backend',
    region: process.env.AWS_REGION || 'ap-south-1',
    timestamp: new Date().toISOString()
  });
});

// 2. S3 Document & Invoice Upload Endpoint
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

// 3. Get Presigned Download URL for S3 files
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

// 4. Diesel Fuel Rate API
app.get('/api/fuel-rate', (req, res) => {
  res.json({
    rate: 94.50,
    currency: 'INR',
    unit: 'Liter',
    city: 'Hyderabad',
    updatedAt: new Date().toISOString()
  });
});

// 5. Orders API
let orders = [];

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: `ED${new Date().getFullYear()}${String(Date.now()).slice(-4)}`,
    createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status: 'placed',
    ...req.body
  };
  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  res.json(order);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Extra Diesel AWS Backend running on port ${PORT}`);
  console.log(`📍 Region: ${process.env.AWS_REGION || 'ap-south-1'}`);
});
