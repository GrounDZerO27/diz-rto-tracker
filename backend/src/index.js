require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const holidayRoutes    = require('./routes/holidays');

const app  = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// CORS — restrict to the deployed origin in production
const allowedOrigin = process.env.APP_URL || 'http://localhost:4200';
app.use(cors({ origin: allowedOrigin, credentials: false }));

// Body parsing — 10 kb limit to prevent oversized payloads
app.use(express.json({ limit: '10kb' }));

// Rate limiting on auth endpoints: max 20 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Routes
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/holidays',   holidayRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`RTO Tracker API running on http://localhost:${PORT}`);
});
