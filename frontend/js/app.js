/* ═══════════════════════════════════════
   EDUPREDICT AI v2 — SHARED APP UTILITIES
   Aurora Edition
═══════════════════════════════════════ */

const API_BASE = window.location.origin;

// ── Auth Helpers ──
const getToken = () => localStorage.getItem('token');
const getUser  = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };

// ────────────────────────────────────────────────────────
// FIX 2: Per-user localStorage key so read-state is never
//         shared between accounts on the same browser.
// ────────────────────────────────────────────────────────
function _readKey() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return 'readNotifIds_' + (u.id || u._id || 'guest');
  } catch { return 'readNotifIds_guest'; }
}
function _getReadIds() {
  try { return JSON.parse(localStorage.getItem(_readKey()) || '[]'); } catch { return []; }
}
function _saveReadIds(ids) {
  try { localStorage.setItem(_readKey(), JSON.stringify(ids)); } catch {}
}

// ────────────────────────────────────────────────────────
// FIX 1: Save read-state BEFORE localStorage.clear(),
//         restore it immediately after — survives logout.
// ────────────────────────────────────────────────────────
function logout() {
  const key     = _readKey();
  const saved   = localStorage.getItem(key);
  localStorage.clear();
  if (saved) localStorage.setItem(key, saved);
  window.location.href = "/index.html";
  window.location.href = '/index.html';
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  if (opts.body instanceof FormData) delete headers['Content-Type'];
  try {
    const res = await fetch(API_BASE + '/api' + path, { ...opts, headers });
    const data = await res.json();
    if (res.status === 401) { logout(); return null; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API error:', path, err);
    return { ok: false, data: { error: 'Network error' } };
  }
}

// ── Aurora Canvas ──
function initAuroraCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, time = 0;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function rnd(a, b) { return Math.random() * (b - a) + a; }

  const particles = Array.from({ length: 80 }, () => ({
    reset() {
      this.x = rnd(0, W); this.y = rnd(H * 0.3, H);
      this.vx = rnd(-0.2, 0.2); this.vy = rnd(-0.3, -0.08);
      this.r = rnd(0.8, 2.2); this.life = rnd(0.4, 1);
      this.decay = rnd(0.003, 0.008); this.hue = rnd(140, 200);
    },
    update() {
      this.x += this.vx + Math.sin(time * 0.008 + this.y * 0.01) * 0.25;
      this.y += this.vy;
      this.life -= this.decay;
      if (this.life <= 0 || this.y < -10) this.reset();
    },
    draw() {
      ctx.save();
      ctx.globalAlpha = this.life * 0.5;
      ctx.fillStyle = `hsl(${this.hue},80%,70%)`;
      ctx.shadowBlur = 6; ctx.shadowColor = `hsl(${this.hue},100%,75%)`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }));
  particles.forEach(p => p.reset());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    time++;
    requestAnimationFrame(loop);
  }
  loop();
}

// ── Section Navigation ──
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById(`sec-${name}`);
  if (sec) sec.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(n => {
    if (n.dataset.section === name) n.classList.add('active');
  });

  const titles = {
    dashboard: ['Dashboard', 'Your academic overview'],
    tests: ['My Tests', 'Available and completed exams'],
    exam: ['Take Exam', 'Start a timed exam session'],
    homework: ['Homework', 'Submit and track assignments'],
    performance: ['Performance', 'Detailed analytics & charts'],
    prediction: ['AI Prediction', 'Machine learning forecast'],
    leaderboard: ['Leaderboard', 'Class rankings'],
    schedule: ['Class Schedule', 'Weekly timetable'],
    announcements: ['Announcements', 'School notices'],
    'create-test': ['Create Test', 'Build a new exam'],
    'manage-tests': ['Manage Tests', 'View and edit your tests'],
    'homework-review': ['Review Homework', 'Grade student submissions'],
    'student-monitor': ['Student Monitor', 'Track all students'],
    predictions: ['AI Predictions', 'Risk assessment for all students'],
    students: ['Students', 'Manage student accounts'],
    teachers: ['Teachers', 'Manage teacher accounts'],
    analytics: ['Analytics', 'System-wide metrics'],
    'ai-insights': ['AI Insights', 'ML predictions dashboard'],
    settings: ['Settings', 'System configuration'],
  };

  const t = titles[name] || [name, ''];
  const el1 = document.getElementById('topbarTitle');
  const el2 = document.getElementById('topbarSub');
  if (el1) el1.textContent = t[0];
  if (el2) el2.textContent = t[1];

  if (typeof onSectionLoad === 'function') onSectionLoad(name);
}

