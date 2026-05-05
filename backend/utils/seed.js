const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science'];
const classes = ['9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'];

function uid() { return uuidv4().replace(/-/g,'').slice(0,12); }
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const studentNames = [
  'Alice Thompson','Bob Martinez','Carol Singh','David Chen','Emma Watson',
  'Frank Liu','Grace Kim','Henry Patel','Ivy Johnson','Jack Brown',
  'Kira Nakamura','Liam O\'Brien','Maya Sharma','Noah Williams','Olivia Davis',
  'Priya Nair','Quinn Anderson','Ravi Kumar','Sofia Mendez','Tom Wilson',
  'Uma Reddy','Victor Tran','Wendy Park','Xavier Ross','Yara Hassan',
  'Zoe Campbell','Aiden Clark','Bella Moore','Carlos Rivera','Diana White',
  'Ethan Scott','Fatima Al-Rashid','George Hill','Hannah Lee','Ivan Petrov'
];

const teacherData = [
  { name: 'Dr. Sarah Johnson', subjects: ['Mathematics', 'Physics'], teacherId: 'TCH001' },
  { name: 'Prof. Michael Chen', subjects: ['Chemistry', 'Biology'], teacherId: 'TCH002' },
  { name: 'Ms. Priya Kapoor', subjects: ['English', 'History'], teacherId: 'TCH003' },
  { name: 'Mr. James Rodriguez', subjects: ['Computer Science'], teacherId: 'TCH004' },
];

