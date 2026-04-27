# RTO Tracker &nbsp;![version](https://img.shields.io/badge/version-1.0.0-blue)

Personal return-to-office compliance tracker. Logs daily attendance against company RTO policy (Tue/Wed/Thu requirement) and gives a monthly compliance percentage at a glance.

Built with Angular 17, Node.js + Express, and JSON file storage.

---

## Features

- Monthly calendar — weekdays only, weekends hidden
- Click any day to log it as **In Office** or **Approved Leave**
- Quick-action buttons for today's attendance without opening the modal
- Approved leaves on Tue–Thu are credited and do not hurt compliance
- Philippine public holidays automatically excluded from expected days
- Stats cards: expected days, actual days, compliance %, approved absences
- Month navigation to review historical months
- Data persists in a local JSON file — no database server required

---

## RTO Business Rules

| Rule | Detail |
|---|---|
| RTO days | Tuesday, Wednesday, Thursday only |
| Monday / Friday | Tracked but excluded from compliance calculation |
| Public holidays | Removed from expected days regardless of day |
| Approved absence (Tue–Thu) | Credited — reduces expected days |
| Approved absence (Mon/Fri) | Recorded but no compliance impact |
| Compliance % | `actualDays / expectedDays × 100` |

---

## Project Structure

```
rto-tracker/
├── backend/
│   ├── data/
│   │   └── db.json          # Persistent data store
│   └── src/
│       ├── index.js          # Express entry point (port 3000)
│       ├── db.js             # JSON read/write helpers
│       ├── rtoUtils.js       # Compliance calculation logic
│       └── routes/
│           ├── attendance.js
│           └── holidays.js
│
└── frontend/
    └── src/app/
        ├── models/rto.models.ts
        ├── services/rto.service.ts
        └── components/calendar/
            ├── calendar.component.ts
            ├── calendar.component.html
            └── calendar.component.css
```

---

## Local Setup

### Backend

```bash
cd backend
npm install
node src/index.js     # http://localhost:3000
```

`db.json` is gitignored — each person keeps their own attendance locally. On first run, the backend auto-creates `backend/data/db.json` with Philippine public holidays and an empty attendance list. A reference copy is at `backend/data/db.example.json`.

### Frontend

```bash
cd frontend
npm install
npx ng serve          # http://localhost:4200
```

The Angular dev server proxies `/api` requests to `http://localhost:3000` via `proxy.conf.json`.

---

## API Reference

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| GET | `/api/attendance` | `?year=&month=` | Monthly attendance, holidays, and stats |
| POST | `/api/attendance/checkin` | `{ date?, status }` | Upsert a record (`IN_OFFICE` or `APPROVED_ABSENCE`) |
| DELETE | `/api/attendance/:date` | — | Remove a record by date (`YYYY-MM-DD`) |
| GET | `/api/holidays` | `?year=` | List holidays for a year |
| POST | `/api/holidays` | `{ date, name }` | Add a holiday |
| DELETE | `/api/holidays/:date` | — | Remove a holiday |

---

## Notes

- Holidays for the Philippines are pre-seeded in `backend/data/db.json`.
- `db.json` is committed to source control so historical data travels with the repo. Remove or gitignore it if you want a clean slate on each clone.

---

## Email & Password Reset

- The backend supports password reset via email using Nodemailer.
- You must provide valid SMTP credentials in your `.env` file (not included in this repo).
- For production, ensure your environment variables are set and the Node.js server is restarted after changes.
- For security, do not commit or share your SMTP credentials.

---

## Production Deployment

- The project includes a GitHub Actions workflow for CI/CD.
- The backend and frontend are deployed via FTP to your server.
- Sensitive files like `.env` and `db.json` are excluded from deployment for security.
- After deployment, use your hosting control panel or the workflow's restart step to restart the Node.js app.

---

## Troubleshooting

- **500 errors on /api/auth/login or /api/auth/forgot-password:**
  - Check backend logs for details (e.g., SMTP issues, missing environment variables).
  - Ensure `.env` is present and correct on the server.
- **express-rate-limit X-Forwarded-For error:**
  - The backend sets `app.set('trust proxy', 1);` for compatibility with proxies/cPanel.
- **Email not sending:**
  - Double-check SMTP settings and password.
  - Check spam folder.
  - Review backend logs for Nodemailer errors.
