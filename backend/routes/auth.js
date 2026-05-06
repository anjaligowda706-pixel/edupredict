const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'edupredict_fallback_secret';
const token = (u) => jwt.sign({ id: u._id, email: u.email, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });
const safe = (u) => { const o = u.toObject(); delete o.password; return o; };

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role === 'student' && user.approvalStatus === 'pending') {
      return res.status(403).json({ error: 'Your account is pending mentor approval.' });
    }
    if (user.role === 'student' && user.approvalStatus === 'rejected') {
      return res.status(403).json({ error: 'Your registration was rejected. Contact admin.' });
    }
    user.lastLogin = new Date();
    await user.save();
    res.json({ success: true, token: token(user), user: safe(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, teacherId, class: cls, section } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already exists' });
    const isStudent = (role || 'student') === 'student';
    const user = await User.create({
      name, email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: role || 'student',
      studentId, teacherId, class: cls, section,
      approvalStatus: isStudent ? 'pending' : 'approved',
      lastLogin: new Date()
    });
    if (isStudent) {
      return res.status(201).json({ success: true, pending: true, message: 'Registration successful! Waiting for mentor approval.' });
    }
    res.status(201).json({ success: true, token: token(user), user: safe(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET ME
router.get('/me', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, user: safe(u) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PENDING STUDENTS
router.get('/pending-students', auth, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const students = await User.find({ role: 'student', approvalStatus: 'pending' }).select('-password');
  res.json({ success: true, students });
});

// APPROVE/REJECT
router.put('/approve/:studentId', auth, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const { action } = req.body;
  await User.findByIdAndUpdate(req.params.studentId, { approvalStatus: action });
  res.json({ success: true, message: 'Student ' + action });
});

module.exports = router;
