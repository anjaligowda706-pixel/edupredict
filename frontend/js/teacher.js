let CU = null, qCount = 0, allHw = [], gradingId = null, allStudents = [], allTests = [];

window.addEventListener('DOMContentLoaded', async () => {
  CU = initUserInfo();
  if (!CU) return;
  initAuroraCanvas('aurora-canvas');
  await loadDashboard();
  loadNotifications();
});

function onSectionLoad(s) {
  ({
    dashboard: loadDashboard,
    announcements: loadAnnouncements,
    'create-test': () => { if (!qCount) addQuestion(); },
    'manage-tests': loadManageTests,
    'homework-review': loadHwReview,
    'student-monitor': loadStudentMonitor,
    predictions: loadPredictions,
    'pending-approvals': loadPendingStudents,
  })[s]?.();
}

/* DASHBOARD */
async function loadDashboard() {
  const [sRes, tRes, hRes, pRes, subRes] = await Promise.all([
    apiFetch('/users/students'), apiFetch('/tests'), apiFetch('/homework'),
    apiFetch('/prediction/batch', { method:'POST', body:'{}' }),
    apiFetch('/submissions')
  ]);
  allStudents = sRes?.data?.students || [];
  allTests    = tRes?.data?.tests || [];
  allHw       = hRes?.data?.homework || [];
  const preds = pRes?.data?.predictions || [];
  const subs  = subRes?.data?.submissions || [];

  const pending = allHw.filter(h => h.status === 'submitted').length;
  const hwBadge = document.getElementById('hwBadge');
  if (hwBadge) { hwBadge.classList.toggle('hidden', !pending); hwBadge.textContent = pending; }

  const rCounts = { Low:0, Medium:0, High:0 };
  preds.forEach(p => { if (p.prediction?.riskLevel) rCounts[p.prediction.riskLevel]++; });

  document.getElementById('teacherStats').innerHTML = `
    <div class="stat-card teal"><span class="stat-icon">👥</span><div class="stat-val">${allStudents.length}</div><div class="stat-label">Total Students</div></div>
    <div class="stat-card amber"><span class="stat-icon">📝</span><div class="stat-val">${allTests.length}</div><div class="stat-label">Tests Published</div></div>
    <div class="stat-card sky"><span class="stat-icon">📁</span><div class="stat-val">${pending}</div><div class="stat-label">Pending Reviews</div></div>
    <div class="stat-card crimson"><span class="stat-icon">⚠️</span><div class="stat-val">${rCounts.High}</div><div class="stat-label">High Risk Students</div></div>
  `;

  // Class perf bar chart
  const subMap = {};
  subs.forEach(s => { if(!subMap[s.subject]) subMap[s.subject]=[]; subMap[s.subject].push(s.percentage); });
  const subLabels = Object.keys(subMap);
  const subAvgs   = subLabels.map(k => Math.round(subMap[k].reduce((a,b)=>a+b,0)/subMap[k].length));
  barChart('chartClassPerf', subLabels, [{
    label:'Class Avg %', data:subAvgs,
    backgroundColor: subAvgs.map(v => v>=70?'rgba(0,229,170,0.75)':v>=50?'rgba(255,179,71,0.75)':'rgba(255,77,109,0.75)'),
    borderRadius:8
  }]);

  doughnutChart('chartRisk',
    ['Low Risk','Medium Risk','High Risk'],
    [rCounts.Low||1, rCounts.Medium||1, rCounts.High||1],
    ['rgba(0,229,170,0.8)','rgba(255,179,71,0.8)','rgba(255,77,109,0.8)']
  );

  const atRisk = preds.filter(p=>p.prediction?.riskLevel==='High');
  document.getElementById('atRiskList').innerHTML = atRisk.length
    ? `<div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Predicted</th><th>Attendance</th><th>Key Issue</th><th></th></tr></thead><tbody>`+
      atRisk.map(p => `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av ${avClass(p.student.name)}">${initials(p.student.name)}</div>
            <div>
              <div style="font-family:var(--font-display);font-weight:600">${p.student.name}</div>
              <div style="font-size:11px;color:var(--text-4)">${p.student.studentId||''}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--crimson)">${p.prediction.predictedScore}%</strong></td>
        <td>${p.prediction.attendanceScore}%</td>
        <td style="font-size:12px;color:var(--text-3);max-width:200px">${p.prediction.recommendations?.[0]||'—'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openStuModal('${p.student.id}')">👁 View</button></td>
      </tr>`).join('')+`</tbody></table></div>`
    : '<div class="alert alert-teal"><span>✅</span><span>No high-risk students. Great class performance!</span></div>';
}

