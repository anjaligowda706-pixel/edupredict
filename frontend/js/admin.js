let CU = null, adminStudents = [], adminTeachers = [], adminTests = [];

window.addEventListener('DOMContentLoaded', async () => {
  CU = initUserInfo();
  if (!CU) return;
  initAuroraCanvas('aurora-canvas');
  await loadDashboard();
  loadNotifications();
});

function onSectionLoad(s) {
  ({ dashboard:loadDashboard, analytics:loadAnalytics, students:loadStudents, teachers:loadTeachers,
     tests:loadAdminTests, announcements:loadAnnouncements, 'ai-insights':loadAiInsights, settings:loadSettings })[s]?.();
}

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  const [uRes, tRes, sRes, hRes, pRes, aRes] = await Promise.all([
    apiFetch('/users'), apiFetch('/tests'), apiFetch('/submissions'),
    apiFetch('/homework'), apiFetch('/prediction/batch', {method:'POST',body:'{}'}),
    apiFetch('/analytics/overview')
  ]);
  const users = uRes?.data?.users || [];
  const tests = tRes?.data?.tests || [];
  const subs  = sRes?.data?.submissions || [];
  const hw    = hRes?.data?.homework || [];
  const preds = pRes?.data?.predictions || [];
  const ov    = aRes?.data?.overview || {};

  adminStudents = users.filter(u=>u.role==='student');
  adminTeachers = users.filter(u=>u.role==='teacher');

  const rCounts = {Low:0,Medium:0,High:0};
  preds.forEach(p => { if(p.prediction?.riskLevel) rCounts[p.prediction.riskLevel]++; });
  const avgScore = subs.length ? Math.round(subs.reduce((a,b)=>a+b.percentage,0)/subs.length) : 0;

  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card teal"><span class="stat-icon">🎓</span><div class="stat-val">${adminStudents.length}</div><div class="stat-label">Students</div></div>
    <div class="stat-card sky"><span class="stat-icon">👩‍🏫</span><div class="stat-val">${adminTeachers.length}</div><div class="stat-label">Teachers</div></div>
    <div class="stat-card amber"><span class="stat-icon">📝</span><div class="stat-val">${tests.length}</div><div class="stat-label">Active Tests</div></div>
    <div class="stat-card mag"><span class="stat-icon">📊</span><div class="stat-val">${avgScore}%</div><div class="stat-label">System Avg</div></div>
    <div class="stat-card crimson"><span class="stat-icon">⚠️</span><div class="stat-val">${rCounts.High}</div><div class="stat-label">High Risk</div></div>
  `;

  barChart('chartWeekly', (ov.weekly||[]).map(d=>d.day), [{
    label:'Submissions', data:(ov.weekly||[]).map(d=>d.submissions||0),
    backgroundColor:'rgba(0,229,170,0.7)', borderRadius:6
  }], {showLegend:true, yMax:undefined});

  doughnutChart('chartAdminRisk',
    ['Low','Medium','High'],
    [rCounts.Low||1, rCounts.Medium||1, rCounts.High||1],
    ['rgba(0,229,170,0.8)','rgba(255,179,71,0.8)','rgba(255,77,109,0.8)']
  );

  const subMap = {};
  subs.forEach(s=>{if(!subMap[s.subject])subMap[s.subject]=[];subMap[s.subject].push(s.percentage);});
  const sl = Object.keys(subMap), sv = sl.map(k=>Math.round(subMap[k].reduce((a,b)=>a+b,0)/subMap[k].length));
  if(sl.length) barChart('chartSubjPerf', sl, [{
    label:'Avg %', data:sv,
    backgroundColor:sv.map(v=>v>=70?'rgba(0,229,170,0.7)':v>=50?'rgba(255,179,71,0.7)':'rgba(255,77,109,0.7)'),
    borderRadius:6
  }]);

  document.getElementById('recentUsersEl').innerHTML = [...users].reverse().slice(0,6).map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border2)">
      <div class="av ${avClass(u.name)}">${initials(u.name)}</div>
      <div style="flex:1"><div style="font-family:var(--font-display);font-weight:600;font-size:13px">${u.name}</div><div style="font-size:11px;color:var(--text-4)">${u.email}</div></div>
      <span class="badge ${u.role==='admin'?'b-lav':u.role==='teacher'?'b-sky':'b-teal'}">${u.role}</span>
    </div>
  `).join('');
}

