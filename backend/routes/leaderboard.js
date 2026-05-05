// leaderboard.js
const express = require('express');
const r1 = express.Router();
const { auth } = require('../middleware/auth');

r1.get('/', auth, (req, res) => {
  const students = global.db.users.filter(u=>u.role==='student'&&u.isActive!==false);
  const board = students.map(s => {
    const sid = s._id||s.id;
    const subs = global.db.submissions.filter(sub=>sub.studentId===sid);
    const avg = subs.length ? Math.round(subs.reduce((a,b)=>a+b.percentage,0)/subs.length*10)/10 : 0;
    const hw = global.db.homework.filter(h=>h.studentId===sid).length;
    const score = avg*0.7 + (s.attendance||75)*0.2 + Math.min(hw*5,10)*0.1;
    return { id:sid, name:s.name, studentId:s.studentId, class:s.class, section:s.section, avgScore:avg, attendance:s.attendance||75, hwCount:hw, totalScore:Math.round(score*10)/10, tests:subs.length };
  }).filter(s=>s.tests>0).sort((a,b)=>b.totalScore-a.totalScore).slice(0,20).map((s,i)=>({...s,rank:i+1}));
  res.json({ success:true, leaderboard:board });
});

module.exports = r1;