/* ANNOUNCEMENTS */
async function loadAnnouncements() {
  const res = await apiFetch('/announcements');
  const anns = res?.data?.announcements || [];
  document.getElementById('teacherAnnList').innerHTML = anns.map(a => `
    <div class="ann-card ${a.priority}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
        <div class="ann-title">${a.title}</div>
        <span class="badge ${a.priority==='high'?'b-crim':a.priority==='medium'?'b-amber':'b-teal'}">${a.priority}</span>
      </div>
      <div class="ann-body">${a.body}</div>
      <div class="ann-meta"><span>👤 ${a.author}</span><span>🕐 ${timeAgo(a.createdAt)}</span></div>
    </div>
  `).join('');
}

async function postAnnouncement(e) {
  e.preventDefault();
  const res = await apiFetch('/announcements', { method:'POST', body: JSON.stringify({
    title: document.getElementById('annTitle').value,
    body:  document.getElementById('annBody').value,
    priority: document.getElementById('annPriority').value,
    targetRole: 'all'
  })});
  if (res?.ok) {
  ANN.addNotification(title, body, targetRole, priority); // ← add this
  toast('Announcement posted!', 'success');
}
}

/* CREATE TEST */
function addQuestion() {
  const container = document.getElementById('qBuilder');
  const qi = qCount++;
  const div = document.createElement('div');
  div.id = `qb-${qi}`;
  div.className = 'q-card';
  div.style.marginBottom = '14px';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="q-num">Question ${qi + 1}</div>
      <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('qb-${qi}').remove()">🗑 Remove</button>
    </div>
    <div style="display:grid;gap:12px">
      <div><label class="f-label">Question Text</label><input class="f-input" id="qt-${qi}" required placeholder="Write your question..."></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${['A','B','C','D'].map((l,i)=>`<div><label class="f-label">Option ${l}</label><input class="f-input" id="qo-${qi}-${i}" required placeholder="Option ${l}"></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="f-label">Correct Answer</label>
          <select class="f-select" id="qc-${qi}">
            ${['A','B','C','D'].map((l,i)=>`<option value="${i}">Option ${l}</option>`).join('')}
          </select>
        </div>
        <div><label class="f-label">Marks</label><input type="number" class="f-input" id="qm-${qi}" value="1" min="1" max="10"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
}

function clearTestForm() {
  ['testTitle','testSubject','testDuration','testClass','testDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'testDuration' ? '30' : '';
  });
  document.getElementById('qBuilder').innerHTML = '';
  qCount = 0;
  document.getElementById('createTestMsg').innerHTML = '';
  addQuestion();
}

async function createTest(e) {
  e.preventDefault();
  const qs = [];
  for (let i = 0; i < qCount; i++) {
    const qEl = document.getElementById(`qb-${i}`);
    if (!qEl) continue;
    const text = document.getElementById(`qt-${i}`)?.value?.trim();
    if (!text) { toast('Fill in all question texts','error'); return; }
    const opts = [0,1,2,3].map(j => document.getElementById(`qo-${i}-${j}`)?.value?.trim());
    if (opts.some(o=>!o)) { toast('Fill in all options','error'); return; }
    qs.push({ question:text, options:opts, correctAnswer:parseInt(document.getElementById(`qc-${i}`)?.value||'0'), marks:parseInt(document.getElementById(`qm-${i}`)?.value||'1') });
  }
  if (!qs.length) { toast('Add at least 1 question','error'); return; }

  const res = await apiFetch('/tests', { method:'POST', body: JSON.stringify({
    title: document.getElementById('testTitle').value,
    subject: document.getElementById('testSubject').value,
    description: document.getElementById('testDesc').value,
    duration: parseInt(document.getElementById('testDuration').value),
    assignedClass: document.getElementById('testClass').value,
    questions: qs
  })});

  const msgEl = document.getElementById('createTestMsg');
  if (res?.ok) {
    msgEl.innerHTML = `<div class="alert alert-teal">✅ Test published! Students can now take it.</div>`;
    toast('Test created!','success');
    clearTestForm();
  } else {
    msgEl.innerHTML = `<div class="alert alert-crimson">❌ ${res?.data?.error||'Failed'}</div>`;
  }
}

/* MANAGE TESTS */
async function loadManageTests() {
  const res = await apiFetch('/tests');
  allTests = res?.data?.tests || [];
  renderMgTests(allTests);
}

function renderMgTests(tests) {
  const el = document.getElementById('mgTestList');
  if (!tests.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📝</span><div class="empty-title">No tests yet</div></div>'; return; }
  el.innerHTML = `<div class="g-auto" style="margin-top:4px">` +
    tests.map(t => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span class="subj-chip">${t.subject}</span>
          <span class="badge ${t.isActive?'b-teal':'b-amber'}">${t.isActive?'Active':'Inactive'}</span>
        </div>
        <div style="font-family:var(--font-display);font-weight:700;margin-bottom:6px;font-size:14px">${t.title}</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">${t.description||''}</div>
        <div style="display:flex;gap:14px;font-size:11px;color:var(--text-4);font-family:var(--font-display);margin-bottom:14px">
          <span>⏱ ${t.duration}m</span><span>📋 ${t.questions?.length}Qs</span><span>🏆 ${t.totalMarks}pts</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-danger btn-sm" onclick="deleteTest('${t._id||t.id}')">🗑</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleTest('${t._id||t.id}',${!t.isActive})">${t.isActive?'⏸ Deactivate':'▶ Activate'}</button>
        </div>
      </div>
    `).join('') + '</div>';
}

function filterMgTests(q) {
  renderMgTests(allTests.filter(t => t.title?.toLowerCase().includes(q.toLowerCase()) || t.subject?.toLowerCase().includes(q.toLowerCase())));
}

async function deleteTest(id) {
  if (!confirm('Delete this test permanently?')) return;
  const res = await apiFetch(`/tests/${id}`, { method:'DELETE' });
  if (res?.ok) { toast('Deleted','success'); loadManageTests(); }
}

async function toggleTest(id, active) {
  const res = await apiFetch(`/tests/${id}`, { method:'PUT', body: JSON.stringify({ isActive:active }) });
  if (res?.ok) { toast(active?'Activated':'Deactivated','success'); loadManageTests(); }
}

/* HOMEWORK REVIEW */
async function loadHwReview() {
  const res = await apiFetch('/homework');
  allHw = res?.data?.homework || [];
  renderHwReview(allHw);
}

function filterHwStatus(status) {
  renderHwReview(status ? allHw.filter(h=>h.status===status) : allHw);
}

function renderHwReview(hw) {
  const el = document.getElementById('hwReviewList');
  if (!hw.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📁</span><div class="empty-title">No submissions</div></div>'; return; }
  el.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Title</th><th>File</th><th>Status</th><th>Grade</th><th>Submitted</th><th>Action</th></tr></thead><tbody>`+
    hw.map(h => `<tr>
      <td><div style="font-family:var(--font-display);font-weight:600">${h.studentName||'—'}</div></td>
      <td><span class="subj-chip">${h.subject}</span></td>
      <td style="max-width:160px;font-size:13px">${h.title}</td>
      <td>${h.fileName?`<a href="${h.filePath}" target="_blank" style="color:var(--teal);font-size:12px">📎 ${h.fileName.slice(0,20)}</a>`:'<span style="color:var(--text-4)">—</span>'}</td>
      <td><span class="badge ${h.status==='graded'?'b-teal':'b-amber'}">${h.status}</span></td>
      <td>${h.marks!=null?`<strong>${h.marks}/${h.maxMarks||10}</strong>`:'<span style="color:var(--text-4)">—</span>'}</td>
      <td style="font-size:11px;color:var(--text-4)">${fmtDate(h.submittedAt)}</td>
      <td><button class="btn btn-${h.status==='graded'?'ghost':'amber'} btn-sm" onclick="openGradeModal('${h._id||h.id}','${h.studentName}','${h.subject}','${h.title}')">✏️ ${h.status==='graded'?'Re-grade':'Grade'}</button></td>
    </tr>`).join('') + '</tbody></table></div>';
}

function openGradeModal(id, name, subject, title) {
  gradingId = id;
  document.getElementById('gradeDetails').innerHTML = `<strong>${name}</strong> — ${subject}<br><span>${title}</span>`;
  document.getElementById('gradeMarks').value = '';
  document.getElementById('gradeMax').value = '10';
  document.getElementById('gradeFeedback').value = '';
  openModal('gradeModal');
}

async function submitGrade() {
  const marks = parseInt(document.getElementById('gradeMarks').value);
  const maxMarks = parseInt(document.getElementById('gradeMax').value)||10;
  if (isNaN(marks)||marks<0) { toast('Enter valid marks','error'); return; }
  if (marks>maxMarks) { toast(`Marks cannot exceed ${maxMarks}`,'error'); return; }
  const res = await apiFetch(`/homework/${gradingId}/grade`, { method:'PUT', body: JSON.stringify({ marks, maxMarks, feedback: document.getElementById('gradeFeedback').value }) });
  if (res?.ok) { toast('Graded!','success'); closeModal('gradeModal'); loadHwReview(); }
  else toast('Failed','error');
}

/* STUDENT MONITOR */
async function loadStudentMonitor() {
  const [sRes, subRes, pRes] = await Promise.all([
    apiFetch('/users/students'), apiFetch('/submissions'),
    apiFetch('/prediction/batch', { method:'POST', body:'{}' })
  ]);
  allStudents = sRes?.data?.students || [];
  const subs = subRes?.data?.submissions || [];
  const preds = pRes?.data?.predictions || [];

  document.getElementById('stuMonitorBody').innerHTML = allStudents.map(s => {
    const sid = s._id||s.id;
    const sSubs = subs.filter(sub=>sub.studentId===sid);
    const avg = sSubs.length ? Math.round(sSubs.reduce((a,b)=>a+b.percentage,0)/sSubs.length) : 0;
    const pred = preds.find(p=>p.student.id===sid);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="av ${avClass(s.name)}">${initials(s.name)}</div>
          <div>
            <div style="font-family:var(--font-display);font-weight:600;font-size:14px">${s.name}</div>
            <div style="font-size:11px;color:var(--text-4)">${s.email}</div>
          </div>
        </div>
      </td>
      <td><span class="subj-chip">${s.studentId||'—'}</span></td>
      <td style="font-family:var(--font-display)">${s.class||'—'}${s.section?s.section:''}</td>
      <td style="font-family:var(--font-display);font-weight:600">${sSubs.length}</td>
      <td><span style="font-weight:700;color:${scoreColor(avg)};font-family:var(--font-display)">${avg}%</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress-track" style="width:70px"><div class="progress-fill ${pClass(s.attendance||75)}" style="width:${s.attendance||75}%"></div></div>
          <span style="font-size:12px;font-family:var(--font-display)">${s.attendance||75}%</span>
        </div>
      </td>
      <td>${riskBadge(pred?.prediction?.riskLevel)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openStuModal('${sid}')">👁 Details</button></td>
    </tr>`;
  }).join('');
}

