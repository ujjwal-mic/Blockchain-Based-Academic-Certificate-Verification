/**
 * server.js
 * ----------
 * Entry point. Starts the Express server, serves the frontend
 * from /public, and mounts the API routes under /api.
 *
 * Run with:  npm start   (then open http://localhost:3000)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const certificateRoutes = require('./routes/certificates');
const { readLedger } = require('./utils/ledger');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json()); // lets us read JSON sent from the forms
app.use(express.static(path.join(__dirname, 'public'))); // serves the frontend

// ---- API routes ----
app.use('/api', certificateRoutes);

// ---- Unknown API route ----
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ---- Error handler (catches anything thrown in routes) ----
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

// Make sure ledger.json exists before we start accepting requests.
readLedger();

app.listen(PORT, () => {
  console.log(`Certificate verification server running at http://localhost:${PORT}`);
});
