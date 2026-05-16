/**
 * MediCare Clinic – Backend Server
 * Node.js + Express (no database required — uses a local JSON file)
 *
 * Setup:
 *   npm init -y
 *   npm install express cors
 *   node server.js
 *
 * Server runs at: https://medicare-clinic-al61.onrender.com
 *
 * API Endpoints:
 *   GET    /api/appointments            → list all appointments
 *   POST   /api/appointments            → create new appointment
 *   GET    /api/appointments/:id        → get one appointment
 *   PATCH  /api/appointments/:id/status → update status
 *   DELETE /api/appointments/:id        → delete appointment
 */

// Check if dependencies are installed
try {
  require.resolve('express');
  require.resolve('cors');
} catch (err) {
  console.error('\n❌  Missing required dependencies!');
  console.error('   Run: npm install\n');
  process.exit(1);
}

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const twilio  = require('twilio');

const client = twilio(
  'AC832225909676c10880258e74e62f0ce9',
  'c0c1647e3140da0b8a7a453a5b09e51b'
);

const app  = express();
const PORT = 5000;
const DB   = path.join(__dirname, 'appointments.json');
const DOCTOR_AUTH = { username: 'harshith', password: '123', displayName: 'Dr. Harshith' };

// ── Middleware ──
app.use(cors());
app.use(express.json());

// Serve index.html from same folder
app.use(express.static(__dirname));

// ── DB helpers (flat JSON file) ──
function readAll() {
  if (!fs.existsSync(DB)) return [];
  try { return JSON.parse(fs.readFileSync(DB, 'utf8')); }
  catch { return []; }
}

function writeAll(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), 'utf8');
}

// ── Routes ──

// GET all appointments (newest first)
app.get('/api/appointments', (req, res) => {
  const appts = readAll();
  res.json(appts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
});

// POST create appointment
app.post('/api/appointments', (req, res) => {
  const { fullName, age, gender, phone, email, date, time, reason } = req.body;

  if (!fullName || !age || !gender || !phone || !email || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const appt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    fullName: String(fullName).trim(),
    age: Number(age),
    gender: String(gender),
    phone: String(phone).trim(),
    email: String(email).trim().toLowerCase(),
    date: String(date),
    time: String(time),
    reason: reason ? String(reason).trim() : '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const appts = readAll();
  appts.push(appt);
  writeAll(appts);

  console.log(`[NEW]  ${appt.fullName} — ${appt.date} ${appt.time} (${appt.id})`);
  res.status(201).json(appt);
});

// GET single appointment
app.get('/api/appointments/:id', (req, res) => {
  const appt = readAll().find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found.' });
  res.json(appt);
});

// PATCH update status
app.patch('/api/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const appts = readAll();
  const idx   = appts.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });

  appts[idx].status    = status;
  appts[idx].updatedAt = new Date().toISOString();
  writeAll(appts);

  console.log(`[PATCH] ${appts[idx].fullName} → ${status}`);
  res.json(appts[idx]);
});

// DELETE appointment
app.delete('/api/appointments/:id', (req, res) => {
  const appts = readAll();
  const idx   = appts.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });

  const [removed] = appts.splice(idx, 1);
  writeAll(appts);

  console.log(`[DELETE] ${removed.fullName} (${removed.id})`);
  res.json({ message: 'Deleted.', id: removed.id });
});

// Doctor login/logout
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === DOCTOR_AUTH.username && password === DOCTOR_AUTH.password) {
    return res.json({ username: DOCTOR_AUTH.username, displayName: DOCTOR_AUTH.displayName, token: 'doctor-session-token' });
  }
  res.status(401).json({ error: 'Invalid username or password.' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

// Confirm appointment – send SMS to patient
app.post('/confirm-patient', async (req, res) => {
  const patientPhone = req.body.phone;

  try {
    await client.messages.create({
      body: 'Doctor confirmed your appointment',
      from: '+15706005087',
      to: patientPhone
    });
    console.log(`[SMS] Confirmation sent to ${patientPhone}`);
    res.json({ success: true, message: 'SMS Sent' });
  } catch (err) {
    console.log(`[SMS ERROR] Could not send confirmation to ${patientPhone}: ${err.message}`);
    res.json({ success: false, message: 'SMS failed (trial account - verify number at twilio.com)', error: err.message });
  }
});

// Reject appointment – send SMS to patient
app.post('/reject-patient', async (req, res) => {
  const patientPhone = req.body.phone;

  try {
    await client.messages.create({
      body: 'Doctor rejected your appointment.',
      from: '+15706005087',
      to: patientPhone
    });
    console.log(`[SMS] Rejection sent to ${patientPhone}`);
    res.json({ success: true, message: 'Rejection SMS Sent' });
  } catch (err) {
    console.log(`[SMS ERROR] Could not send rejection to ${patientPhone}: ${err.message}`);
    res.json({ success: false, message: 'SMS failed (trial account - verify number at twilio.com)', error: err.message });
  }
});

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Start ──
function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`\n✅  MediCare backend running at http://localhost:${port}`);
    console.log(`    Open http://localhost:${port} in your browser\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${port} is already in use!`);
      console.error(`    • Close other apps using port ${port}`);
      console.error('    • Or change the port in server.js or set PORT environment variable.\n');
      process.exit(1);
    }
    throw err;
  });

  return server;
}

module.exports = { startServer };

if (require.main === module) {
  startServer();
}