/* ══ ANALYTICS ══ */
async function loadAnalytics() {
  const [uRes, sRes, hRes] = await Promise.all([apiFetch('/users/students'), apiFetch('/submissions'), apiFetch('/homework')]);
  const students = uRes?.data?.students || [];
  const subs = sRes?.data?.submissions || [];
  const hw = hRes?.data?.homework || [];

  const avgAtt = students.length ? Math.round(students.reduce((a,b)=>a+(b.attendance||75),0)/students.length) : 0;
  document.getElementById('analyticsStats').innerHTML = `
    <div class="stat-card teal"><span class="stat-icon">📅</span><div class="stat-val">${avgAtt}%</div><div class="stat-label">Avg Attendance</div></div>
    <div class="stat-card amber"><span class="stat-icon">📁</span><div class="stat-val">${hw.length}</div><div class="stat-label">HW Submissions</div></div>
    <div class="stat-card sky"><span class="stat-icon">✅</span><div class="stat-val">${hw.filter(h=>h.status==='graded').length}</div><div class="stat-label">HW Graded</div></div>
    <div class="stat-card mag"><span class="stat-icon">📝</span><div class="stat-val">${subs.length}</div><div class="stat-label">Test Submissions</div></div>
  `;

  const attBuckets = {'90-100':0,'75-89':0,'60-74':0,'<60':0};
  students.forEach(s => {
    const a = s.attendance||75;
    if(a>=90) attBuckets['90-100']++; else if(a>=75) attBuckets['75-89']++; else if(a>=60) attBuckets['60-74']++; else attBuckets['<60']++;
  });
  doughnutChart('chartAtt', Object.keys(attBuckets), Object.values(attBuckets),
    ['rgba(0,229,170,0.8)','rgba(77,255,195,0.8)','rgba(255,179,71,0.8)','rgba(255,77,109,0.8)']
  );

  const hwSubj = {};
  hw.forEach(h=>{if(!hwSubj[h.subject])hwSubj[h.subject]=0;hwSubj[h.subject]++;});
  barChart('chartHwSubj', Object.keys(hwSubj), [{
    label:'Submissions', data:Object.values(hwSubj),
    backgroundColor:'rgba(200,168,255,0.7)', borderRadius:6
  }], {showLegend:true, yMax:undefined});

  const scoreBuckets = {'90-100':0,'70-89':0,'50-69':0,'<50':0};
  subs.forEach(s=>{
    if(s.percentage>=90) scoreBuckets['90-100']++; else if(s.percentage>=70) scoreBuckets['70-89']++;
    else if(s.percentage>=50) scoreBuckets['50-69']++; else scoreBuckets['<50']++;
  });
  barChart('chartScoreDist', Object.keys(scoreBuckets), [{
    label:'Students', data:Object.values(scoreBuckets),
    backgroundColor:['rgba(0,229,170,0.7)','rgba(77,255,195,0.7)','rgba(255,179,71,0.7)','rgba(255,77,109,0.7)'],
    borderRadius:6
  }], {showLegend:true, yMax:undefined});
}

/* ══ STUDENTS ══ */
async function loadStudents() {
  const res = await apiFetch('/users?role=student');
  adminStudents = res?.data?.users || [];
  renderAdminStu(adminStudents);
}

function renderAdminStu(students) {
  document.getElementById('adminStuBody').innerHTML = students.map(s => `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av ${avClass(s.name)}">${initials(s.name)}</div>
        <div><div style="font-family:var(--font-display);font-weight:600">${s.name}</div></div>
      </div>
    </td>
    <td><span class="subj-chip">${s.studentId||'—'}</span></td>
    <td>${s.class||'—'}${s.section||''}</td>
    <td style="font-size:12px;color:var(--text-3)">${s.email}</td>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="progress-track" style="width:70px"><div class="progress-fill ${pClass(s.attendance||75)}" style="width:${s.attendance||75}%"></div></div>
        <span style="font-size:12px;font-family:var(--font-display)">${s.attendance||75}%</span>
      </div>
    </td>
    <td><span class="badge ${s.isActive!==false?'b-teal':'b-crim'}">${s.isActive!==false?'Active':'Inactive'}</span></td>
    <td>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="editAtt('${s._id||s.id}','${s.name}',${s.attendance||75})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deactivate('${s._id||s.id}')">🗑</button>
      </div>
    </td>
  </tr>`).join('');
}

