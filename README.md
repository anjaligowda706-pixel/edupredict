# 🌌 EduPredict AI v2 — Aurora Edition

> A completely redesigned full-stack student performance prediction system with Aurora Borealis aesthetics, animated particle backgrounds, glassmorphism UI, and real-world features.

---

## 🚀 Start in 2 Steps

```bash
cd backend
npm install
node server.js
```

Open → **http://localhost:5000**

No MongoDB needed — runs instantly with rich seeded demo data (35 students, 7 tests, 100s of submissions).

---

## 🔑 Demo Logins

| Role    | Email                  | Password     |
|---------|------------------------|--------------|
| Admin   | admin@school.edu       | admin123     |
| Teacher | sarah@school.edu       | teacher123   |
| Teacher | michael@school.edu     | teacher123   |
| Student | alice@school.edu       | student123   |
| Student | bob@school.edu         | student123   |
| Student | carol@school.edu       | student123   |

*(All 35 students use password: `student123`)*

---

## 🎨 Design System

**Theme:** Aurora Borealis — Deep Forest + Electric Teal + Ember Gold + Magenta  
**Fonts:** Outfit (display) + Literata (body)  
**Effects:**
- Animated particle constellation canvas (every page)
- Aurora streak animations
- Glassmorphism cards with blur
- Spinning conic gradient avatar borders
- Shimmer progress bars
- Spring-physics modal entrances
- Staggered section fade-ins
- Morphing gradient prediction orb

---

## ✨ New Features in v2

### 🎓 Student
- **Dashboard** — Stats, timeline chart, subject radar, alerts
- **Live Exams** — Circular timer ring with SVG arc, question navigator, auto-submit
- **Homework Upload** — Drag & drop, file preview
- **Performance** — Bar + line charts, full history table
- **AI Prediction** — Animated prediction orb, factor bars, recommendations
- **Leaderboard** — Class rankings with medals 🥇🥈🥉
- **Schedule** — Weekly timetable by class
- **Announcements** — Color-coded school notices

### 👩‍🏫 Teacher
- **Dashboard** — Class performance, risk distribution chart
- **Create Test** — Dynamic question builder with add/remove
- **Manage Tests** — Activate/deactivate/delete
- **Homework Review** — Grade with feedback, filter by status
- **Student Monitor** — Performance table with risk badges
- **AI Predictions** — Full table sorted by risk
- **Announcements** — Post school-wide notices

### 👨‍💼 Admin
- **Dashboard** — 5 stat cards, weekly activity chart
- **Analytics** — Attendance distribution, HW by subject, score distribution
- **Students** — CRUD with attendance editing, pagination
- **Teachers** — Manage teacher accounts
- **Tests** — System-wide test management
- **Announcements** — Create/delete with target audience
- **AI Insights** — Full student risk table with weak subject tags
- **Bulk Import** — CSV paste-and-import for 900+ students
- **Settings** — System configuration panel

---

## 🤖 AI Prediction Algorithm

```
Predicted Score = 
  Test Performance × 50%  +
  Attendance × 25%         +
  HW Completion Rate × 15% +
  HW Grade Average × 10%

Risk Level:
  Low    → Predicted ≥ 75% AND Attendance ≥ 80%
  Medium → Predicted ≥ 50%
  High   → Below thresholds
```

---

## 📁 Project Structure

```
edupredict-v2/
├── backend/
│   ├── server.js
│   ├── .env
│   ├── routes/
│   │   ├── auth.js           # JWT login/register
│   │   ├── users.js          # CRUD + bulk import
│   │   ├── tests.js          # Test management
│   │   ├── submissions.js    # Exam taking + scoring
│   │   ├── homework.js       # File upload + grading
│   │   ├── analytics.js      # Charts data
│   │   ├── prediction.js     # AI engine
│   │   ├── notifications.js  # Alerts
│   │   ├── announcements.js  # School notices
│   │   ├── leaderboard.js    # Rankings
│   │   └── schedule.js       # Timetable
│   ├── middleware/
│   │   └── auth.js           # JWT + RBAC
│   └── utils/
│       └── seed.js           # Rich demo data (35 students)
├── frontend/
│   ├── index.html            # Login page with aurora canvas
│   ├── css/
│   │   └── aurora.css        # 900+ line design system
│   ├── js/
│   │   ├── app.js            # Shared utilities
│   │   ├── student.js        # Student dashboard
│   │   ├── teacher.js        # Teacher dashboard
│   │   └── admin.js          # Admin dashboard
│   └── pages/
│       ├── student.html
│       ├── teacher.html
│       └── admin.html
└── README.md
```

---

## 🗄️ Database

Works with or without MongoDB:
- **Without MongoDB** → Instant startup with in-memory store + rich seed data
- **With MongoDB** → `mongod` → auto-connects to `mongodb://localhost:27017/edupredict_v2`

---

## ☁️ Deploy to Render (Free)

1. Push to GitHub
2. New Web Service → Root: `backend/` 
3. Build: `npm install`
4. Start: `node server.js`
5. Add env: `JWT_SECRET=your_key`

---

## 📱 Responsive

- Desktop: Full sidebar + multi-column grids
- Tablet: Collapsed grids, scrollable tables  
- Mobile: Hidden sidebar (hamburger), single column, touch-optimized