// ── Modal Helpers ──
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-bg')) e.target.classList.remove('open');
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifPanel')) {
    const p = document.getElementById('notifPanel');
    if (p) p.classList.remove('open');
  }
});

// ── Notifications ──
let notifOpen = false;

function toggleNotif() {
  const p = document.getElementById('notifPanel');
  if (!p) return;
  notifOpen = !notifOpen;
  p.classList.toggle('open', notifOpen);
  if (notifOpen) loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  const user = getUser();

  const res = await apiFetch('/announcements');
  let anns = res?.data?.announcements || [];

  // Filter by targetRole
  anns = anns.filter(a => {
    const target = (a.targetRole || 'all').toLowerCase();
    return target === 'all' || target === (user?.role || '');
  });

  // FIX 2 + FIX 3: per-user key + always normalize _id vs id
  const readIds = _getReadIds();
  const getId   = a => a._id || a.id || '';

  const unread = anns.filter(a => !readIds.includes(getId(a))).length;

  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  const annBadge = document.getElementById('annBadge');
  if (annBadge) {
    if (unread > 0) { annBadge.textContent = unread; annBadge.classList.remove('hidden'); }
    else annBadge.classList.add('hidden');
  }

  if (!anns.length) {
    list.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:var(--text-4)">
        <div style="font-size:36px;margin-bottom:10px">🔔</div>
        <div style="font-family:var(--font-display);font-size:13px;font-weight:600">No notifications yet</div>
        <div style="font-size:12px;margin-top:4px">Announcements will appear here</div>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div style="padding:8px 18px;background:var(--gray-50);border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center">
      <span style="font-family:var(--font-display);font-size:11px;color:var(--text-4)">${unread} unread</span>
      <button onclick="markAllRead()" style="background:none;border:none;font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--navy-mid);cursor:pointer;padding:4px 8px;">✓ Mark all read</button>
    </div>
    ${anns.map(a => {
      const id     = getId(a);
      const isRead = readIds.includes(id);
      const borderColor = a.priority === 'high' ? 'var(--ruby)' : a.priority === 'medium' ? 'var(--gold-mid)' : 'var(--emerald-mid)';
      return `
        <div class="notif-item ${isRead ? '' : 'unread'}"
             style="border-left:3px solid ${borderColor};cursor:pointer"
             onclick="markOneRead('${id}', this)">
          <div class="notif-msg" style="font-size:13px;line-height:1.5">
            <strong>${a.title}</strong><br>
            <span style="color:var(--text-3)">${(a.body || '').slice(0, 100)}${(a.body || '').length > 100 ? '…' : ''}</span>
          </div>
          <div class="notif-time" style="display:flex;justify-content:space-between;margin-top:5px">
            <span>👤 ${a.author || 'School'}</span>
            <span>${timeAgo(a.createdAt)}</span>
          </div>
        </div>`;
    }).join('')}
  `;
}

// FIX 2 + FIX 3
function markOneRead(id, el) {
  const readIds = _getReadIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    _saveReadIds(readIds);
  }
  if (el) {
    el.classList.remove('unread');
    el.style.borderLeftColor = 'var(--gray-300)';
  }
  loadNotifications();
}

// FIX 2 + FIX 3
async function markAllRead() {
  const res  = await apiFetch('/announcements');
  const anns = res?.data?.announcements || [];
  const allIds = anns.map(a => a._id || a.id).filter(Boolean);
  _saveReadIds(allIds);
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  const annBadge = document.getElementById('annBadge');
  if (annBadge) annBadge.classList.add('hidden');
  loadNotifications();
}

// FIX 2 + FIX 3
async function refreshNotifBadge() {
  const user = getUser();
  if (!user) return;

  const res = await apiFetch('/announcements');
  let anns  = res?.data?.announcements || [];

  anns = anns.filter(a => {
    const target = (a.targetRole || 'all').toLowerCase();
    return target === 'all' || target === (user?.role || '');
  });

  const readIds = _getReadIds();
  const unread  = anns.filter(a => !readIds.includes(a._id || a.id || '')).length;

  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  const annBadge = document.getElementById('annBadge');
  if (annBadge) {
    if (unread > 0) { annBadge.textContent = unread; annBadge.classList.remove('hidden'); }
    else annBadge.classList.add('hidden');
  }
}

// ── Toast ──
function toast(msg, type = 'info', dur = 4000) {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const icons = { success: '✅', error: '❌', info: '💡', warning: '⚡' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  t.onclick = () => t.remove();
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(60px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, dur);
}

// ── Chart.js Defaults ──
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#5a8069';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  Chart.defaults.font.size = 12;
}

const COLORS = {
  teal:    'rgba(0,229,170,0.85)',
  tealBg:  'rgba(0,229,170,0.12)',
  amber:   'rgba(255,179,71,0.85)',
  amberBg: 'rgba(255,179,71,0.12)',
  mag:     'rgba(255,77,171,0.85)',
  magBg:   'rgba(255,77,171,0.12)',
  sky:     'rgba(77,255,195,0.85)',
  crimson: 'rgba(255,77,109,0.85)',
  lav:     'rgba(200,168,255,0.85)',
};

function destroyChart(id) {
  const c = Chart.getChart(id);
  if (c) c.destroy();
}

function lineChart(id, labels, datasets, yMax = 100) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 8 } } },
      scales: {
        y: { beginAtZero: true, max: yMax, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false } }
      },
      elements: { point: { radius: 4, hoverRadius: 7 } }
    }
  });
}

function barChart(id, labels, datasets, opts = {}) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: !!opts.showLegend } },
      scales: {
        y: { beginAtZero: true, max: opts.yMax || 100, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } }
      },
      borderRadius: opts.radius || 6,
      ...opts
    }
  });
}

function doughnutChart(id, labels, data, colors) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  return new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } }
    }
  });
}

function radarChart(id, labels, data) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Score %',
        data,
        backgroundColor: 'rgba(0,229,170,0.15)',
        borderColor: 'rgba(0,229,170,0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0,229,170,0.9)',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#9dbfa6' } } },
      plugins: { legend: { display: false } }
    }
  });
}

// ── Helpers ──
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function grade(pct) {
  if (pct >= 90) return { g: 'A+', cls: 'b-teal' };
  if (pct >= 80) return { g: 'A',  cls: 'b-sky' };
  if (pct >= 70) return { g: 'B',  cls: 'b-teal' };
  if (pct >= 60) return { g: 'C',  cls: 'b-amber' };
  if (pct >= 50) return { g: 'D',  cls: 'b-amber' };
  return { g: 'F', cls: 'b-crim' };
}

function riskBadge(r) {
  const map = { Low: 'b-teal', Medium: 'b-amber', High: 'b-crim' };
  const icon = { Low: '🟢', Medium: '🟡', High: '🔴' };
  return `<span class="badge ${map[r]||'b-lav'}">${icon[r]||''} ${r||'N/A'}</span>`;
}

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avClass(name) {
  const c = ['av-teal','av-amber','av-mag','av-sky','av-crim','av-lav'];
  return c[(name || '').charCodeAt(0) % c.length];
}

function scoreColor(pct) {
  if (pct >= 70) return 'var(--teal)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--crimson)';
}

function pfClass(pct) {
  if (pct >= 70) return 'pf-teal';
  if (pct >= 50) return 'pf-amber';
  return 'pf-crim';
}

// ── Drag & Drop ──
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('dragover'); }
function handleDrop(e) {
  e.preventDefault(); e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    try { document.getElementById('hwFile').files = e.dataTransfer.files; } catch {}
    handleFileSelect({ files: [file] });
  }
}
function handleFileSelect(inp) {
  const file = inp.files?.[0];
  if (!file) return;
  const txt = document.getElementById('uploadText');
  if (txt) txt.textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`;
  const zone = document.getElementById('uploadZone');
  if (zone) { zone.style.borderColor = 'var(--teal)'; zone.style.borderStyle = 'solid'; }
}

// ── Init User Info ──
function initUserInfo() {
  const user = getUser();
  if (!user) { logout(); return null; }

  const path = window.location.pathname;
  if (path.includes('/admin') && user.role !== 'admin') { window.location.href = '/index.html'; return null; }
  if (path.includes('/teacher') && user.role !== 'teacher') { window.location.href = '/index.html'; return null; }
  if (path.includes('/student') && user.role !== 'student') { window.location.href = '/index.html'; return null; }

  const avEl = document.getElementById('sbAvatar');
  const nameEl = document.getElementById('sbName');
  if (avEl) { avEl.textContent = initials(user.name); avEl.className = `sb-avatar ${avClass(user.name)}`; }
  if (nameEl) nameEl.textContent = user.name;

  return user;
}

// ── Number Format ──
function fmtN(n) { return n >= 1000 ? (n/1000).toFixed(1) + 'K' : n; }

// ── Score to Progress Class ──
function pClass(pct) {
  if (pct >= 70) return 'pf-teal';
  if (pct >= 50) return 'pf-amber';
  return 'pf-crim';
}
