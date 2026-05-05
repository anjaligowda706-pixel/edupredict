const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'edupredict_fallback_secret';

const auth = (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
  next();
};

module.exports = { auth, authorize };
