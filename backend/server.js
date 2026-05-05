const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Global in-memory store
global.db = { users: [], tests: [], submissions: [], homework: [], notifications: [], announcements: [], grades: [] };
global.dbReady = false;

// MongoDB (optional)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edupredict_v2')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(() => console.log('📦 Using in-memory store'));

// Seed data
const { seedData } = require('./utils/seed');
seedData().then(() => { global.dbReady = true; console.log('✅ Data seeded'); });

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/tests',         require('./routes/tests'));
app.use('/api/submissions',   require('./routes/submissions'));
app.use('/api/homework',      require('./routes/homework'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/prediction',    require('./routes/prediction'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/schedule',      require('./routes/schedule'));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌌 EduPredict AI v2 — Aurora Edition`);
  console.log(`🚀 Running at http://localhost:${PORT}`);
  console.log(`\n  Admin:   admin@school.edu / admin123`);
  console.log(`  Teacher: sarah@school.edu  / teacher123`);
  console.log(`  Student: alice@school.edu  / student123\n`);
});

module.exports = app;
