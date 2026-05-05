const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  let ann = [...global.db.announcements].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (req.user.role !== 'admin') ann = ann.filter(a=>a.targetRole==='all'||a.targetRole===req.user.role);
  res.json({ success:true, announcements:ann });
});

router.post('/', auth, authorize('admin','teacher'), (req, res) => {
  const { title, body, priority, targetRole } = req.body;
  const ann = { _id:`ANN-${uuidv4().slice(0,8)}`, title, body, priority:priority||'medium', targetRole:targetRole||'all', author:req.user.name, createdAt:new Date(), views:0 };
  global.db.announcements.unshift(ann);
  res.status(201).json({ success:true, announcement:ann });
});

router.delete('/:id', auth, authorize('admin'), (req, res) => {
  global.db.announcements = global.db.announcements.filter(a=>a._id!==req.params.id);
  res.json({ success:true });
});

module.exports = router;
