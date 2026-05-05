/* ═══════════════════════════════
   STUDENT DASHBOARD LOGIC
   EduPredict AI v2 — Aurora
═══════════════════════════════ */

let CU = null;
let allTests = [], mySubmissions = [], myHw = [];
let activeTest = null, examAnswers = {}, examTimerID = null, examTotalSec = 0;

window.addEventListener('DOMContentLoaded', async () => {
  CU = initUserInfo();
  if (!CU) return;
  initAuroraCanvas('aurora-canvas');
  await loadDashboard();
  loadNotifications();
});

function onSectionLoad(s) {
  ({
    dashboard:    loadDashboard,
    tests:        loadTests,
    exam:         loadExamPick,
    homework:     loadHomework,
    performance:  loadPerformance,
    prediction:   loadPrediction,
    leaderboard:  loadLeaderboard,
    schedule:     loadSchedule,
    announcements:loadAnnouncements,
  })[s]?.();
}

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  const [tRes, sRes, hRes, aRes] = await Promise.all([
    apiFetch('/tests'), apiFetch('/submissions'),
    apiFetch('/homework'), apiFetch('/analytics/student/' + CU.id)
  ]);
  allTests = tRes?.data?.tests || [];
  mySubmissions = sRes?.data?.submissions || [];
  myHw = hRes?.data?.homework || [];
  const analytics = aRes?.data?.analytics || {};

  const avgScore = mySubmissions.length ? Math.round(mySubmissions.reduce((s,x)=>s+x.percentage,0)/mySubmissions.length) : 0;
  const pending = allTests.filter(t => !mySubmissions.find(s=>s.testId===(t._id||t.id))).length;
  const pendingHw = myHw.filter(h=>h.status==='submitted').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card teal">
      <span class="stat-icon">📝</span>
      <div class="stat-val">${mySubmissions.length}</div>
      <div class="stat-label">Tests Done</div>
    </div>
    <div class="stat-card sky">
      <span class="stat-icon">📊</span>
      <div class="stat-val">${avgScore}%</div>
      <div class="stat-label">Avg Score</div>
    </div>
    <div class="stat-card amber">
      <span class="stat-icon">⏳</span>
      <div class="stat-val">${pending}</div>
      <div class="stat-label">Pending Tests</div>
    </div>
    <div class="stat-card mag">
      <span class="stat-icon">📁</span>
      <div class="stat-val">${myHw.length}</div>
      <div class="stat-label">HW Submitted</div>
    </div>
  `;

  // Timeline chart
  const sorted = [...mySubmissions].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  lineChart('chartTimeline',
    sorted.map(s => s.subject?.slice(0,4)),
    [{ label:'Score %', data: sorted.map(s=>s.percentage), borderColor:'rgba(0,229,170,0.9)', backgroundColor:'rgba(0,229,170,0.08)', tension:0.4, fill:true, pointBackgroundColor:'rgba(0,229,170,1)', pointRadius:5 }]
  );

  // Radar chart
  const subMap = {};
  mySubmissions.forEach(s => { if(!subMap[s.subject]) subMap[s.subject]=[]; subMap[s.subject].push(s.percentage); });
  const subLabels = Object.keys(subMap);
  const subAvgs = subLabels.map(sub => Math.round(subMap[sub].reduce((a,b)=>a+b,0)/subMap[sub].length));
  if (subLabels.length > 0) radarChart('chartRadar', subLabels, subAvgs);

  // Recent results
  const recent = [...mySubmissions].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,5);
  document.getElementById('dashRecent').innerHTML = recent.length
    ? recent.map(s => {
        const g = grade(s.percentage);
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border2)">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="av ${avClass(s.subject)}" style="border-radius:8px;font-size:11px">${s.subject?.slice(0,2).toUpperCase()}</div>
            <div>
              <div style="font-family:var(--font-display);font-weight:600;font-size:14px">${s.subject}</div>
              <div style="font-size:11px;color:var(--text-4)">${fmtDate(s.submittedAt)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-family:var(--font-display);font-weight:700">${s.score}/${s.totalMarks}</span>
            <span class="badge ${g.cls}">${g.g}</span>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty"><span class="empty-icon">📋</span><div class="empty-title">No tests taken yet</div></div>';

  // Alerts
  const alerts = [];
  if (avgScore < 50 && mySubmissions.length > 0) alerts.push({ type:'crimson', icon:'⚠️', msg:`Your average score (${avgScore}%) is below 50%. Seek teacher assistance.` });
  if (pending > 0) alerts.push({ type:'amber', icon:'📝', msg:`${pending} test${pending>1?'s':''} pending. Check your Tests section.` });
  if (myHw.length === 0) alerts.push({ type:'lav', icon:'📁', msg:`No homework submitted yet. Upload your assignments!` });
  if (pendingHw > 0) alerts.push({ type:'amber', icon:'⏳', msg:`${pendingHw} homework submission${pendingHw>1?'s':''} awaiting feedback.` });
  if (alerts.length === 0) alerts.push({ type:'teal', icon:'✅', msg:'Everything looks great! Keep up the excellent work.' });

  document.getElementById('dashAlerts').innerHTML = alerts.map(a =>
    `<div class="alert alert-${a.type}" style="margin-bottom:10px"><span>${a.icon}</span><span>${a.msg}</span></div>`
  ).join('');
}

/* ══ ANNOUNCEMENTS ══ */
async function loadAnnouncements() {
  const res = await apiFetch('/announcements');
  const anns = res?.data?.announcements || [];
  const el = document.getElementById('annList');
  el.innerHTML = anns.length
    ? anns.map(a => `
        <div class="ann-card ${a.priority}">
          <div style="display:flex;align-items:start;justify-content:space-between;gap:10px;margin-bottom:6px">
            <div class="ann-title">${a.title}</div>
            <span class="badge ${a.priority==='high'?'b-crim':a.priority==='medium'?'b-amber':'b-teal'}">${a.priority}</span>
          </div>
          <div class="ann-body">${a.body}</div>
          <div class="ann-meta">
            <span>👤 ${a.author}</span>
            <span>🕐 ${timeAgo(a.createdAt)}</span>
          </div>
        </div>
      `).join('')
    : '<div class="empty"><span class="empty-icon">📢</span><div class="empty-title">No announcements</div></div>';
}

/* ══ TESTS ══ */
async function loadTests() {
  const [tRes, sRes] = await Promise.all([apiFetch('/tests'), apiFetch('/submissions')]);
  allTests = tRes?.data?.tests || [];
  mySubmissions = sRes?.data?.submissions || [];
  renderTestCards(allTests);

  document.getElementById('submissionsTable').innerHTML = mySubmissions.length
    ? [...mySubmissions].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).map(s => {
        const g = grade(s.percentage);
        const mins = s.timeTaken ? Math.floor(s.timeTaken/60)+'m '+Math.floor(s.timeTaken%60)+'s' : '—';
        return `<tr>
          <td><span class="subj-chip">${s.subject}</span></td>
          <td><strong style="color:var(--text-1)">${s.score}</strong>/<span style="color:var(--text-3)">${s.totalMarks}</span></td>
          <td><span style="font-weight:700;color:${scoreColor(s.percentage)}">${s.percentage}%</span></td>
          <td><span class="badge ${g.cls}">${g.g}</span></td>
          <td style="font-size:12px;color:var(--text-3)">${mins}</td>
          <td style="font-size:12px;color:var(--text-4)">${fmtDate(s.submittedAt)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-4)">No submissions yet</td></tr>';
}