function filterStudentMonitor(q) {
  document.querySelectorAll('#stuMonitorBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

async function openStuModal(id) {
  const [pRes, sRes, hRes] = await Promise.all([
    apiFetch(`/prediction/${id}`), apiFetch(`/submissions?studentId=${id}`), apiFetch(`/homework?studentId=${id}`)
  ]);
  const pred = pRes?.data?.prediction;
  const subs = sRes?.data?.submissions || [];
  const hw   = hRes?.data?.homework || [];
  const student = pRes?.data?.student;
  document.getElementById('stuModalTitle').textContent = `📊 ${student?.name||'Student'} — Profile`;
  document.getElementById('stuModalBody').innerHTML = `
    <div class="g2" style="margin-bottom:16px">
      <div style="background:var(--glass);border:1px solid var(--border2);border-radius:var(--r-xl);padding:20px;text-align:center">
        <div style="font-family:var(--font-display);font-size:38px;font-weight:900;color:var(--teal)">${pred?.predictedScore||0}%</div>
        <div style="font-size:12px;color:var(--text-3);font-family:var(--font-display)">Predicted Score</div>
      </div>
      <div style="background:var(--glass);border:1px solid var(--border2);border-radius:var(--r-xl);padding:20px;text-align:center">
        <div style="font-size:36px;margin-bottom:6px">${pred?.riskLevel==='Low'?'🟢':pred?.riskLevel==='Medium'?'🟡':'🔴'}</div>
        <div style="font-family:var(--font-display);font-weight:700">${pred?.riskLevel||'—'} Risk</div>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-family:var(--font-display);font-weight:700;margin-bottom:10px">Last 3 Tests</div>
      ${subs.slice(-3).map(s=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border2);font-size:13px">
        <span>${s.subject}</span><span style="font-weight:700;color:${scoreColor(s.percentage)}">${s.percentage}%</span>
      </div>`).join('')||'<span style="color:var(--text-4)">No tests taken</span>'}
    </div>
    <div style="margin-bottom:16px">
      <div style="font-family:var(--font-display);font-weight:700;margin-bottom:10px">Homework (${hw.length})</div>
      ${hw.slice(-3).map(h=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border2);font-size:13px">
        <span>${h.subject}: ${h.title}</span><span class="badge ${h.status==='graded'?'b-teal':'b-amber'}">${h.status}</span>
      </div>`).join('')||'<span style="color:var(--text-4)">None</span>'}
    </div>
    ${pred?.recommendations?.length?`<div style="padding:14px;background:var(--amber-glow);border:1px solid rgba(255,179,71,0.2);border-radius:var(--r-md)">
      <div style="font-family:var(--font-display);font-weight:700;color:var(--amber);margin-bottom:8px;font-size:13px">💡 AI Recommendations</div>
      ${pred.recommendations.map(r=>`<div style="font-size:12px;padding:3px 0;color:var(--text-2)">• ${r}</div>`).join('')}
    </div>`:''}
  `;
  openModal('stuModal');
}

/* AI PREDICTIONS */
async function loadPredictions() {
  const el = document.getElementById('predTable');
  el.innerHTML = '<div class="empty"><span class="empty-icon" style="animation:iconPulse 1s infinite">🤖</span><div class="empty-title">Generating predictions...</div></div>';
  const res = await apiFetch('/prediction/batch', { method:'POST', body:'{}' });
  const preds = res?.data?.predictions || [];
  if (!preds.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📊</span><div class="empty-title">No data yet</div></div>'; return; }

  const sorted = [...preds].sort((a,b)=>a.prediction?.predictedScore-b.prediction?.predictedScore);
  el.innerHTML = `<div class="tbl-wrap"><table><thead><tr>
    <th>Student</th><th>Predicted</th><th>Current Avg</th><th>Attendance</th><th>HW Rate</th><th>Trend</th><th>Risk</th><th>Top Recommendation</th>
  </tr></thead><tbody>` +
    sorted.map(p => {
      const pred = p.prediction;
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av ${avClass(p.student.name)}" style="width:32px;height:32px;font-size:11px">${initials(p.student.name)}</div>
            <div>
              <div style="font-family:var(--font-display);font-weight:600">${p.student.name}</div>
              <div style="font-size:10px;color:var(--text-4)">${p.student.studentId||''}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:${scoreColor(pred.predictedScore)};font-family:var(--font-display)">${pred.predictedScore}%</strong></td>
        <td style="font-family:var(--font-display)">${pred.currentAverage}%</td>
        <td style="font-family:var(--font-display)">${pred.attendanceScore}%</td>
        <td style="font-family:var(--font-display)">${pred.homeworkRate}%</td>
        <td style="color:${pred.trend>0?'var(--teal)':pred.trend<0?'var(--crimson)':'var(--text-3)'};font-family:var(--font-display)">${pred.trend>0?'▲':pred.trend<0?'▼':'—'} ${Math.abs(pred.trend)}%</td>
        <td>${riskBadge(pred.riskLevel)}</td>
        <td style="font-size:11px;color:var(--text-3);max-width:180px">${pred.recommendations?.[0]||'—'}</td>
      </tr>`;
    }).join('') + '</tbody></table></div>';
}
/* PENDING APPROVALS */
async function loadPendingStudents() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/auth/pending-students', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    const tbody = document.getElementById('pendingStudentsBody');
    const badge = document.getElementById('pendingBadge');
    if (!tbody) return;

    if (!data.students || data.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">No pending approvals ✅</td></tr>';
      if (badge) badge.textContent = '0';
      return;
    }

    if (badge) badge.textContent = data.students.length;
    tbody.innerHTML = data.students.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.email}</td>
        <td>${s.studentId || '-'}</td>
        <td>${s.class || '-'}</td>
        <td>${new Date(s.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-teal btn-sm" onclick="approveStudent('${s._id||s.id}', 'approved')">✅ Approve</button>
          <button class="btn btn-ghost btn-sm" style="margin-left:8px" onclick="approveStudent('${s._id||s.id}', 'rejected')">❌ Reject</button>
        </td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

async function approveStudent(studentId, action) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/auth/approve/${studentId}`, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  const data = await res.json();
  if (data.success) {
    alert(action === 'approved' ? '✅ Student approved!' : '❌ Student rejected!');
    loadPendingStudents();
  }
}

// Load pending on startup
loadPendingStudents();