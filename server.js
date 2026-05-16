/**
 * MediCare Clinic – Backend Server
 */

try {
  require.resolve('express');
  require.resolve('cors');
} catch (err) {
  console.error('\n❌ Missing required dependencies!');
  console.error('Run: npm install\n');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
const PORT = process.env.PORT || 5000;

const DB = path.join(__dirname, 'appointments.json');

const DOCTOR_AUTH = {
  username: 'harshith',
  password: '123',
  displayName: 'Dr. Harshith'
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database Helpers
function readAll() {
  if (!fs.existsSync(DB)) return [];

  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), 'utf8');
}

// GET all appointments
app.get('/api/appointments', (req, res) => {
  const appts = readAll();

  res.json(
    appts.sort(
      (a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
    )
  );
});

// Create appointment
app.post('/api/appointments', (req, res) => {
  const {
    fullName,
    age,
    gender,
    phone,
    email,
    date,
    time,
    reason
  } = req.body;

  if (
    !fullName ||
    !age ||
    !gender ||
    !phone ||
    !email ||
    !date ||
    !time
  ) {
    return res
      .status(400)
      .json({ error: 'Missing required fields.' });
  }

  const appt = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 5),

    fullName: String(fullName).trim(),
    age: Number(age),
    gender: String(gender),
    phone: String(phone).trim(),
    email: String(email).trim().toLowerCase(),
    date: String(date),
    time: String(time),
    reason: reason ? String(reason).trim() : '',
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  const appts = readAll();

  appts.push(appt);

  writeAll(appts);

  console.log(
    `[NEW] ${appt.fullName} — ${appt.date} ${appt.time}`
  );

  res.status(201).json(appt);
});

// Get single appointment
app.get('/api/appointments/:id', (req, res) => {
  const appt = readAll().find(
    a => a.id === req.params.id
  );

  if (!appt) {
    return res.status(404).json({
      error: 'Not found.'
    });
  }

  res.json(appt);
});

// Update appointment status
app.patch('/api/appointments/:id/status', async (req, res) => {
  const { status } = req.body;

  const allowed = [
    'pending',
    'confirmed',
    'cancelled'
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Status must be one of: ${allowed.join(', ')}`
    });
  }

  const appts = readAll();

  const idx = appts.findIndex(
    a => a.id === req.params.id
  );

  if (idx === -1) {
    return res.status(404).json({
      error: 'Not found.'
    });
  }

  appts[idx].status = status;
  appts[idx].updatedAt = new Date().toISOString();

  writeAll(appts);

  console.log(
    `[PATCH] ${appts[idx].fullName} → ${status}`
  );

  // Auto send SMS
  try {
    if (status === 'confirmed') {
      await client.messages.create({
        body: 'Doctor confirmed your appointment.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: appts[idx].phone
      });

      console.log(
        `[SMS] Confirmation sent to ${appts[idx].phone}`
      );
    }

    if (status === 'cancelled') {
      await client.messages.create({
        body: 'Doctor rejected your appointment.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: appts[idx].phone
      });

      console.log(
        `[SMS] Rejection sent to ${appts[idx].phone}`
      );
    }

  } catch (err) {

    console.log(
      `[SMS ERROR] ${err.message}`
    );
  }

  res.json(appts[idx]);
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
  const appts = readAll();

  const idx = appts.findIndex(
    a => a.id === req.params.id
  );

  if (idx === -1) {
    return res.status(404).json({
      error: 'Not found.'
    });
  }

  const [removed] = appts.splice(idx, 1);

  writeAll(appts);

  console.log(
    `[DELETE] ${removed.fullName}`
  );

  res.json({
    message: 'Deleted.',
    id: removed.id
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === DOCTOR_AUTH.username &&
    password === DOCTOR_AUTH.password
  ) {
    return res.json({
      username: DOCTOR_AUTH.username,
      displayName: DOCTOR_AUTH.displayName,
      token: 'doctor-session-token'
    });
  }

  res.status(401).json({
    error: 'Invalid username or password.'
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({
    message: 'Logged out'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.'
  });
});

// Start Server
function startServer(port = PORT) {

  const server = app.listen(port, () => {

    console.log(
      `✅ MediCare backend running on port ${port}`
    );

  });

  server.on('error', err => {

    if (err.code === 'EADDRINUSE') {

      console.error(
        `❌ Port ${port} already in use`
      );

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