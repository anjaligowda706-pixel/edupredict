// ===== TESTS ROUTES =====
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { subject, active } = req.query;
  let tests = [...global.db.tests];
  if (subject) tests = tests.filter(t => t.subject === subject);
  if (active !== undefined) tests = tests.filter(t => t.isActive === (active === 'true'));
  if (req.user.role === 'student') {
    tests = tests.map(t => ({ ...t, questions: t.questions.map(q => ({ ...q, correctAnswer: undefined })) }));
  }
  res.json({ success: true, tests });
});

router.get('/:id', auth, (req, res) => {
  const test = global.db.tests.find(t => (t._id||t.id) === req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found' });
  let t = { ...test };
  if (req.user.role === 'student') t.questions = t.questions.map(q => ({ ...q, correctAnswer: undefined }));
  res.json({ success: true, test: t });
});

router.post('/', auth, authorize('teacher', 'admin'), (req, res) => {
  const { title, subject, description, questions, duration, assignedClass, startDate, endDate } = req.body;
  if (!title || !subject || !questions?.length || !duration) return res.status(400).json({ error: 'Missing fields' });
  const totalMarks = questions.reduce((s, q) => s + (q.marks||1), 0);
  const id = `TEST-${uuidv4().slice(0,8)}`;
  const test = { _id: id, id, title, subject, description, questions, duration, totalMarks, createdBy: req.user.id, assignedClass, startDate, endDate, isActive: true, createdAt: new Date() };
  global.db.tests.push(test);
  res.status(201).json({ success: true, test, message: 'Test published!' });
});

router.put('/:id', auth, authorize('teacher', 'admin'), (req, res) => {
  const idx = global.db.tests.findIndex(t => (t._id||t.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  global.db.tests[idx] = { ...global.db.tests[idx], ...req.body };
  res.json({ success: true, test: global.db.tests[idx] });
});

router.delete('/:id', auth, authorize('teacher', 'admin'), (req, res) => {
  global.db.tests = global.db.tests.filter(t => (t._id||t.id) !== req.params.id);
  res.json({ success: true });
});

module.exports = router;
