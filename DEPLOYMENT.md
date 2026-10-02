# Master Scheduler — Production Deployment Guide

> **Tagline**: Smart Scheduling. Zero Conflicts.  
> **Version**: 1.0.0 (Phase 8 Production Ready)

---

## 1. Architecture Overview

Master Scheduler is a dual-tier academic management and scheduling platform:
- **Frontend**: Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons)
- **Backend**: FastAPI (Python 3.10+, Motor/AsyncIOMotor, PyMongo, Pydantic v2, Direct Bcrypt)
- **Database**: MongoDB 6.0+
- **Design Philosophy**: Non-destructive operational overrides. Published baseline timetables (`timetable_entries`) remain immutable during day-to-day operations. Daily cancellations and substitutions are stored in an indexed `substitutions` collection and resolved on the fly.

---

## 2. Production Prerequisites

| Component | Minimum Version | Recommended |
|-----------|----------------|-------------|
| Python    | 3.10+          | 3.11 / 3.12 / 3.14 |
| Node.js   | 18.17+         | 20.x LTS    |
| npm       | 9.x+           | 10.x+       |
| MongoDB   | 6.0+           | 7.0+ (Replica Set recommended for transactions) |

---

## 3. MongoDB Indexes

Execute the following indexes in your MongoDB production instance to guarantee sub-millisecond lookups during high-concurrency schedule rendering:

```javascript
// Switch to production database
use master_scheduler;

// 1. Audit Logs (fast time-range and entity lookups)
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ entityType: 1, entityId: 1 });
db.audit_logs.createIndex({ actorId: 1, timestamp: -1 });

// 2. Academic Calendar Exceptions (date lookup)
db.academic_calendar_exceptions.createIndex({ date: 1, academicYearId: 1 }, { unique: true });

// 3. Substitutions & Daily Overrides
db.substitutions.createIndex({ date: 1, periodId: 1, originalFacultyId: 1 });
db.substitutions.createIndex({ date: 1, status: 1 });
db.substitutions.createIndex({ substituteFacultyId: 1, date: 1 });

// 4. Faculty Leaves
db.faculty_leaves.createIndex({ facultyId: 1, startDate: 1, endDate: 1 });
db.faculty_leaves.createIndex({ status: 1 });

// 5. In-App Notifications
db.notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 });

// 6. Timetable Baseline
db.timetables.createIndex({ academicYearId: 1, semesterTypeId: 1, status: 1 });
db.timetable_entries.createIndex({ timetableId: 1, dayOfWeek: 1, periodId: 1 });
db.timetable_entries.createIndex({ facultyId: 1, dayOfWeek: 1, periodId: 1 });
db.timetable_entries.createIndex({ classId: 1, dayOfWeek: 1, periodId: 1 });
```

---

## 4. Environment Configuration

### Backend (`backend/.env`)
```bash
# Database
MONGODB_URL=mongodb://mongo-cluster.internal:27017
DATABASE_NAME=master_scheduler

# Environment
APP_ENV=production
APP_TIMEZONE=UTC
LOG_LEVEL=INFO

# Security (CRITICAL: Generate a 64+ char random hex secret)
JWT_SECRET=c38e4a91f5e2786a37b12d59fa9e10283b74895690b23f81e3a15dc2468f7b3a
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=https://scheduler.youruniversity.edu

# Backups & Uploads
MAX_UPLOAD_SIZE_MB=25

# SMTP Email Notifications (Optional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=postmaster@scheduler.youruniversity.edu
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="Master Scheduler <notifications@scheduler.youruniversity.edu>"
```

### Frontend (`frontend/.env.local` or environment variable)
```bash
NEXT_PUBLIC_API_URL=https://api-scheduler.youruniversity.edu/api
```

---

## 5. Deployment Procedures

### Step 5.1: Backend Production Server

Use `uvicorn` with `gunicorn` process manager:

```bash
cd backend

# Install dependencies
pip install --no-cache-dir -r requirements.txt

# Run with Gunicorn (4 workers recommended for 2-4 vCPUs)
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --timeout 120
```

### Step 5.2: Frontend Production Build & Server

```bash
cd frontend

# Install clean production dependencies
npm ci

# Build optimized production bundle
npm run build

# Start Next.js production server
npm run start -- -p 3000
```

*For process management, PM2 or systemd is recommended:*
```bash
pm2 start npm --name "master-scheduler-frontend" -- start -- -p 3000
```

---

## 6. Docker & Container Deployment

### `docker-compose.prod.yml`
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - MONGODB_URL=mongodb://mongodb:27017
      - DATABASE_NAME=master_scheduler
      - APP_ENV=production
      - JWT_SECRET=c38e4a91f5e2786a37b12d59fa9e10283b74895690b23f81e3a15dc2468f7b3a
      - CORS_ORIGINS=http://localhost:3000
    depends_on:
      - mongodb
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  mongo_data:
```

---

## 7. Health & Readiness Probes

Configured for Kubernetes, Docker Swarm, and AWS ALB health checks:

- **Liveness Probe**: `GET /api/health/live`
  - Validates process uptime and web server responsiveness.
  - Expected response: `{"status": "alive"}` (HTTP 200).
- **Readiness Probe**: `GET /api/health/ready`
  - Performs active MongoDB ping.
  - Expected response: `{"status": "ready", "database": "connected"}` (HTTP 200).
- **Comprehensive Health**: `GET /api/health`
  - Returns database connection state, collection count, and environment metadata.

---

## 8. Backup, Safe Restore & Disaster Recovery

### Creating a Snapshot Backup
1. Navigate to **Settings > Backup & Restore** (`/settings/backup`).
2. Click **Export Backup Snapshot**.
3. A verified zip archive containing collection-by-collection JSON snapshots and a SHA-256 integrity manifest is downloaded.
4. An immutable audit record is logged.

### Restoring from Backup (Safe Mode)
1. In **Settings > Backup & Restore**, choose a valid `.zip` snapshot file.
2. The system runs automatic pre-flight verification:
   - Schema version validation (`SCHEMA_VERSION = 1`).
   - Manifest checksum verification.
   - Missing collection detection.
3. Review the preview diff dialog showing exact record counts to be replaced.
4. Confirm restore. The system updates collections within safe boundaries and logs the operator ID, timestamp, and metadata.

### Referential Integrity Diagnostics
Run anytime via **Settings > System Configuration** (`/settings/system`):
- Traces foreign key orphans across classes, faculty, allocations, and constraints.
- Identifies any scheduling inconsistencies and provides actionable issue reports.

---

## 9. Operational Workflows & Daily Usage

1. **Academic Calendar Exceptions**:
   - Add institutional holidays, exam weeks, and special working days (e.g. Wednesday schedule on a Saturday) at `/academic-calendar`.
2. **Faculty Leave Management**:
   - Faculty submits leave at `/faculty-portal/leave`.
   - Admin inspects timetable impact preview (all affected classes & periods) and approves/rejects at `/operations/leave`.
3. **Daily Operations & Substitutions**:
   - Morning dashboard at `/operations/daily` highlights unresolved absent faculty slots.
   - Click **Find Substitute** to open the recommendation engine (`/operations/substitutions`).
   - Scored candidates (department match, subject expertise, free period, and workload balance) are presented with factual badges.
   - Assigning a substitute updates the daily operational schedule without modifying the baseline master timetable.
4. **Notifications & Auditing**:
   - Real-time in-app alerts are delivered to substituted and absent faculty.
   - All critical actions are recorded in the tamper-resistant `/audit-logs` trail.
