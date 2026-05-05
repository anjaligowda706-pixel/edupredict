const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { studentId, testId, subject } = req.query;
  let subs = [...global.db.submissions];
  if (req.user.role === 'student') subs = subs.filter(s => s.studentId === req.user.id);
  else if (studentId) subs = subs.filter(s => s.studentId === studentId);
  if (testId) subs = subs.filter(s => s.testId === testId);
  if (subject) subs = subs.filter(s => s.subject === subject);
  res.json({ success: true, submissions: subs });
});

router.post('/', auth, authorize('student'), (req, res) => {
  const { testId, answers, timeTaken, autoSubmitted } = req.body;
  const test = global.db.tests.find(t => (t._id||t.id) === testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const existing = global.db.submissions.find(s => s.testId === testId && s.studentId === req.user.id);
  if (existing) return res.status(400).json({ error: 'Already submitted' });

  let score = 0;
  const processed = (answers||[]).map((a, i) => {
    const q = test.questions[i];
    const correct = q && a.selectedOption === q.correctAnswer;
    const marks = correct ? (q.marks||1) : 0;
    score += marks;
    return { ...a, isCorrect: correct, marksObtained: marks };
  });

  const totalMarks = test.totalMarks || test.questions.reduce((s,q) => s+(q.marks||1),0);
  const percentage = Math.round((score/totalMarks)*1000)/10;
  const id = `SUB-${uuidv4().slice(0,8)}`;

  const sub = {
    _id: id, id, testId, studentId: req.user.id, studentName: req.user.name,
    answers: processed, score, totalMarks, percentage,
    subject: test.subject, timeTaken, autoSubmitted: !!autoSubmitted, submittedAt: new Date()
  };
  global.db.submissions.push(sub);

  // Auto notification
  if (percentage < 50) {
    global.db.notifications.push({
      _id: `N-${uuidv4().slice(0,8)}`, userId: req.user.id,
      message: `⚠️ Your ${test.subject} score was ${percentage}%. Consider reviewing.`,
      type: 'warning', read: false, createdAt: new Date()
    });
  } else if (percentage >= 90) {
    global.db.notifications.push({
      _id: `N-${uuidv4().slice(0,8)}`, userId: req.user.id,
      message: `🌟 Outstanding! You scored ${percentage}% in ${test.subject}!`,
      type: 'success', read: false, createdAt: new Date()
    });
  }

  res.status(201).json({ success: true, submission: sub, score, totalMarks, percentage });
});

module.exports = router;
