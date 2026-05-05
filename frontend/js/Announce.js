/* ================================================================
   EDUPREDICT AI — ANNOUNCEMENT + NOTIFICATION SYSTEM
   File: js/announce.js
   Load LAST in every HTML: <script src="../js/announce.js"></script>

   ── HTML to add in teacher / student / admin dashboards ──────────
   1) Inside .topbar-right:
      <button class="icon-btn" id="ann-bell-btn" onclick="ANN.toggle()" style="position:relative">
        🔔
        <span id="ann-bell-dot" style="display:none;position:absolute;top:5px;right:5px;
          width:8px;height:8px;border-radius:50%;background:#be123c;border:2px solid white"></span>
      </button>

   2) Just before </body>:
      <div id="ann-panel"></div>
      <div id="ann-toasts"></div>
      <script src="../js/announce.js"></script>

   ── JS to call when posting an announcement ───────────────────────
      ANN.addNotification(title, body, audience, priority);
      audience → 'all' | 'teacher' | 'student'
      priority → 'low' | 'medium' | 'high'

   ── IMPORTANT — fix your logout() ───────────────────────────────
   If your logout() calls localStorage.clear() it wipes all history.
   Replace it with a selective clear:

      function logout() {
        // Remove only session data, NOT announcement history
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // DO NOT call localStorage.clear()
        window.location.href = '../index.html';
      }
   ================================================================ */

