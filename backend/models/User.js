const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student','teacher','admin'], default: 'student' },
  studentId: String, teacherId: String,
  class: String, section: String,
  isActive: { type: Boolean, default: true },
  attendance: { type: Number, default: 85 },
  subjects: [String],
  phone: String, bio: String,
  parentName: String, parentPhone: String,
  approvalStatus: { type: String, default: 'approved' },
  lastLogin: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
