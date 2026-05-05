// ===== HOMEWORK =====
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
const upDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, upDir),
  filename: (r, f, cb) => cb(null, `${Date.now()}-${f.originalname.replace(/\s/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 }, fileFilter: (r,f,cb) => {
  const ok = ['.pdf','.jpg','.jpeg','.png','.doc','.docx'].includes(path.extname(f.originalname).toLowerCase());
  cb(ok ? null : new Error('Invalid file type'), ok);
}});

router.get('/', auth, (req, res) => {
  const { studentId, subject, status } = req.query;
  let hw = [...global.db.homework];
  if (req.user.role === 'student') hw = hw.filter(h => h.studentId === req.user.id);
  else if (studentId) hw = hw.filter(h => h.studentId === studentId);
  if (subject) hw = hw.filter(h => h.subject === subject);
  if (status) hw = hw.filter(h => h.status === status);
  res.json({ success: true, homework: hw.sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt)) });
});

router.post('/', auth, authorize('student'), upload.single('file'), (req, res) => {
  const { subject, title, description } = req.body;
  if (!subject || !title) return res.status(400).json({ error: 'Subject and title required' });
  const id = `HW-${uuidv4().slice(0,8)}`;
  const hw = {
    _id: id, id, studentId: req.user.id, studentName: req.user.name,
    subject, title, description,
    filePath: req.file ? `/uploads/${req.file.filename}` : null,
    fileName: req.file?.originalname || null,
    status: 'submitted', marks: null, maxMarks: 10, feedback: null,
    submittedAt: new Date()
  };
  global.db.homework.push(hw);
  res.status(201).json({ success: true, homework: hw });
});

router.put('/:id/grade', auth, authorize('teacher', 'admin'), (req, res) => {
  const idx = global.db.homework.findIndex(h => (h._id||h.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { marks, maxMarks, feedback } = req.body;
  global.db.homework[idx] = { ...global.db.homework[idx], marks: parseInt(marks), maxMarks: parseInt(maxMarks)||10, feedback, status: 'graded', gradedBy: req.user.name, gradedAt: new Date() };
  res.json({ success: true, homework: global.db.homework[idx] });
});

module.exports = router;
