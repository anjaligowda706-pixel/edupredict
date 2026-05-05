// ===== PREDICTION ENGINE =====
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

function predict(data) {
  const { testScores, attendance, hwCompletion, hwGrades, trend } = data;
  const avgTest = testScores.length ? testScores.reduce((s,t)=>s+t,0)/testScores.length : 50;
  const hwRate = hwCompletion.total > 0 ? (hwCompletion.done/hwCompletion.total)*100 : 60;
  const avgHwGrade = hwGrades.length ? hwGrades.reduce((s,h)=>s+h,0)/hwGrades.length : 60;
  const predicted = Math.min(100, Math.max(0, avgTest*0.50 + (attendance||75)*0.25 + hwRate*0.15 + avgHwGrade*0.10));
  const riskLevel = predicted >= 75 && (attendance||75) >= 80 ? 'Low' : predicted >= 50 ? 'Medium' : 'High';
  const trendDir = trend > 2 ? 'Improving' : trend < -2 ? 'Declining' : 'Stable';
  const recs = [];
  if ((attendance||75) < 75) recs.push('Improve attendance — currently below 75%');
  if (hwRate < 60) recs.push('Submit homework assignments more consistently');
  if (avgTest < 60) recs.push('Review test materials and practice daily');
  if (trend < -5) recs.push('Performance is declining — schedule teacher consultation');
  if (recs.length === 0) recs.push('Maintain your current excellent performance!');
  return { predictedScore: Math.round(predicted*10)/10, currentAverage: Math.round(avgTest*10)/10, riskLevel, trendDir, trend: Math.round(trend*10)/10, attendanceScore: attendance||75, homeworkRate: Math.round(hwRate), recommendations: recs, confidence: Math.min(95, 55+testScores.length*5) };
}

router.get('/:id', auth, (req, res) => {
  if (req.user.role==='student' && req.user.id!==req.params.id) return res.status(403).json({error:'Forbidden'});
  const subs = global.db.submissions.filter(s=>s.studentId===req.params.id);
  const hw = global.db.homework.filter(h=>h.studentId===req.params.id);
  const student = global.db.users.find(u=>(u._id||u.id)===req.params.id);
  if (!student) return res.status(404).json({error:'Not found'});
  const sorted = [...subs].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  const scores = sorted.map(s=>s.percentage);
  const recent = scores.slice(-3); const older = scores.slice(-6,-3);
  const recentAvg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : (scores.length?scores[scores.length-1]:50);
  const olderAvg = older.length ? older.reduce((a,b)=>a+b,0)/older.length : recentAvg;
  const graded = hw.filter(h=>h.marks!=null).map(h=>(h.marks/(h.maxMarks||10))*100);
  const prediction = predict({ testScores: scores, attendance: student.attendance, hwCompletion:{total:hw.length+2,done:hw.length}, hwGrades: graded, trend: recentAvg-olderAvg });
  const subMap = {};
  subs.forEach(s=>{if(!subMap[s.subject])subMap[s.subject]=[];subMap[s.subject].push(s.percentage);});
  prediction.subjectAnalysis = Object.entries(subMap).map(([sub,sc])=>({ subject:sub, average:Math.round(sc.reduce((a,b)=>a+b,0)/sc.length), status: sc.reduce((a,b)=>a+b,0)/sc.length>=70?'strong':sc.reduce((a,b)=>a+b,0)/sc.length>=50?'average':'weak' }));
  prediction.weakSubjects = prediction.subjectAnalysis.filter(s=>s.status==='weak').map(s=>s.subject);
  res.json({ success:true, prediction, student:{name:student.name,studentId:student.studentId} });
});

router.post('/batch', auth, (req, res) => {
  if (!['teacher','admin'].includes(req.user.role)) return res.status(403).json({error:'Forbidden'});
  const students = global.db.users.filter(u=>u.role==='student'&&u.isActive!==false);
  const predictions = students.map(student => {
    const sid = student._id||student.id;
    const subs = global.db.submissions.filter(s=>s.studentId===sid);
    const hw = global.db.homework.filter(h=>h.studentId===sid);
    const scores = subs.map(s=>s.percentage);
    const graded = hw.filter(h=>h.marks!=null).map(h=>(h.marks/(h.maxMarks||10))*100);
    const sorted = [...subs].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
    const recent = sorted.slice(-3).map(s=>s.percentage);
    const older = sorted.slice(-6,-3).map(s=>s.percentage);
    const rA = recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:50;
    const oA = older.length?older.reduce((a,b)=>a+b,0)/older.length:rA;
    const pred = predict({ testScores:scores, attendance:student.attendance, hwCompletion:{total:hw.length+2,done:hw.length}, hwGrades:graded, trend:rA-oA });
    return { student:{id:sid,name:student.name,studentId:student.studentId,class:student.class}, prediction:pred };
  });
  res.json({ success:true, predictions });
});

module.exports = router;
