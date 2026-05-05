const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

const schedule = {
  '9': { Monday: ['Mathematics','English','Physics'], Tuesday: ['Chemistry','History','Mathematics'], Wednesday: ['Biology','English','Computer Science'], Thursday: ['Physics','Mathematics','Chemistry'], Friday: ['History','Biology','English'], Saturday: ['Mathematics','Computer Science','Review'] },
  '10': { Monday: ['Mathematics','Physics','English'], Tuesday: ['Chemistry','Biology','Mathematics'], Wednesday: ['Physics','History','Computer Science'], Thursday: ['English','Mathematics','Chemistry'], Friday: ['Biology','Computer Science','Physics'], Saturday: ['Revision','Mathematics','Mock Test'] },
  '11': { Monday: ['Mathematics','Physics','Chemistry'], Tuesday: ['Biology','English','Mathematics'], Wednesday: ['Physics','Computer Science','Chemistry'], Thursday: ['Mathematics','History','Biology'], Friday: ['English','Physics','Chemistry'], Saturday: ['Practice Test','Revision','Lab Work'] },
  '12': { Monday: ['Mathematics','Physics','Chemistry'], Tuesday: ['Biology','Revision','Mathematics'], Wednesday: ['Chemistry','Physics','Practice Test'], Thursday: ['Mathematics','Biology','English'], Friday: ['Physics','Chemistry','Revision'], Saturday: ['Mock Exam','Review','Counseling'] },
};

router.get('/', auth, (req, res) => {
  const user = global.db.users.find(u=>(u._id||u.id)===req.user.id);
  const cls = user?.class || '10';
  const classSchedule = schedule[cls] || schedule['10'];
  res.json({ success:true, schedule:classSchedule, class:cls });
});

module.exports = router;
