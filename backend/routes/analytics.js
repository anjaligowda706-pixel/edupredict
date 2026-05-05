const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');

router.get('/overview', auth, authorize('admin','teacher'), (req, res) => {
  const students = global.db.users.filter(u => u.role==='student' && u.isActive!==false);
  const teachers = global.db.users.filter(u => u.role==='teacher' && u.isActive!==false);
  const subs = global.db.submissions;
  const hw = global.db.homework;
  const tests = global.db.tests;

  const avgScore = subs.length ? Math.round(subs.reduce((s,sub)=>s+sub.percentage,0)/subs.length*10)/10 : 0;
  const avgAtt = students.length ? Math.round(students.reduce((s,u)=>s+(u.attendance||75),0)/students.length) : 0;

  const subjectMap = {};
  subs.forEach(s => {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = [];
    subjectMap[s.subject].push(s.percentage);
  });
  const subjectPerformance = Object.entries(subjectMap).map(([subject, scores]) => ({
    subject, average: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length), count: scores.length
  })).sort((a,b)=>b.average-a.average);

  const weekly = Array.from({length:7}, (_,i) => {
    const day = new Date(); day.setDate(day.getDate()-6+i);
    const dayStart = new Date(day.setHours(0,0,0,0));
    const dayEnd = new Date(day.setHours(23,59,59,999));
    return {
      day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(dayStart).getDay()],
      submissions: subs.filter(s => new Date(s.submittedAt)>=dayStart && new Date(s.submittedAt)<=dayEnd).length
    };
  });

  res.json({ success: true, overview: {
    totalStudents: students.length, totalTeachers: teachers.length,
    totalTests: tests.length, totalSubmissions: subs.length,
    totalHomework: hw.length, avgScore, avgAttendance: avgAtt,
    pendingGrades: hw.filter(h=>h.status==='submitted').length,
    subjectPerformance, weekly
  }});
});

router.get('/student/:id', auth, (req, res) => {
  if (req.user.role==='student' && req.user.id!==req.params.id) return res.status(403).json({error:'Forbidden'});
  const subs = global.db.submissions.filter(s => s.studentId===req.params.id);
  const hw = global.db.homework.filter(h => h.studentId===req.params.id);

  const subjectMap = {};
  subs.forEach(s => {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = [];
    subjectMap[s.subject].push(s.percentage);
  });
  const subjectPerformance = Object.entries(subjectMap).map(([subject, scores]) => ({
    subject, average: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),
    highest: Math.max(...scores), lowest: Math.min(...scores), tests: scores.length,
    status: scores.reduce((a,b)=>a+b,0)/scores.length >= 70 ? 'strong' : scores.reduce((a,b)=>a+b,0)/scores.length >= 50 ? 'average' : 'weak'
  }));

  const timeline = [...subs].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt)).map(s=>({
    date: new Date(s.submittedAt).toLocaleDateString('en-IN',{month:'short',day:'numeric'}),
    score: s.percentage, subject: s.subject
  }));

  const gradedHw = hw.filter(h=>h.marks!=null);
  const avgHw = gradedHw.length ? Math.round(gradedHw.reduce((s,h)=>s+(h.marks/(h.maxMarks||10))*100,0)/gradedHw.length) : 0;

  res.json({ success: true, analytics: {
    totalTests: subs.length,
    avgScore: subs.length ? Math.round(subs.reduce((s,sub)=>s+sub.percentage,0)/subs.length) : 0,
    subjectPerformance, timeline,
    homework: { submitted: hw.length, graded: gradedHw.length, avgScore: avgHw }
  }});
});

module.exports = router;