function filterAdminStu(q) {
  renderAdminStu(adminStudents.filter(s =>
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.email?.includes(q.toLowerCase()) ||
    s.studentId?.includes(q)
  ));
}

/* ══ TEACHERS ══ */
async function loadTeachers() {
  const res = await apiFetch('/users?role=teacher');
  adminTeachers = res?.data?.users || [];
  document.getElementById('adminTeachBody').innerHTML = adminTeachers.map(t => `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av ${avClass(t.name)}">${initials(t.name)}</div>
        <div style="font-family:var(--font-display);font-weight:600">${t.name}</div>
      </div>
    </td>
    <td><span class="subj-chip">${t.teacherId||'—'}</span></td>
    <td style="font-size:12px;color:var(--text-3)">${t.email}</td>
    <td style="font-size:13px;max-width:180px">${(t.subjects||[]).join(', ')||'—'}</td>
    <td><span class="badge ${t.isActive!==false?'b-teal':'b-crim'}">${t.isActive!==false?'Active':'Inactive'}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="deactivate('${t._id||t.id}')">🗑</button></td>
  </tr>`).join('');
}

/* ══ TESTS ══ */
async function loadAdminTests() {
  const res = await apiFetch('/tests');
  adminTests = res?.data?.tests || [];
  document.getElementById('adminTestsBody').innerHTML = adminTests.map(t => `<tr>
    <td style="font-family:var(--font-display);font-weight:600">${t.title}</td>
    <td><span class="subj-chip">${t.subject}</span></td>
    <td>${t.duration}m</td>
    <td>${t.questions?.length||0}</td>
    <td>${t.assignedClass||'All'}</td>
    <td><span class="badge ${t.isActive?'b-teal':'b-amber'}">${t.isActive?'Active':'Inactive'}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteAdminTest('${t._id||t.id}')">🗑 Delete</button></td>
  </tr>`).join('');
}

async function deleteAdminTest(id) {
  if (!confirm('Delete permanently?')) return;
  const res = await apiFetch(`/tests/${id}`, {method:'DELETE'});
  if (res?.ok) { toast('Deleted','success'); loadAdminTests(); }
}

/* ══ ANNOUNCEMENTS ══ */
async function loadAnnouncements() {
  const res = await apiFetch('/announcements');
  const anns = res?.data?.announcements || [];
  document.getElementById('adminAnnList').innerHTML = anns.map(a => `
    <div class="ann-card ${a.priority}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
        <div class="ann-title">${a.title}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge ${a.priority==='high'?'b-crim':a.priority==='medium'?'b-amber':'b-teal'}">${a.priority}</span>
          <span class="badge b-lav">${a.targetRole}</span>
          <button class="btn btn-danger btn-sm" onclick="deleteAnn('${a._id}')">🗑</button>
        </div>
      </div>
      <div class="ann-body">${a.body}</div>
      <div class="ann-meta"><span>👤 ${a.author}</span><span>🕐 ${timeAgo(a.createdAt)}</span></div>
    </div>
  `).join('');
}

async function postAdminAnn(e) {
  e.preventDefault();
  const res = await apiFetch('/announcements', { method:'POST', body: JSON.stringify({
    title:   document.getElementById('adminAnnTitle').value,
    body:    document.getElementById('adminAnnBody').value,
    priority:document.getElementById('adminAnnPriority').value,
    targetRole:document.getElementById('adminAnnTarget').value
  })});
  if (res?.ok) { toast('Posted!','success'); document.getElementById('adminAnnTitle').value=''; document.getElementById('adminAnnBody').value=''; loadAnnouncements(); }
}