const testQuestions = {
  Mathematics: [
    { question: 'What is the value of π (pi) to 2 decimal places?', options: ['3.14','3.41','3.16','3.12'], correctAnswer: 0, marks: 2 },
    { question: 'Solve: 2x² - 8 = 0. Find x.', options: ['x = ±2','x = ±4','x = 2','x = -2'], correctAnswer: 0, marks: 2 },
    { question: 'What is the area of a circle with radius 7cm?', options: ['154 cm²','144 cm²','164 cm²','174 cm²'], correctAnswer: 0, marks: 2 },
    { question: 'If log₁₀(100) = x, then x equals?', options: ['1','2','10','0.5'], correctAnswer: 1, marks: 2 },
    { question: 'What is the derivative of sin(x)?', options: ['-cos(x)','cos(x)','-sin(x)','tan(x)'], correctAnswer: 1, marks: 2 },
    { question: 'What is 15% of 240?', options: ['36','34','38','32'], correctAnswer: 0, marks: 1 },
    { question: 'Simplify: (a²b³)² = ?', options: ['a⁴b⁶','a⁴b⁵','a³b⁶','a²b⁶'], correctAnswer: 0, marks: 1 },
    { question: 'What is the sum of angles in a triangle?', options: ['90°','180°','270°','360°'], correctAnswer: 1, marks: 1 },
    { question: 'Find LCM of 12 and 18.', options: ['36','24','72','48'], correctAnswer: 0, marks: 1 },
    { question: 'What is √(144)?', options: ['12','11','13','14'], correctAnswer: 0, marks: 1 },
  ],
  Physics: [
    { question: 'Newton\'s Second Law states F equals?', options: ['ma','mv','m/a','a/m'], correctAnswer: 0, marks: 2 },
    { question: 'Speed of light in vacuum (approx)?', options: ['3×10⁸ m/s','3×10⁶ m/s','3×10¹⁰ m/s','3×10⁴ m/s'], correctAnswer: 0, marks: 2 },
    { question: 'Unit of electric resistance?', options: ['Ohm','Volt','Ampere','Watt'], correctAnswer: 0, marks: 1 },
    { question: 'Which is NOT a scalar quantity?', options: ['Mass','Speed','Velocity','Temperature'], correctAnswer: 2, marks: 2 },
    { question: 'Energy stored in a spring: ½kx² is called?', options: ['Kinetic','Potential','Thermal','Nuclear'], correctAnswer: 1, marks: 2 },
    { question: 'Frequency of 1 oscillation per second is called?', options: ['1 Hz','1 rad/s','1 rpm','1 joule'], correctAnswer: 0, marks: 1 },
    { question: 'g on Earth surface ≈?', options: ['9.8 m/s²','8.9 m/s²','10.8 m/s²','9.0 m/s²'], correctAnswer: 0, marks: 1 },
    { question: 'Ohm\'s Law: V = ?', options: ['IR','I/R','R/I','I+R'], correctAnswer: 0, marks: 1 },
  ],
  Chemistry: [
    { question: 'Atomic number of Carbon?', options: ['6','8','12','4'], correctAnswer: 0, marks: 1 },
    { question: 'Chemical symbol for Gold?', options: ['Go','Gd','Au','Ag'], correctAnswer: 2, marks: 1 },
    { question: 'pH of pure water?', options: ['5','7','9','10'], correctAnswer: 1, marks: 2 },
    { question: 'What is the valency of Oxygen?', options: ['1','2','3','4'], correctAnswer: 1, marks: 1 },
    { question: 'Which gas is released in photosynthesis?', options: ['CO₂','N₂','O₂','H₂'], correctAnswer: 2, marks: 2 },
    { question: 'Na₂SO₄ compound name?', options: ['Sodium Sulphate','Sodium Sulphide','Sodium Sulphite','Sodium Oxide'], correctAnswer: 0, marks: 2 },
  ],
  'Computer Science': [
    { question: 'What does CPU stand for?', options: ['Central Processing Unit','Computer Processing Unit','Central Program Unit','Core Processing Unit'], correctAnswer: 0, marks: 1 },
    { question: 'What is the output of: print(2**10) in Python?', options: ['20','1024','512','210'], correctAnswer: 1, marks: 2 },
    { question: 'Which data structure uses FIFO?', options: ['Stack','Queue','Tree','Graph'], correctAnswer: 1, marks: 2 },
    { question: 'Binary of decimal 10?', options: ['1010','1001','1100','0110'], correctAnswer: 0, marks: 2 },
    { question: 'What is a primary key in a database?', options: ['Foreign key','Unique identifier','Index','Trigger'], correctAnswer: 1, marks: 2 },
    { question: 'HTTP stands for?', options: ['HyperText Transfer Protocol','High Transfer Text Protocol','Hyper Tool Transfer Protocol','High Text Transfer Protocol'], correctAnswer: 0, marks: 1 },
    { question: 'Which of these is an OOP concept?', options: ['Recursion','Inheritance','Iteration','Compilation'], correctAnswer: 1, marks: 2 },
  ],
  English: [
    { question: 'Identify the synonym of "Eloquent":', options: ['Mute','Articulate','Confused','Silent'], correctAnswer: 1, marks: 1 },
    { question: '"She ran quickly." — "quickly" is a?', options: ['Adjective','Verb','Adverb','Noun'], correctAnswer: 2, marks: 1 },
    { question: 'Which sentence is in passive voice?', options: ['He ate the cake','The cake was eaten by him','He is eating','He will eat'], correctAnswer: 1, marks: 2 },
    { question: 'Author of "Pride and Prejudice"?', options: ['Charlotte Brontë','Jane Austen','Virginia Woolf','Emily Brontë'], correctAnswer: 1, marks: 1 },
    { question: 'Antonym of "Benevolent"?', options: ['Kind','Generous','Malevolent','Charitable'], correctAnswer: 2, marks: 1 },
  ],
};

