// notifications.js
const express = require('express');
const r1 = express.Router();
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

r1.get('/', auth, (req, res) => {
  const notifs = global.db.notifications.filter(n=>n.userId===req.user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30);
  res.json({ success:true, notifications:notifs });
});
r1.put('/read-all', auth, (req, res) => {
  global.db.notifications = global.db.notifications.map(n=>n.userId===req.user.id?{...n,read:true}:n);
  res.json({ success:true });
});
r1.put('/:id/read', auth, (req, res) => {
  const idx = global.db.notifications.findIndex(n=>n._id===req.params.id);
  if (idx!==-1) global.db.notifications[idx].read=true;
  res.json({ success:true });
});

module.exports = r1;