async function deleteAnn(id) {
  if (!confirm('Delete?')) return;
  await apiFetch(`/announcements/${id}`,{method:'DELETE'});
  loadAnnouncements();
}

/* ══ AI INSIGHTS ══ */
async function loadAiInsights() {
  const el = document.getElementById('aiInsightTable');
  el.innerHTML = '<div class="empty"><span class="empty-icon" style="animation:iconPulse 1s infinite">🤖</span><div class="empty-title">Running AI analysis...</div></div>';
  const res = await apiFetch('/prediction/batch', {method:'POST',body:'{}'});
  const preds = res?.data?.predictions || [];

  const rCounts = {Low:0,Medium:0,High:0};
  preds.forEach(p => { if(p.prediction?.riskLevel) rCounts[p.prediction.riskLevel]++; });
  const total = preds.length||1;

  document.getElementById('aiSummaryStats').innerHTML = `
    <div class="stat-card teal"><span class="stat-icon">🟢</span><div class="stat-val">${rCounts.Low}</div><div class="stat-label">Low Risk (${Math.round(rCounts.Low/total*100)}%)</div></div>
    <div class="stat-card amber"><span class="stat-icon">🟡</span><div class="stat-val">${rCounts.Medium}</div><div class="stat-label">Medium Risk (${Math.round(rCounts.Medium/total*100)}%)</div></div>
    <div class="stat-card crimson"><span class="stat-icon">🔴</span><div class="stat-val">${rCounts.High}</div><div class="stat-label">High Risk (${Math.round(rCounts.High/total*100)}%)</div></div>
    <div class="stat-card sky"><span class="stat-icon">📊</span><div class="stat-val">${total}</div><div class="stat-label">Students Analyzed</div></div>
  `;

  const sorted = [...preds].sort((a,b)=>a.prediction?.predictedScore-b.prediction?.predictedScore);
  el.innerHTML = `<div class="tbl-wrap"><table><thead><tr>
    <th>Student</th><th>Class</th><th>Predicted</th><th>Current Avg</th><th>Attendance</th><th>HW Rate</th><th>Trend</th><th>Risk</th><th>Weak Subjects</th>
  </tr></thead><tbody>` +
    sorted.map(p => {
      const pred = p.prediction;
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av ${avClass(p.student.name)}" style="width:32px;height:32px;font-size:11px">${initials(p.student.name)}</div>
            <div>
              <div style="font-family:var(--font-display);font-weight:600;font-size:13px">${p.student.name}</div>
              <div style="font-size:10px;color:var(--text-4)">${p.student.studentId||''}</div>
            </div>
          </div>
        </td>
        <td style="font-family:var(--font-display)">${p.student.class||'—'}</td>
        <td><strong style="color:${scoreColor(pred.predictedScore)};font-family:var(--font-display)">${pred.predictedScore}%</strong></td>
        <td style="font-family:var(--font-display)">${pred.currentAverage}%</td>
        <td style="font-family:var(--font-display)">${pred.attendanceScore}%</td>
        <td style="font-family:var(--font-display)">${pred.homeworkRate}%</td>
        <td style="color:${pred.trend>0?'var(--teal)':pred.trend<0?'var(--crimson)':'var(--text-3)'}">${pred.trend>0?'▲':pred.trend<0?'▼':'—'}</td>
        <td>${riskBadge(pred.riskLevel)}</td>
        <td style="font-size:11px;max-width:180px">${pred.subjectAnalysis?.filter(s=>s.status==='weak').map(s=>`<span class="badge b-crim" style="margin:1px;font-size:10px">${s.subject}</span>`).join('')||'—'}</td>
      </tr>`;
    }).join('') + '</tbody></table></div>';
}

/* ══ ADD USER ══ */
function setAddRole(role) {
  document.getElementById('newRole').value = role;
  toggleAddFields();
}

function toggleAddFields() {
  const role = document.getElementById('newRole').value;
  document.getElementById('addStuFields').style.display  = role==='student'?'':'none';
  document.getElementById('addTeachFields').style.display = role==='teacher'?'':'none';
}

async function addUser(e) {
  e.preventDefault();
  const role = document.getElementById('newRole').value;
  const body = {
    name:  document.getElementById('newName').value,
    email: document.getElementById('newEmail').value,
    password: document.getElementById('newPass').value||'password123',
    role, studentId: document.getElementById('newStuId')?.value,
    class:  document.getElementById('newClass')?.value,
    section:document.getElementById('newSection')?.value,
    attendance:parseInt(document.getElementById('newAtt')?.value)||80,
    teacherId: document.getElementById('newTeachId')?.value,
    subjects: document.getElementById('newSubjects')?.value?.split(',').map(s=>s.trim()).filter(Boolean)
  };
  const res = await apiFetch('/users', {method:'POST', body:JSON.stringify(body)});
  const msg = document.getElementById('addUserMsg');
  if (res?.ok) {
    msg.innerHTML = '<div class="alert alert-teal">✅ User created!</div>';
    toast('User created!','success');
    setTimeout(()=>{ closeModal('addUserModal'); if(role==='student')loadStudents(); else loadTeachers(); msg.innerHTML=''; },1500);
  } else {
    msg.innerHTML = `<div class="alert alert-crimson">❌ ${res?.data?.error||'Failed'}</div>`;
  }
}

/* ══ BULK IMPORT ══ */
async function doBulkImport() {
  const csv = document.getElementById('csvData').value.trim();
  const resultEl = document.getElementById('bulkResult');
  if (!csv) { resultEl.innerHTML = '<div class="alert alert-amber">Paste CSV data first</div>'; return; }

  const students = csv.split('\n').filter(l=>l.trim()).map(line => {
    const p = line.split(',').map(s=>s.trim());
    return { name:p[0], email:p[1], studentId:p[2], class:p[3], section:p[4]||'A', attendance:parseInt(p[5])||80 };
  }).filter(s=>s.name&&s.email);

  if (!students.length) { resultEl.innerHTML = '<div class="alert alert-crimson">No valid rows found</div>'; return; }
  resultEl.innerHTML = '<div style="color:var(--text-3);font-size:13px">⏳ Importing...</div>';
  const res = await apiFetch('/users/bulk', {method:'POST', body:JSON.stringify({students})});
  if (res?.ok) {
    resultEl.innerHTML = `<div class="alert alert-teal">✅ ${res.data.created} students imported! ${res.data.errors?.length?`Errors: ${res.data.errors.length}`:'All successful.'}</div>`;
    toast(`${res.data.created} imported!`,'success');
    loadStudents();
  } else {
    resultEl.innerHTML = `<div class="alert alert-crimson">❌ ${res?.data?.error||'Import failed'}</div>`;
  }
}

async function editAtt(id, name, current) {
  const val = prompt(`Update attendance for ${name} (current: ${current}%)\nEnter value (0-100):`, current);
  if (val===null) return;
  const att = parseInt(val);
  if (isNaN(att)||att<0||att>100) { toast('Invalid value','error'); return; }
  const res = await apiFetch(`/users/${id}`, {method:'PUT', body:JSON.stringify({attendance:att})});
  if (res?.ok) { toast('Updated!','success'); loadStudents(); }
}

async function deactivate(id) {
  if (!confirm('Deactivate this user?')) return;
  const res = await apiFetch(`/users/${id}`, {method:'DELETE'});
  if (res?.ok) { toast('Deactivated','success'); loadStudents(); loadTeachers(); }
}

function loadSettings() {
  document.getElementById('sysInfoEl').innerHTML = [
    ['Version','2.0.0 Aurora Edition'],
    ['Backend','Node.js + Express'],
    ['Database','MongoDB / In-Memory'],
    ['Authentication','JWT (7d)'],
    ['AI Engine','Weighted Multi-Factor Model'],
    ['File Upload','Multer (10MB limit)'],
    ['Students Capacity','900+'],
    ['Charts','Chart.js 4.x'],
  ].map(([k,v]) => `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border2);font-size:13px">
      <span style="color:var(--text-3);font-family:var(--font-display)">${k}</span>
      <span style="font-weight:600;font-family:var(--font-display)">${v}</span>
    </div>
  `).join('');
}