(function () {

  /* ================================================================
     CONSTANTS — fixed storage keys, never tied to a user ID
     so they survive logout and page reload.
  ================================================================ */
  var BUCKETS = {
    all:     'edupredict_ann_all',
    teacher: 'edupredict_ann_teacher',
    student: 'edupredict_ann_student',
  };
  var READ_PREFIX = 'edupredict_ann_read_'; // + userId

  /* ── Helpers ── */
  function _role() {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').role || 'guest').toLowerCase(); }
    catch { return 'guest'; }
  }

  function _uid() {
    try { var u = JSON.parse(localStorage.getItem('user') || '{}'); return u.id || u._id || 'guest'; }
    catch { return 'guest'; }
  }

  /* Which buckets can this role read? */
  function _readBuckets() {
    var r = _role();
    if (r === 'admin')   return [BUCKETS.all, BUCKETS.teacher, BUCKETS.student];
    if (r === 'teacher') return [BUCKETS.all, BUCKETS.teacher];
    if (r === 'student') return [BUCKETS.all, BUCKETS.student];
    return [BUCKETS.all];
  }

  /* Which bucket does this audience write into? */
  function _writeBucket(audience) {
    var a = (audience || 'all').toLowerCase().trim();
    // Accept many variations people might pass
    if (a === 'teacher' || a === 'teachers')              return BUCKETS.teacher;
    if (a === 'student' || a === 'students')              return BUCKETS.student;
    return BUCKETS.all; // 'all', 'everyone', anything else → all
  }

  /* Per-user read-set (survives logout since key includes userId) */
  function _readKey()  { return READ_PREFIX + _uid(); }
  function _getRead()  {
    try { return new Set(JSON.parse(localStorage.getItem(_readKey()) || '[]')); }
    catch { return new Set(); }
  }
  function _saveRead(s) {
    try { localStorage.setItem(_readKey(), JSON.stringify([...s])); } catch {}
  }

  /* Read bucket safely */
  function _getBucket(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  /* Write bucket safely */
  function _setBucket(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
  }

  /* ── Migration: move any old-format keys into new buckets ── */
  function _migrate() {
    // Old keys from previous versions of this file
    var oldPatterns = [
      'ann_store_all', 'ann_store_teacher', 'ann_store_student',
      'ann_store_' + _uid(), 'ann_store_guest',
    ];
    oldPatterns.forEach(function(oldKey) {
      try {
        var old = JSON.parse(localStorage.getItem(oldKey) || '[]');
        if (!old.length) return;
        old.forEach(function(item) {
          var bk  = _writeBucket(item.audience || 'all');
          var arr = _getBucket(bk);
          if (!arr.find(function(e) { return e.id === item.id; })) {
            arr.unshift(item);
            _setBucket(bk, arr);
          }
        });
        localStorage.removeItem(oldKey);
      } catch {}
    });
  }

  /* ── Load all announcements visible to current role ── */
  function _load() {
    var readSet = _getRead();
    var seen    = {};
    var all     = [];
    _readBuckets().forEach(function(key) {
      _getBucket(key).forEach(function(item) {
        if (!seen[item.id]) {
          seen[item.id] = true;
          all.push(Object.assign({}, item, { read: readSet.has(item.id) }));
        }
      });
    });
    return all.sort(function(a, b) { return b.timestamp - a.timestamp; });
  }

  /* ── Append one announcement to its bucket (never overwrites existing) ── */
  function _append(ann) {
    var key = _writeBucket(ann.audience);
    var arr = _getBucket(key);
    // Guard: don't duplicate if somehow called twice
    if (!arr.find(function(e) { return e.id === ann.id; })) {
      arr.unshift(ann);
      _setBucket(key, arr);
    }
  }

  /* ── Small utilities ── */
  function _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function _ago(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5)     return 'just now';
    if (s < 60)    return s + 's ago';
    if (s < 3600)  return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function _audLabel(a) {
    return ({ all: 'All Users', teacher: 'Teachers', student: 'Students' })[a] || 'All Users';
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Panel state ── */
  var _filter = 'all';
  var _open   = false;

  /* ================================================================
     CSS
  ================================================================ */
  function _css() {
    if (document.getElementById('ann-css')) return;
    var el = document.createElement('style');
    el.id  = 'ann-css';
    el.textContent = [
      /* toasts */
      '#ann-toasts{position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column-reverse;gap:10px;pointer-events:none}',
      '.ann-toast{display:flex;align-items:stretch;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.13);min-width:290px;max-width:350px;pointer-events:all;cursor:pointer;animation:annIn .32s cubic-bezier(.34,1.56,.64,1) forwards;position:relative}',
      '.ann-toast.out{animation:annOut .25s ease forwards}',
      '@keyframes annIn{from{opacity:0;transform:translateX(55px) scale(.92)}to{opacity:1;transform:none}}',
      '@keyframes annOut{to{opacity:0;transform:translateX(55px) scale(.9)}}',
      '.ann-stripe{width:4px;flex-shrink:0}',
      '.ann-toast.success .ann-stripe{background:#059669}',
      '.ann-toast.error   .ann-stripe{background:#be123c}',
      '.ann-toast.warning .ann-stripe{background:#d97706}',
      '.ann-toast.info    .ann-stripe{background:#2563eb}',
      '.ann-ti{padding:12px 14px;flex:1;min-width:0}',
      '.ann-tr1{display:flex;align-items:flex-start;gap:8px;margin-bottom:2px}',
      '.ann-ticon{font-size:14px;flex-shrink:0;margin-top:1px}',
      '.ann-ttitle{font-family:Outfit,sans-serif;font-weight:700;font-size:13px;color:#0f172a;flex:1;line-height:1.3}',
      '.ann-tx{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:14px;padding:0;line-height:1;flex-shrink:0;transition:color .12s}',
      '.ann-tx:hover{color:#0f172a}',
      '.ann-tmsg{font-size:12px;color:#475569;line-height:1.5;margin:0 0 6px 22px}',
      '.ann-ttags{display:flex;gap:6px;margin-left:22px;flex-wrap:wrap}',
      /* shared tags */
      '.ann-tag{font-family:Outfit,sans-serif;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;border:1px solid}',
      '.ann-tag-aud{background:#dbeafe;color:#1e40af;border-color:#93c5fd}',
      '.ann-tag-high{background:#ffe4e6;color:#be123c;border-color:#fda4af}',
      '.ann-tag-medium{background:#fef3c7;color:#92400e;border-color:#fcd34d}',
      '.ann-tag-low{background:#d1fae5;color:#065f46;border-color:#6ee7b7}',
      /* progress bar */
      '.ann-prog{position:absolute;bottom:0;left:4px;right:0;height:2px;background:#f1f5f9}',
      '.ann-pfill{height:100%;border-radius:0 0 14px 0;transition:width linear}',
      '.ann-toast.success .ann-pfill{background:#059669}',
      '.ann-toast.error   .ann-pfill{background:#be123c}',
      '.ann-toast.warning .ann-pfill{background:#d97706}',
      '.ann-toast.info    .ann-pfill{background:#2563eb}',
      /* bell dot */
      '#ann-bell-dot{animation:annPulse 2s infinite}',
      '@keyframes annPulse{0%,100%{box-shadow:0 0 0 0 rgba(190,18,60,.45)}50%{box-shadow:0 0 0 5px rgba(190,18,60,0)}}',
      /* panel */
      '#ann-panel{position:fixed;top:62px;right:16px;width:358px;max-height:510px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 14px 50px rgba(15,23,42,.14);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:Outfit,sans-serif;animation:annPI .2s cubic-bezier(.34,1.56,.64,1)}',
      '#ann-panel.open{display:flex}',
      '@keyframes annPI{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}',
      '.ann-ph{padding:13px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
      '.ann-ph-l{font-weight:800;font-size:13px;color:#0f172a;display:flex;align-items:center;gap:8px}',
      '.ann-pill{background:#be123c;color:#fff;font-size:10px;font-weight:800;padding:1px 6px;border-radius:99px;display:none}',
      '.ann-ph-btns{display:flex;gap:6px}',
      '.ann-hbtn{padding:3px 9px;font-size:11px;font-weight:700;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;font-family:inherit;transition:all .14s}',
      '.ann-hbtn:hover{background:#f1f5f9;color:#0f172a}',
      '.ann-hbtn.danger:hover{background:#ffe4e6;border-color:#fda4af;color:#be123c}',
      '.ann-filters{padding:8px 16px;border-bottom:1px solid #e2e8f0;display:flex;gap:5px;background:#fff;overflow-x:auto;flex-shrink:0}',
      '.ann-fb{padding:3px 10px;font-size:11px;font-weight:700;border-radius:99px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .14s;flex-shrink:0}',
      '.ann-fb.active{background:#0f172a;border-color:transparent;color:#fff}',
      '#ann-list{overflow-y:auto;flex:1}',
      '.ann-item{padding:12px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s}',
      '.ann-item:hover{background:#f8fafc}',
      '.ann-item.unread{background:rgba(37,99,235,.03);border-left:3px solid #2563eb;padding-left:13px}',
      '.ann-item.unread.high{border-left-color:#be123c}',
      '.ann-item.unread.medium{border-left-color:#d97706}',
      '.ann-item.unread.low{border-left-color:#059669}',
      '.ann-irow{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px}',
      '.ann-ititle{font-weight:700;font-size:13px;color:#0f172a;flex:1;line-height:1.3}',
      '.ann-idot{width:7px;height:7px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:4px}',
      '.ann-ibody{font-size:12px;color:#475569;line-height:1.5;margin-bottom:6px}',
      '.ann-imeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.ann-itime{font-size:11px;color:#94a3b8;margin-left:auto}',
      '.ann-empty{padding:48px 20px;text-align:center;color:#94a3b8}',
      '.ann-empty-icon{font-size:34px;opacity:.35;margin-bottom:10px}',
      '.ann-foot{padding:8px 16px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#94a3b8;text-align:center;flex-shrink:0}',
    ].join('');
    document.head.appendChild(el);
  }

  /* ================================================================
     PANEL HTML
  ================================================================ */
  function _buildPanel() {
    var p = document.getElementById('ann-panel');
    if (!p || p.dataset.built) return;
    p.dataset.built = '1';
    p.innerHTML =
      '<div class="ann-ph">' +
        '<div class="ann-ph-l">🔔 Notifications<span class="ann-pill" id="ann-pill"></span></div>' +
        '<div class="ann-ph-btns">' +
          '<button class="ann-hbtn" onclick="ANN.readAll()">✓ All read</button>' +
          '<button class="ann-hbtn danger" onclick="ANN.clear()">Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="ann-filters">' +
        '<button class="ann-fb active" onclick="ANN.filter(\'all\',this)">All</button>' +
        '<button class="ann-fb" onclick="ANN.filter(\'unread\',this)">Unread</button>' +
        '<button class="ann-fb" onclick="ANN.filter(\'high\',this)">🔴 High</button>' +
        '<button class="ann-fb" onclick="ANN.filter(\'medium\',this)">🟡 Medium</button>' +
        '<button class="ann-fb" onclick="ANN.filter(\'low\',this)">🟢 Low</button>' +
      '</div>' +
      '<div id="ann-list"></div>' +
      '<div class="ann-foot" id="ann-foot"></div>';
  }

  /* ================================================================
     RENDER
  ================================================================ */
  function _render() {
    _buildPanel();
    var listEl = document.getElementById('ann-list');
    var foot   = document.getElementById('ann-foot');
    if (!listEl) return;

    var all    = _load();
    var total  = all.length;
    var unread = all.filter(function(a) { return !a.read; }).length;

    var list = all;
    if (_filter === 'unread')        list = all.filter(function(a) { return !a.read; });
    else if (_filter !== 'all')      list = all.filter(function(a) { return a.priority === _filter; });

    /* pill */
    var pill = document.getElementById('ann-pill');
    if (pill) { pill.textContent = unread; pill.style.display = unread ? 'inline-block' : 'none'; }

    /* bell dot */
    var dot = document.getElementById('ann-bell-dot');
    if (dot) dot.style.display = unread ? 'block' : 'none';

    /* legacy ids */
    var od = document.getElementById('notifDot');
    if (od) od.style.display = unread ? 'block' : 'none';
    var sb = document.getElementById('annBadge');
    if (sb) { sb.textContent = unread || ''; sb.classList.toggle('hidden', !unread); }

    if (!list.length) {
      listEl.innerHTML =
        '<div class="ann-empty">' +
          '<div class="ann-empty-icon">🔔</div>' +
          '<div style="font-weight:700;color:#1e293b;margin-bottom:4px;font-family:Outfit,sans-serif">' +
            (_filter === 'all' ? 'All caught up!' : 'Nothing here') +
          '</div>' +
          '<div style="font-size:12px">' +
            (_filter !== 'all' ? 'No items in this category.' : 'Announcements will appear here.') +
          '</div>' +
        '</div>';
    } else {
      listEl.innerHTML = list.map(function(a) {
        return '<div class="ann-item ' + (a.read ? '' : 'unread ') + _esc(a.priority) + '"' +
               ' onclick="ANN.markAsRead(\'' + _esc(a.id) + '\',this)">' +
          '<div class="ann-irow">' +
            '<div class="ann-ititle">' + _esc(a.title) + '</div>' +
            (!a.read ? '<div class="ann-idot"></div>' : '') +
          '</div>' +
          '<div class="ann-ibody">' + _esc(a.message.slice(0, 110)) + (a.message.length > 110 ? '…' : '') + '</div>' +
          '<div class="ann-imeta">' +
            '<span class="ann-tag ann-tag-aud">'             + _audLabel(a.audience)  + '</span>' +
            '<span class="ann-tag ann-tag-' + _esc(a.priority) + '">' + _esc(a.priority) + '</span>' +
            '<span class="ann-itime">'                       + _ago(a.timestamp)      + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    if (foot) foot.textContent = total + ' notification' + (total !== 1 ? 's' : '') + ' · saved locally';
  }

  /* ================================================================
     PUBLIC API
  ================================================================ */
  window.ANN = {

    saveAnnouncement: function(title, message, audience, priority) {
      var ann = {
        id:        _genId(),
        title:     title    || 'Announcement',
        message:   message  || '',
        audience:  (audience || 'all').toLowerCase().trim(),
        priority:  (priority || 'medium').toLowerCase().trim(),
        timestamp: Date.now(),
      };
      _append(ann);
      _render();
      return ann;
    },

    loadAnnouncements: function() { return _load(); },

    showToast: function(type, title, message, priority, dur) {
      dur = dur || 5000;
      var box = document.getElementById('ann-toasts');
      if (!box) return;
      var icons = { success: '✅', error: '❌', warning: '⚡', info: '📢' };
      var t = document.createElement('div');
      t.className = 'ann-toast ' + (type || 'info');
      t.innerHTML =
        '<div class="ann-stripe"></div>' +
        '<div class="ann-ti">' +
          '<div class="ann-tr1">' +
            '<span class="ann-ticon">' + (icons[type] || '🔔') + '</span>' +
            '<span class="ann-ttitle">' + _esc(title) + '</span>' +
            '<button class="ann-tx" onclick="ANN._closeToast(this.closest(\'.ann-toast\'))">✕</button>' +
          '</div>' +
          '<div class="ann-tmsg">' + _esc(message) + '</div>' +
          '<div class="ann-ttags">' +
            (priority ? '<span class="ann-tag ann-tag-' + _esc(priority) + '">' + _esc(priority) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="ann-prog"><div class="ann-pfill" style="width:100%"></div></div>';
      t.onclick = function(e) { if (!e.target.classList.contains('ann-tx')) ANN._closeToast(t); };
      box.appendChild(t);
      requestAnimationFrame(function() {
        var f = t.querySelector('.ann-pfill');
        f.style.transition = 'width ' + dur + 'ms linear';
        f.style.width = '0%';
      });
      t._tid = setTimeout(function() { ANN._closeToast(t); }, dur);
    },

    _closeToast: function(t) {
      if (!t || t._closing) return;
      t._closing = true;
      clearTimeout(t._tid);
      t.classList.add('out');
      setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    },

    addNotification: function(title, message, audience, priority) {
      this.saveAnnouncement(title, message, audience, priority);
      this.showToast('info', title, message, priority);
    },

    markAsRead: function(id, el) {
      var rs = _getRead();
      if (!rs.has(id)) {
        rs.add(id);
        _saveRead(rs);
        if (el) el.classList.remove('unread');
        _render();
      }
    },

    readAll: function() {
      var list = _load();
      var rs   = _getRead();
      list.forEach(function(a) { rs.add(a.id); });
      _saveRead(rs);
      _render();
    },

    /* Clears all announcement buckets for everyone */
    clear: function() {
      if (!confirm('Clear all announcement history?')) return;
      Object.values(BUCKETS).forEach(function(k) {
        try { localStorage.removeItem(k); } catch {}
      });
      try { localStorage.removeItem(_readKey()); } catch {}
      _render();
    },

    toggle: function() {
      var p = document.getElementById('ann-panel');
      if (!p) return;
      _open = !_open;
      p.classList.toggle('open', _open);
      if (_open) _render();
    },

    close: function() {
      var p = document.getElementById('ann-panel');
      if (p) { p.classList.remove('open'); _open = false; }
    },

    filter: function(f, btn) {
      _filter = f;
      document.querySelectorAll('.ann-fb').forEach(function(b) { b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      _render();
    },

    updateBadge: function() { _render(); },
  };

  /* ── Close panel on outside click ── */
  document.addEventListener('click', function(e) {
    var btn   = document.getElementById('ann-bell-btn');
    var panel = document.getElementById('ann-panel');
    if (panel && _open && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
      ANN.close();
    }
  });

  /* ── Init ── */
  function _init() {
    _migrate();
    _css();
    _buildPanel();
    _render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

})();