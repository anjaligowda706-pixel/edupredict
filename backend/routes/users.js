const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');

const safe = (u) => { const o = {...u}; delete o.password; return o; };

router.get('/', auth, authorize('admin', 'teacher'), (req, res) => {
  const { role, search, page = 1, limit = 100 } = req.query;
  let users = global.db.users.map(safe);
  if (role) users = users.filter(u => u.role === role);
  if (search) users = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.includes(search.toLowerCase()) || u.studentId?.includes(search));
  const total = users.length;
  const start = (page - 1) * limit;
  res.json({ success: true, users: users.slice(start, start + parseInt(limit)), total, pages: Math.ceil(total / limit) });
});

router.get('/students', auth, authorize('admin', 'teacher'), (req, res) => {
  res.json({ success: true, students: global.db.users.filter(u => u.role === 'student' && u.isActive !== false).map(safe) });
});

router.get('/:id', auth, (req, res) => {
  const u = global.db.users.find(u => (u._id||u.id) === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, user: safe(u) });
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  const { name, email, password, role, studentId, teacherId, class: cls, section, subjects, attendance } = req.body;
  if (global.db.users.find(u => u.email === email?.toLowerCase())) return res.status(400).json({ error: 'Email exists' });
  const id = uuidv4();
  const newUser = {
    _id: id, id, name, email: email.toLowerCase(),
    password: await bcrypt.hash(password || 'password123', 10),
    role: role || 'student', studentId, teacherId,
    class: cls, section, subjects: subjects || [], attendance: attendance || 80,
    isActive: true, createdAt: new Date(), lastLogin: null
  };
  global.db.users.push(newUser);
  res.status(201).json({ success: true, user: safe(newUser) });
});

router.post('/bulk', auth, authorize('admin'), async (req, res) => {
  const { students } = req.body;
  let created = 0, errors = [];
  for (const s of students || []) {
    if (!s.email || global.db.users.find(u => u.email === s.email.toLowerCase())) { errors.push(`${s.email} skipped`); continue; }
    const id = uuidv4();
    global.db.users.push({
      _id: id, id, name: s.name, email: s.email.toLowerCase(),
      password: await bcrypt.hash(s.password || 'student123', 10),
      role: 'student', studentId: s.studentId, class: s.class, section: s.section || 'A',
      subjects: [], isActive: true, attendance: parseInt(s.attendance) || 80,
      createdAt: new Date(), lastLogin: null
    });
    created++;
  }
  res.json({ success: true, created, errors, message: `${created} students imported` });
});

router.put('/:id', auth, async (req, res) => {
  const idx = global.db.users.findIndex(u => (u._id||u.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { password, ...updates } = req.body;
  if (password) updates.password = await bcrypt.hash(password, 10);
  global.db.users[idx] = { ...global.db.users[idx], ...updates };
  res.json({ success: true, user: safe(global.db.users[idx]) });
});

router.delete('/:id', auth, authorize('admin'), (req, res) => {
  const idx = global.db.users.findIndex(u => (u._id||u.id) === req.params.id);
  if (idx !== -1) global.db.users[idx].isActive = false;
  res.json({ success: true, message: 'User deactivated' });
});

module.exports = router;
