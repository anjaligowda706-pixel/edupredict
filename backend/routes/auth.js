const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'edupredict_fallback_secret';
const token = (u) => jwt.sign({ id: u._id||u.id, email: u.email, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });

const safe = (u) => { const o = {...u}; delete o.password; return o; };

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = global.db.users.find(u => u.email === email.toLowerCase() && u.isActive !== false);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    user.lastLogin = new Date();
    res.json({ success: true, token: token(user), user: safe(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, teacherId, class: cls, section } = req.body;
    if (global.db.users.find(u => u.email === email.toLowerCase())) return res.status(400).json({ error: 'Email already exists' });
    const newUser = {
      _id: uuidv4(), id: uuidv4(), name, email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: role || 'student', studentId, teacherId,
      class: cls, section, isActive: true, attendance: 85,
      subjects: [], createdAt: new Date(), lastLogin: new Date()
    };
    global.db.users.push(newUser);
    res.status(201).json({ success: true, token: token(newUser), user: safe(newUser) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', auth, (req, res) => {
  const u = global.db.users.find(u => (u._id||u.id) === req.user.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, user: safe(u) });
});

router.put('/profile', auth, async (req, res) => {
  const idx = global.db.users.findIndex(u => (u._id||u.id) === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { name, phone, bio } = req.body;
  global.db.users[idx] = { ...global.db.users[idx], name, phone, bio };
  res.json({ success: true, user: safe(global.db.users[idx]) });
});

module.exports = router;