async function seedData() {
  if (global.db.users.length > 0) return;

  const hash = async (pw) => await bcrypt.hash(pw, 10);

  // Admin
  global.db.users.push({
    _id: 'admin-001', id: 'admin-001', name: 'System Administrator',
    email: 'admin@school.edu', password: await hash('admin123'),
    role: 'admin', isActive: true, attendance: 100,
    createdAt: new Date(Date.now() - 90*86400000), subjects: [], class: '', section: '',
    phone: '+91-9876543210', bio: 'System administrator for EduPredict AI',
    joinDate: '2024-01-01', lastLogin: new Date()
  });

  // Teachers
  for (const t of teacherData) {
    global.db.users.push({
      _id: t.teacherId, id: t.teacherId, ...t,
      email: `${t.name.split(' ')[1].toLowerCase()}@school.edu`,
      password: await hash('teacher123'),
      role: 'teacher', isActive: true, attendance: rnd(90,99),
      createdAt: new Date(Date.now() - rnd(30,90)*86400000),
      class: '', section: '', phone: `+91-98765${rnd(10000,99999)}`,
      bio: `Experienced educator in ${t.subjects.join(' & ')}`,
      joinDate: '2024-01-15', lastLogin: new Date()
    });
  }

  // Students (35 real ones + seeded)
  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i];
    const cls = rndEl(classes);
    const sid = `STU${String(i+1).padStart(3,'0')}`;
    global.db.users.push({
      _id: sid, id: sid, name,
      email: `${name.split(' ')[0].toLowerCase()}@school.edu`,
      password: await hash('student123'),
      role: 'student', studentId: sid,
      class: cls.slice(0,-1), section: cls.slice(-1),
      isActive: true, attendance: rnd(62,98),
      subjects: subjects.slice(0, rnd(4,7)),
      createdAt: new Date(Date.now() - rnd(10,180)*86400000),
      phone: `+91-98765${rnd(10000,99999)}`,
      bio: `Student at EduPredict Academy — Class ${cls}`,
      joinDate: '2024-06-01', lastLogin: new Date(Date.now() - rnd(0,7)*86400000),
      parentName: `${rndEl(['Mr.','Mrs.','Dr.'])} ${rndEl(['Thompson','Martinez','Singh','Chen','Patel'])}`,
      parentPhone: `+91-98765${rnd(10000,99999)}`
    });
  }

  // Tests
  const testDefs = [
    { title: 'Algebra & Calculus Mid-Term', subject: 'Mathematics', duration: 35, class: '10' },
    { title: 'Newton\'s Laws & Motion', subject: 'Physics', duration: 25, class: '10' },
    { title: 'Periodic Table & Bonding', subject: 'Chemistry', duration: 20, class: '10' },
    { title: 'Data Structures & Algorithms', subject: 'Computer Science', duration: 30, class: '11' },
    { title: 'Grammar & Literature', subject: 'English', duration: 25, class: '9' },
    { title: 'Calculus Final Exam', subject: 'Mathematics', duration: 45, class: '11' },
    { title: 'Electricity & Magnetism', subject: 'Physics', duration: 30, class: '11' },
  ];

  for (const td of testDefs) {
    const qs = testQuestions[td.subject] || testQuestions.Mathematics;
    const tid = `TEST-${uid()}`;
    const totalMarks = qs.reduce((s, q) => s + (q.marks || 1), 0);
    global.db.tests.push({
      _id: tid, id: tid, ...td,
      description: `Comprehensive assessment of ${td.subject} fundamentals`,
      questions: qs, totalMarks,
      createdBy: rndEl(teacherData).teacherId,
      isActive: true, createdAt: new Date(Date.now() - rnd(5,30)*86400000),
      assignedClass: td.class
    });
  }

  // Generate realistic submissions for each student
  const students = global.db.users.filter(u => u.role === 'student');
  for (const student of students) {
    const numTests = rnd(2, global.db.tests.length);
    const chosenTests = [...global.db.tests].sort(() => 0.5 - Math.random()).slice(0, numTests);
    
    for (const test of chosenTests) {
      const answers = test.questions.map((q, qi) => {
        const correct = Math.random() < (student.attendance / 100) * 0.8 + 0.1;
        const sel = correct ? q.correctAnswer : rnd(0, 3);
        return { questionIndex: qi, selectedOption: sel, isCorrect: sel === q.correctAnswer, marksObtained: sel === q.correctAnswer ? (q.marks||1) : 0 };
      });
      const score = answers.reduce((s, a) => s + a.marksObtained, 0);
      const percentage = Math.round((score / test.totalMarks) * 100 * 10) / 10;
      const subId = `SUB-${uid()}`;
      global.db.submissions.push({
        _id: subId, id: subId, testId: test._id, studentId: student._id,
        studentName: student.name, answers, score, totalMarks: test.totalMarks,
        percentage, subject: test.subject, timeTaken: rnd(test.duration*30, test.duration*58),
        submittedAt: new Date(Date.now() - rnd(1,25)*86400000), autoSubmitted: false
      });
    }

    // Homework for each student
    const hwSubjects = student.subjects || subjects.slice(0,4);
    for (let j = 0; j < rnd(2,5); j++) {
      const sub = rndEl(hwSubjects);
      const isGraded = Math.random() > 0.3;
      const marks = isGraded ? rnd(5,10) : null;
      const hwId = `HW-${uid()}`;
      global.db.homework.push({
        _id: hwId, id: hwId, studentId: student._id, studentName: student.name,
        subject: sub, title: rndEl([`Chapter ${rnd(1,10)} Exercise`, `Practice Set ${rnd(1,6)}`, `Assignment ${rnd(1,8)}`, `Project Work ${rnd(1,4)}`]),
        status: isGraded ? 'graded' : 'submitted',
        marks, maxMarks: 10, feedback: isGraded ? rndEl(['Excellent!','Good work','Needs improvement','Well done','Review required']) : null,
        submittedAt: new Date(Date.now() - rnd(1,20)*86400000),
        fileName: Math.random() > 0.4 ? `homework_${uid()}.pdf` : null
      });
    }
  }

  // Announcements
  const announcements = [
    { title: '📅 Term 2 Exam Schedule Released', body: 'The Term 2 examination timetable has been published. Please check the schedule and prepare accordingly. All exams will be held in the main hall.', author: 'Admin', priority: 'high', targetRole: 'all' },
    { title: '🏆 Science Olympiad Registration Open', body: 'Register now for the upcoming Science Olympiad! Open to all students in Grade 9-12. Last date: end of this month. Contact your class teacher for registration forms.', author: 'Dr. Sarah Johnson', priority: 'medium', targetRole: 'student' },
    { title: '📚 Library Hours Extended', body: 'Library will remain open till 7 PM from Monday to Friday during examination period. E-resources are available 24/7 via the student portal.', author: 'Admin', priority: 'low', targetRole: 'all' },
    { title: '🎓 Parent-Teacher Meeting Scheduled', body: 'Annual PTM will be held next Saturday from 9 AM to 1 PM. All teachers must attend and prepare student progress reports.', author: 'Admin', priority: 'high', targetRole: 'teacher' },
    { title: '💡 New AI Study Resources Available', body: 'We\'ve added new AI-powered practice tests and study materials for Math and Science. Access them from your student dashboard under Resources.', author: 'Prof. Michael Chen', priority: 'medium', targetRole: 'student' },
  ];
  
  for (const a of announcements) {
    global.db.announcements.push({ _id: `ANN-${uid()}`, ...a, createdAt: new Date(Date.now() - rnd(0,14)*86400000), views: rnd(20,150) });
  }

  // Notifications for each student
  const notifMessages = [
    { type: 'warning', msg: (s, sub) => `⚠️ Your ${sub} score was below 50%. Review the material.` },
    { type: 'success', msg: (s, sub) => `🌟 Excellent! You scored above 90% in ${sub}!` },
    { type: 'info', msg: () => `📝 New test available — check your Tests section.` },
    { type: 'reminder', msg: () => `📅 Homework due tomorrow — don't forget to submit!` },
  ];
  
  for (const student of students.slice(0, 15)) {
    const studentSubs = global.db.submissions.filter(s => s.studentId === student._id);
    for (const sub of studentSubs.slice(0,2)) {
      const type = sub.percentage < 50 ? 'warning' : sub.percentage >= 90 ? 'success' : 'info';
      const msg = sub.percentage < 50
        ? `⚠️ Your ${sub.subject} score was ${sub.percentage}%. Please review the material and seek teacher help.`
        : sub.percentage >= 90
        ? `🌟 Outstanding! You scored ${sub.percentage}% in ${sub.subject}. Keep it up!`
        : `📊 Your ${sub.subject} result: ${sub.percentage}%. There's room for improvement.`;
      global.db.notifications.push({
        _id: `NOTIF-${uid()}`, userId: student._id, message: msg, type, read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - rnd(0,10)*86400000)
      });
    }
    global.db.notifications.push({
      _id: `NOTIF-${uid()}`, userId: student._id,
      message: '📝 New tests are available. Check your exam section!',
      type: 'info', read: false, createdAt: new Date()
    });
  }

  console.log(`✅ Seeded: ${global.db.users.filter(u=>u.role==='student').length} students, ${global.db.tests.length} tests, ${global.db.submissions.length} submissions`);
}

module.exports = { seedData };