function renderTestCards(tests) {
  const taken = mySubmissions.map(s=>s.testId);
  const el = document.getElementById('testCards');
  if (!tests.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📝</span><div class="empty-title">No tests available</div></div>'; return; }
  el.innerHTML = `<div class="g-auto" style="padding:4px 0">` +
    tests.map(t => {
      const id = t._id||t.id;
      const done = taken.includes(id);
      const sub = mySubmissions.find(s=>s.testId===id);
      return `<div class="card" style="border-color:${done?'rgba(0,229,170,0.15)':'var(--border2)'}">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
          <span class="subj-chip">${t.subject}</span>
          <span class="badge ${done?'b-teal':'b-amber'}">${done?'✅ Done':'⏳ Pending'}</span>
        </div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:15px;margin-bottom:6px;line-height:1.3">${t.title}</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:14px;line-height:1.5">${t.description||''}</div>
        <div style="display:flex;gap:16px;font-size:11px;color:var(--text-4);font-family:var(--font-display);margin-bottom:16px">
          <span>⏱ ${t.duration}m</span>
          <span>📋 ${t.questions?.length||0} Qs</span>
          <span>🏆 ${t.totalMarks} marks</span>
        </div>
        ${done
          ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--glass);border-radius:var(--r-md)">
              <span style="font-size:13px;font-family:var(--font-display)">Score: <strong>${sub?.score}/${sub?.totalMarks}</strong></span>
              <span class="badge ${grade(sub?.percentage||0).cls}">${sub?.percentage}%</span>
             </div>`
          : `<button class="btn btn-teal" style="width:100%;justify-content:center" onclick="startExam('${id}')">▶ Start Exam</button>`
        }
      </div>`;
    }).join('') + '</div>';
}

function filterTests(q) {
  const f = allTests.filter(t => t.title?.toLowerCase().includes(q.toLowerCase()) || t.subject?.toLowerCase().includes(q.toLowerCase()));
  renderTestCards(f);
}

/* ══ EXAM ══ */
async function loadExamPick() {
  const [tRes, sRes] = await Promise.all([apiFetch('/tests'), apiFetch('/submissions')]);
  allTests = tRes?.data?.tests || [];
  mySubmissions = sRes?.data?.submissions || [];
  const taken = mySubmissions.map(s=>s.testId);
  const avail = allTests.filter(t => !taken.includes(t._id||t.id));

  document.getElementById('examCards').innerHTML = avail.length
    ? avail.map(t => `
        <div class="card" style="cursor:pointer;transition:var(--t2)" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform=''" onclick="startExam('${t._id||t.id}')">
          <span class="subj-chip" style="margin-bottom:12px;display:inline-block">${t.subject}</span>
          <div style="font-family:var(--font-display);font-weight:700;font-size:15px;margin-bottom:6px">${t.title}</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">${t.description||''}</div>
          <div style="display:flex;gap:14px;font-size:12px;color:var(--text-4);font-family:var(--font-display);margin-bottom:18px">
            <span>⏱ ${t.duration}m</span><span>📋 ${t.questions?.length} Qs</span><span>🏆 ${t.totalMarks} marks</span>
          </div>
          <div class="btn btn-teal" style="width:100%;justify-content:center;pointer-events:none">▶ Begin Exam</div>
        </div>
      `).join('')
    : '<div class="empty" style="grid-column:1/-1"><span class="empty-icon">🎉</span><div class="empty-title">All exams completed!</div><div class="empty-hint">You have no pending exams.</div></div>';
}

async function startExam(testId) {
  const res = await apiFetch(`/tests/${testId}`);
  if (!res?.ok) { toast('Failed to load exam', 'error'); return; }
  activeTest = res.data.test;
  examAnswers = {};

  showSection('exam');
  document.getElementById('examPickScreen').style.display = 'none';
  document.getElementById('examScreen').style.display = '';
  document.getElementById('examResultScreen').style.display = 'none';

  document.getElementById('examTitle').textContent = activeTest.title;
  document.getElementById('examSubject').textContent = activeTest.subject;

  buildQuestions(activeTest.questions);
  buildQNav(activeTest.questions.length);
  startTimer(activeTest.duration * 60);
}

function buildQuestions(qs) {
  const letters = ['A','B','C','D','E'];
  document.getElementById('examQuestions').innerHTML = qs.map((q, qi) => `
    <div class="q-card" id="qcard-${qi}">
      <div class="q-num">Question ${qi+1} of ${qs.length} · ${q.marks||1} mark${(q.marks||1)>1?'s':''}</div>
      <div class="q-text">${q.question}</div>
      <div class="options-grid" id="opts-${qi}">
        ${q.options.map((opt,oi) => `
          <div class="opt" id="opt-${qi}-${oi}" onclick="pickAnswer(${qi},${oi})">
            <div class="opt-letter">${letters[oi]}</div>
            <div style="font-size:14px;line-height:1.5">${opt}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  updateExamProgress();
}

function buildQNav(count) {
  document.getElementById('qNav').innerHTML = Array.from({length:count},(_,i)=>`
    <div id="nav-${i}" onclick="document.getElementById('qcard-${i}').scrollIntoView({behavior:'smooth',block:'center'})"
      style="width:32px;height:32px;border-radius:6px;background:var(--glass);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;font-family:var(--font-display);font-weight:700;color:var(--text-3);transition:all 0.2s">${i+1}</div>
  `).join('');
}

function pickAnswer(qi, oi) {
  examAnswers[qi] = oi;
  document.querySelectorAll(`#opts-${qi} .opt`).forEach(el => el.classList.remove('selected'));
  document.getElementById(`opt-${qi}-${oi}`)?.classList.add('selected');
  const nav = document.getElementById(`nav-${qi}`);
  if (nav) { nav.style.background='var(--teal)'; nav.style.color='var(--forest)'; nav.style.border='1px solid var(--teal)'; }
  updateExamProgress();
}

function clearAllAnswers() {
  if (!confirm('Clear all answers?')) return;
  examAnswers = {};
  buildQuestions(activeTest.questions);
  buildQNav(activeTest.questions.length);
}

function updateExamProgress() {
  const total = activeTest?.questions?.length || 0;
  const done = Object.keys(examAnswers).length;
  const el = document.getElementById('examProgressText');
  if (el) el.textContent = `${done} / ${total} answered`;
}

let examTotalDuration = 0;
function startTimer(secs) {
  clearInterval(examTimerID);
  examTotalDuration = secs;
  let rem = secs;
  const arc = document.getElementById('timerArc');
  const num = document.getElementById('timerNum');
  const status = document.getElementById('timerStatus');
  const circ = 2 * Math.PI * 60;

  function tick() {
    const m = Math.floor(rem/60), s = rem%60;
    if (num) num.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (arc) {
      const pct = rem / examTotalDuration;
      arc.style.strokeDashoffset = circ * (1 - pct);
      arc.style.stroke = rem <= 60 ? 'var(--crimson)' : rem <= 300 ? 'var(--amber)' : 'var(--teal)';
    }
    if (num) num.style.color = rem <= 60 ? 'var(--crimson)' : rem <= 300 ? 'var(--amber)' : 'var(--teal)';
    if (status && rem <= 60) status.textContent = '⚠️ Submit soon!';
    if (rem <= 0) { clearInterval(examTimerID); toast('⏰ Time\'s up! Auto-submitting...','warning'); submitExam(true); }
    rem--;
  }
  tick();
  examTimerID = setInterval(tick, 1000);
}

async function submitExam(auto = false) {
  if (!activeTest) return;
  clearInterval(examTimerID);
  const total = activeTest.questions.length;
  const answered = Object.keys(examAnswers).length;

  if (!auto && answered < total) {
    if (!confirm(`You've answered ${answered}/${total} questions. Submit anyway?`)) {
      startTimer(0); return;
    }
  }

  const answers = activeTest.questions.map((_,i) => ({ questionIndex:i, selectedOption: examAnswers[i]??-1 }));
  const res = await apiFetch('/submissions', { method:'POST', body: JSON.stringify({ testId: activeTest._id||activeTest.id, answers, autoSubmitted:auto }) });

  if (!res?.ok) { toast(res?.data?.error||'Submission failed','error'); return; }

  const { score, totalMarks, percentage } = res.data;
  const g = grade(percentage);

  document.getElementById('examScreen').style.display = 'none';
  document.getElementById('examResultScreen').style.display = '';

  document.getElementById('examResultContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:32px 0">
      <div style="background:var(--glass);border:1px solid var(--border2);border-radius:var(--r-xl);padding:24px">
        <div style="font-family:var(--font-display);font-size:38px;font-weight:900;color:var(--teal)">${score}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;font-family:var(--font-display)">out of ${totalMarks}</div>
      </div>
      <div style="background:var(--glass);border:1px solid var(--border2);border-radius:var(--r-xl);padding:24px">
        <div style="font-family:var(--font-display);font-size:38px;font-weight:900;color:var(--amber)">${percentage}%</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;font-family:var(--font-display)">Percentage</div>
      </div>
      <div style="background:var(--glass);border:1px solid var(--border2);border-radius:var(--r-xl);padding:24px">
        <div style="font-family:var(--font-display);font-size:38px;font-weight:900;color:${scoreColor(percentage)}">${g.g}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;font-family:var(--font-display)">Grade</div>
      </div>
    </div>
    <div class="alert ${percentage>=70?'alert-teal':percentage>=50?'alert-amber':'alert-crimson'}">
      <span>${percentage>=90?'🌟 Outstanding!':percentage>=70?'👍 Good job!':percentage>=50?'📚 Keep practicing.':'⚠️ Needs improvement — seek help.'}</span>
      <span> ${percentage>=90?'Excellent performance!':percentage>=70?'Keep it up.':percentage>=50?'Review weak topics.':'Talk to your teacher.'}</span>
    </div>
  `;
  toast(`Submitted! Score: ${score}/${totalMarks} (${percentage}%)`, percentage>=60?'success':'warning');
}

function resetExam() {
  activeTest = null; examAnswers = {};
  document.getElementById('examPickScreen').style.display = '';
  document.getElementById('examScreen').style.display = 'none';
  document.getElementById('examResultScreen').style.display = 'none';
  loadExamPick();
}

/* ══ HOMEWORK ══ */
async function loadHomework() {
  const res = await apiFetch('/homework');
  myHw = res?.data?.homework || [];
  renderHwHistory(myHw);
}

function renderHwHistory(hw) {
  const el = document.getElementById('hwHistory');
  if (!hw.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📁</span><div class="empty-title">No submissions yet</div></div>'; return; }
  el.innerHTML = hw.map(h => `
    <div style="padding:14px 0;border-bottom:1px solid var(--border2)">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div>
          <div style="font-family:var(--font-display);font-weight:600;font-size:14px">${h.title}</div>
          <div style="font-size:11px;color:var(--text-4);margin-top:2px">${h.subject} · ${fmtDate(h.submittedAt)}</div>
        </div>
        <span class="badge ${h.status==='graded'?'b-teal':h.status==='submitted'?'b-amber':'b-lav'}">${h.status}</span>
      </div>
      ${h.fileName ? `<div style="font-size:12px;color:var(--teal);margin-bottom:6px">📎 ${h.fileName}</div>` : ''}
      ${h.marks!=null ? `
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <div class="progress-track" style="flex:1"><div class="progress-fill ${pfClass((h.marks/(h.maxMarks||10))*100)}" style="width:${(h.marks/(h.maxMarks||10))*100}%"></div></div>
          <span style="font-family:var(--font-display);font-size:13px;font-weight:700">${h.marks}/${h.maxMarks||10}</span>
        </div>
        ${h.feedback ? `<div style="font-size:12px;color:var(--text-3);margin-top:6px;font-style:italic">"${h.feedback}"</div>` : ''}
      ` : ''}
    </div>
  `).join('');
}

async function submitHomework(e) {
  e.preventDefault();
  const btn = document.getElementById('hwBtn');
  const msg = document.getElementById('hwMsg');
  btn.textContent = '⏳ Submitting...'; btn.disabled = true;

  const fd = new FormData();
  fd.append('subject', document.getElementById('hwSubject').value);
  fd.append('title', document.getElementById('hwTitle').value);
  fd.append('description', document.getElementById('hwDesc').value);
  const f = document.getElementById('hwFile').files[0];
  if (f) fd.append('file', f);

  const res = await apiFetch('/homework', { method:'POST', body:fd });
  btn.textContent = '📤 Submit Assignment'; btn.disabled = false;

  if (res?.ok) {
    msg.innerHTML = '<div class="alert alert-teal">✅ Assignment submitted successfully!</div>';
    document.getElementById('hwSubject').value = '';
    document.getElementById('hwTitle').value = '';
    document.getElementById('hwDesc').value = '';
    document.getElementById('hwFile').value = '';
    document.getElementById('uploadText').textContent = 'Drop file here or click to browse';
    document.getElementById('uploadZone').style.borderColor = '';
    toast('Homework submitted!','success');
    loadHomework();
  } else {
    msg.innerHTML = `<div class="alert alert-crimson">❌ ${res?.data?.error||'Failed'}</div>`;
  }
}

/* ══ PERFORMANCE ══ */
async function loadPerformance() {
  const [sRes, hRes, aRes] = await Promise.all([
    apiFetch('/submissions'), apiFetch('/homework'),
    apiFetch('/analytics/student/' + CU.id)
  ]);
  const subs = sRes?.data?.submissions || [];
  const hw   = hRes?.data?.homework || [];
  const analytics = aRes?.data?.analytics || {};

  const avg = subs.length ? Math.round(subs.reduce((s,x)=>s+x.percentage,0)/subs.length) : 0;
  const best = subs.length ? Math.max(...subs.map(s=>s.percentage)) : 0;
  const gradedHw = hw.filter(h=>h.marks!=null);
  const avgHw = gradedHw.length ? Math.round(gradedHw.reduce((s,h)=>s+(h.marks/(h.maxMarks||10))*100,0)/gradedHw.length) : 0;

  document.getElementById('perfStats').innerHTML = `
    <div class="stat-card teal"><span class="stat-icon">📊</span><div class="stat-val">${avg}%</div><div class="stat-label">Average Score</div></div>
    <div class="stat-card amber"><span class="stat-icon">🏆</span><div class="stat-val">${best}%</div><div class="stat-label">Best Score</div></div>
    <div class="stat-card sky"><span class="stat-icon">📁</span><div class="stat-val">${hw.length}</div><div class="stat-label">HW Submitted</div></div>
    <div class="stat-card mag"><span class="stat-icon">✅</span><div class="stat-val">${avgHw}%</div><div class="stat-label">HW Avg Grade</div></div>
  `;

  const sp = analytics.subjectPerformance||[];
  barChart('chartPerfBar', sp.map(s=>s.subject), [{
    label:'Avg %', data:sp.map(s=>s.average),
    backgroundColor: sp.map(s=>s.average>=70?'rgba(0,229,170,0.75)':s.average>=50?'rgba(255,179,71,0.75)':'rgba(255,77,109,0.75)'),
    borderRadius:8
  }]);

  const sorted = [...subs].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  lineChart('chartPerfLine', sorted.map((_,i)=>`T${i+1}`), [{
    label:'Score %', data:sorted.map(s=>s.percentage),
    borderColor:'rgba(255,179,71,0.9)', backgroundColor:'rgba(255,179,71,0.08)',
    tension:0.4, fill:true, pointBackgroundColor:'rgba(255,179,71,1)', pointRadius:5
  }]);

  document.getElementById('perfTable').innerHTML = sorted.length
    ? sorted.reverse().map(s => {
        const g = grade(s.percentage);
        return `<tr>
          <td><span class="subj-chip">${s.subject}</span></td>
          <td><strong>${s.score}</strong></td>
          <td style="color:var(--text-3)">${s.totalMarks}</td>
          <td style="color:${scoreColor(s.percentage)};font-weight:700">${s.percentage}%</td>
          <td><span class="badge ${g.cls}">${g.g}</span></td>
          <td style="font-size:12px;color:var(--text-4)">${fmtDate(s.submittedAt)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-4)">No tests yet</td></tr>';
}

/* ══ AI PREDICTION ══ */
async function loadPrediction() {
  const el = document.getElementById('predContent');
  el.innerHTML = '<div class="empty"><span class="empty-icon" style="animation:iconPulse 1s infinite">🤖</span><div class="empty-title">Analyzing your data...</div></div>';
  const res = await apiFetch('/prediction/' + CU.id);
  if (!res?.ok) { el.innerHTML = '<div class="alert alert-amber">⚠️ Not enough data yet. Take some tests first!</div>'; return; }

  const { prediction: p } = res.data;
  const riskColor = p.riskLevel==='Low'?'var(--teal)':p.riskLevel==='Medium'?'var(--amber)':'var(--crimson)';

  el.innerHTML = `
    <div class="g21" style="align-items:start">
      <div>
        <div class="card" style="margin-bottom:20px;text-align:center;padding:36px">
          <div class="prediction-orb">
            <div class="orb-score">${p.predictedScore}%</div>
            <div class="orb-label">Predicted Score</div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
            ${riskBadge(p.riskLevel)}
            <span class="badge b-lav">${p.trendDir==='Improving'?'📈':p.trendDir==='Declining'?'📉':'➡️'} ${p.trendDir}</span>
          </div>
          <div style="font-size:13px;color:var(--text-3);max-width:320px;margin:0 auto">${p.riskLevel==='Low'?'Excellent trajectory! You\'re on track for great results.':p.riskLevel==='Medium'?'Steady progress. Focus on identified weak areas.':'Immediate attention needed. Please consult your teacher.'}</div>
          <div style="margin-top:16px;font-size:12px;color:var(--text-4)">AI Confidence: ${p.confidence}%</div>
          <div class="progress-track" style="margin-top:6px;max-width:200px;margin-inline:auto"><div class="progress-fill pf-teal" style="width:${p.confidence}%"></div></div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title" style="margin-bottom:18px">📊 Performance Factors</div>
          ${[
            {label:'Test Performance', val:p.currentAverage, cls:'pf-teal'},
            {label:'Attendance Rate', val:p.attendanceScore, cls:'pf-sky'},
            {label:'Homework Completion', val:p.homeworkRate, cls:'pf-amber'},
          ].map(f => `
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;font-size:13px;font-family:var(--font-display);margin-bottom:7px">
                <span style="color:var(--text-2)">${f.label}</span>
                <span style="font-weight:700;color:${scoreColor(f.val)}">${f.val}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill ${f.cls}" style="width:${f.val}%"></div></div>
            </div>
          `).join('')}
        </div>

        ${p.weakSubjects?.length ? `
          <div class="card">
            <div class="card-title" style="margin-bottom:12px">⚠️ Subjects Needing Attention</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${p.weakSubjects.map(s=>`<span class="badge b-crim">📚 ${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div>
        <div class="card" style="margin-bottom:20px">
          <div class="card-title" style="margin-bottom:14px">💡 AI Recommendations</div>
          ${p.recommendations.map((r,i) => `
            <div style="display:flex;gap:12px;padding:12px;background:var(--glass);border-radius:var(--r-md);margin-bottom:10px;border:1px solid var(--border2)">
              <div style="width:26px;height:26px;background:var(--teal-glow);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:12px;font-weight:800;color:var(--teal);flex-shrink:0">${i+1}</div>
              <div style="font-size:13px;line-height:1.6;color:var(--text-2)">${r}</div>
            </div>
          `).join('')}
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:14px">📚 Subject Analysis</div>
          ${(p.subjectAnalysis||[]).map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border2)">
              <div style="font-family:var(--font-display);font-size:14px;font-weight:600">${s.subject}</div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-weight:700;color:${scoreColor(s.average)};font-family:var(--font-display)">${s.average}%</span>
                <span class="badge ${s.status==='strong'?'b-teal':s.status==='average'?'b-amber':'b-crim'}">${s.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ══ LEADERBOARD ══ */
async function loadLeaderboard() {
  const res = await apiFetch('/leaderboard');
  const board = res?.data?.leaderboard || [];
  const el = document.getElementById('leaderboardList');

  el.innerHTML = board.map((s,i) => {
    const isMe = s.id === CU.id;
    return `
      <div class="lb-row${isMe?' active':''}" style="${isMe?'background:var(--teal-glow);border-radius:var(--r-md);padding:13px 10px;':''}">
        <div class="lb-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}">${i<3?['🥇','🥈','🥉'][i]:s.rank}</div>
        <div class="av ${avClass(s.name)}">${initials(s.name)}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-weight:600;font-size:14px">${s.name}${isMe?' <span style="color:var(--teal);font-size:11px">(You)</span>':''}</div>
          <div style="font-size:11px;color:var(--text-4)">${s.studentId||''} · Class ${s.class||'—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:${scoreColor(s.avgScore)}">${s.avgScore}%</div>
          <div style="font-size:11px;color:var(--text-4)">${s.tests} tests</div>
        </div>
      </div>
    `;
  }).join('');

  // Distribution chart
  const ranges = { '90-100':0,'70-89':0,'50-69':0,'<50':0 };
  board.forEach(s => {
    if (s.avgScore>=90) ranges['90-100']++;
    else if (s.avgScore>=70) ranges['70-89']++;
    else if (s.avgScore>=50) ranges['50-69']++;
    else ranges['<50']++;
  });
  doughnutChart('chartLBDist',
    Object.keys(ranges), Object.values(ranges),
    ['rgba(0,229,170,0.8)','rgba(77,255,195,0.8)','rgba(255,179,71,0.8)','rgba(255,77,109,0.8)']
  );
}

/* ══ SCHEDULE ══ */
async function loadSchedule() {
  const res = await apiFetch('/schedule');
  const sched = res?.data?.schedule || {};
  const cls   = res?.data?.class || '10';
  const el = document.getElementById('scheduleGrid');
  const classEl = document.getElementById('scheduleClass');
  if (classEl) classEl.textContent = `Class ${cls}`;

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  el.innerHTML = days.map(day => `
    <div class="schedule-day">
      <div class="schedule-day-title">${day}</div>
      ${(sched[day]||[]).map((s,i) => `
        <div class="schedule-subject" style="border-left-color:${['var(--teal)','var(--amber)','var(--magenta)','var(--sky)','var(--crimson)','var(--lavender)'][i%6]}">
          <span style="font-size:11px;color:var(--text-4)">P${i+1}  </span>${s}
        </div>
      `).join('')}
    </div>
  `).join('');
}
