/**
 * Extra Diesel - Bowser Fuel Tanker Live GPS Route Simulator
 * Simulates real-time Swiggy/Rapido-style GPS streaming from the driver bowser
 * to the Extra Diesel customer tracking screen.
 * 
 * Usage:
 *   node simulator/tankerSimulator.js [orderId] [apiBaseUrl]
 * 
 * Example:
 *   node simulator/tankerSimulator.js ED2026237489 http://localhost:5000
 *   node simulator/tankerSimulator.js ED2026237489 https://extradiesel.in
 */

const http = require('http');
const https = require('https');

const args = process.argv.slice(2);
const TARGET_ORDER_ID = args[0] || 'ED2026237489';
const API_BASE = args[1] || 'https://extradiesel.in';

// Coordinates: Terminal Depot -> Customer Delivery Site (Hyderabad)
const DEPOT = { lat: 17.3550, lon: 78.5150, name: 'Saroornagar Fuel Depot' };
const DESTINATION = { lat: 17.313112, lon: 78.545285, name: 'Almasguda Site Destination' };

// Key road waypoints along inner ring road to destination
const KEY_WAYPOINTS = [
  [17.355000, 78.515000], // Depot departure
  [17.351200, 78.518400], // Karmanghat Road
  [17.346500, 78.523100], // Champapet Junction
  [17.341800, 78.528900], // Sagar Ring Road cross
  [17.337200, 78.533200], // Bairamalguda Flyover
  [17.331500, 78.537500], // BN Reddy Nagar
  [17.324200, 78.541200], // Chaitanya Hills Road
  [17.318800, 78.543500], // Almasguda Main Entrance
  [17.313112, 78.545285], // Delivery Site Intake Point
];

// Linear interpolation to generate smooth 40-step path
function generateDensePath(points, totalSteps = 45) {
  const dense = [];
  const segments = points.length - 1;
  const stepsPerSegment = Math.floor(totalSteps / segments);

  for (let i = 0; i < segments; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const count = i === segments - 1 ? totalSteps - dense.length : stepsPerSegment;
    for (let s = 0; s < count; s++) {
      const t = s / count;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lon = p1[1] + (p2[1] - p1[1]) * t;
      dense.push([lat, lon]);
    }
  }
  dense.push(points[points.length - 1]);
  return dense;
}

// Calculate compass bearing angle (0° = North, 90° = East, etc.)
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return Math.round((brng + 360) % 360);
}

// Calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2);
}

// Post GPS payload to backend
function sendGpsUpdate(orderId, lat, lon, heading, speed) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}/api/orders/${orderId}/location`);
    const payload = JSON.stringify({
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      heading: Number(heading),
      speed: Number(speed),
      driverEmail: 'captain@extradiesel.in',
      timestamp: new Date().toISOString(),
    });

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runSimulation() {
  console.log('===========================================================');
  console.log('🚛 EXTRA DIESEL - BOWSER TANKER GPS LIVE SIMULATOR');
  console.log('===========================================================');
  console.log(`📍 Target Order: #${TARGET_ORDER_ID}`);
  console.log(`🌐 API Gateway: ${API_BASE}`);
  console.log(`🏢 Depot: ${DEPOT.name} (${DEPOT.lat}, ${DEPOT.lon})`);
  console.log(`🎯 Destination: ${DESTINATION.name} (${DESTINATION.lat}, ${DESTINATION.lon})`);
  console.log('-----------------------------------------------------------');

  const pathSteps = generateDensePath(KEY_WAYPOINTS, 40);
  console.log(`Generated ${pathSteps.length} route coordinates along blue route.`);
  console.log('Broadcasting GPS stream every 3 seconds...\n');

  let step = 0;
  const interval = setInterval(async () => {
    if (step >= pathSteps.length - 1) {
      console.log('\n🎉 [ARRIVAL] Bowser has reached the customer site destination!');
      clearInterval(interval);
      return;
    }

    const cur = pathSteps[step];
    const next = pathSteps[step + 1];
    const heading = calculateBearing(cur[0], cur[1], next[0], next[1]);
    const remainingKm = calculateDistance(cur[0], cur[1], DESTINATION.lat, DESTINATION.lon);
    const speed = Math.floor(32 + Math.random() * 12); // 32 - 44 km/h

    const progressPct = Math.round((step / (pathSteps.length - 1)) * 100);
    const progressBar = '█'.repeat(Math.floor(progressPct / 5)) + '░'.repeat(20 - Math.floor(progressPct / 5));

    try {
      await sendGpsUpdate(TARGET_ORDER_ID, cur[0], cur[1], heading, speed);
      console.log(
        `[${new Date().toLocaleTimeString()}] ` +
        `[${progressBar}] ${progressPct}% | ` +
        `📍 (${cur[0].toFixed(5)}, ${cur[1].toFixed(5)}) | ` +
        `🧭 ${heading}° | ` +
        `🏎️ ${speed} km/h | ` +
        `⚡ Rem: ${remainingKm} km`
      );
    } catch (err) {
      console.warn(`[Broadcast Warning] Could not reach server: ${err.message}`);
    }

    step++;
  }, 3000);
}

runSimulation();
