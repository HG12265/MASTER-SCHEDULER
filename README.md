# MASTER SCHEDULER
> **Tagline:** *Smart Scheduling. Zero Conflicts.*

Master Scheduler is an automated, high-performance academic timetable management system tailored for university departments. The system eliminates scheduling conflicts, balances faculty workloads, and generates mathematically optimal timetables using constraint programming.

---

## 🏛️ Core Design Philosophy

- **Zero Hardcoding:** All academic entities (Academic Years, ODD/EVEN Semesters, Working Days, Time Slots, Break/Lunch Periods, Programmes, Batches, Subjects, Faculty, Availability, Rooms, and Labs) are dynamically configured and database-driven.
- **Separation of Concerns:** Clean layered architecture with independent backend repositories, services, routers, and schemas; and modular frontend features, components, services, and hooks.
- **Mathematical Optimization:** Designed from the ground up to interface with Google OR-Tools CP-SAT for multi-period and multi-resource conflict resolution.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios (with request & response token interceptors)
- **Form Management:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Validation & Settings:** Pydantic v2 & `pydantic-settings`
- **Database Driver:** Motor (Async MongoDB client)
- **Security:** PyJWT & Passlib / Bcrypt
- **Server:** Uvicorn (ASGI)

### Database
- **Database:** MongoDB

### Scheduling Engine *(Phase 4)*
- **Solver:** Google OR-Tools CP-SAT

---

## 📂 Project Structure

```
master-scheduler/
├── .gitignore
├── README.md
│
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── requirements.txt
│   ├── venv/
│   └── app/
│       ├── __init__.py
│       ├── main.py                    # FastAPI entrypoint, CORS, lifespan, exception handlers
│       ├── config/
│       │   ├── __init__.py
│       │   └── settings.py            # Pydantic BaseSettings environment config
│       ├── database/
│       │   ├── __init__.py
│       │   └── mongodb.py             # Motor async MongoDB client & lifecycle
│       ├── middleware/
│       │   ├── __init__.py
│       │   └── error_handler.py       # Centralized HTTP & validation exception handlers
│       ├── models/                    # MongoDB data models (Phase 2)
│       ├── schemas/                   # Pydantic DTOs & request/response schemas (Phase 2)
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── api.py                 # Router aggregator (/api)
│       │   └── health.py              # GET /api/health endpoint
│       ├── services/                  # Business logic services (Phase 2 & 3)
│       ├── repositories/              # MongoDB query repositories (Phase 2)
│       ├── scheduler/                 # Google OR-Tools CP-SAT engine (Phase 4)
│       └── utils/
│           ├── __init__.py
│           └── logger.py              # Centralized logging configuration
│
└── frontend/
    ├── .env.example
    ├── .env.local
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx                 # Root layout with university design system
    │   ├── page.tsx                   # Root redirect to /dashboard
    │   ├── globals.css                # Tailwind CSS imports & base styles
    │   ├── login/
    │   │   └── page.tsx               # University Admin authentication portal
    │   ├── dashboard/
    │   │   └── page.tsx               # Department Admin Dashboard with metrics & tables
    │   ├── academic-setup/page.tsx    # Academic Years, Terms, and Slots
    │   ├── programmes/page.tsx        # Degree Programmes management
    │   ├── classes/page.tsx           # Class batches & cohort sections
    │   ├── subjects/page.tsx          # Theory & Laboratory courses
    │   ├── faculty/page.tsx           # Faculty profiles & availability matrix
    │   ├── faculty-allocation/page.tsx# Subject-to-Teacher allocation
    │   ├── rooms-labs/page.tsx        # Physical rooms and laboratory infrastructure
    │   ├── scheduler/page.tsx         # OR-Tools constraint engine status
    │   ├── timetable/page.tsx         # Class-wise, Faculty-wise & Master grid views
    │   ├── reports/page.tsx           # Workload audits & PDF/Excel exports
    │   └── settings/page.tsx          # Department settings & system preferences
    ├── components/
    │   ├── index.ts                   # Barrel export
    │   ├── AdminLayout.tsx            # Left Sidebar + Top Navbar + Main Content Area
    │   ├── Sidebar.tsx                # Responsive university navigation with badges
    │   ├── Navbar.tsx                 # Academic year selector, live API status & user menu
    │   ├── PageHeader.tsx             # Breadcrumbs, title, and action slots
    │   ├── StatCard.tsx               # Key metric card with trend indicators
    │   ├── DataTable.tsx              # Generic typed table with search & empty states
    │   ├── EmptyState.tsx             # Empty state visual fallback
    │   ├── LoadingState.tsx           # Spinner & skeleton loader
    │   └── ConfirmDialog.tsx          # Destructive & confirm action modal
    ├── features/                      # Domain feature modules
    ├── services/
    │   └── health.service.ts          # Backend API health client
    ├── hooks/
    │   └── useApiHealth.ts            # Reactive API health hook
    ├── types/
    │   └── index.ts                   # Shared TypeScript definitions
    ├── utils/
    │   └── formatters.ts              # Time slot and duration formatting
    └── lib/
        ├── api-client.ts              # Configured Axios instance with interceptors
        └── utils.ts                   # Tailwind clsx/twMerge utility
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=master_scheduler
JWT_SECRET=development_master_scheduler_secret_key_change_in_production_2026
JWT_ALGORITHM=HS256
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

### Frontend (`frontend/.env.local`)
Copy `frontend/.env.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🚀 Running the Project

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v24+ supported)
- **Python:** 3.10 or higher (Python 3.14 supported)
- **MongoDB:** Local instance or MongoDB Atlas cluster URI

---

### 2. Backend Setup & Run

Open a terminal in the root directory:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI ASGI server with hot-reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Health Endpoint:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- **Alternative ReDoc:** [http://127.0.0.1:8000/api/redoc](http://127.0.0.1:8000/api/redoc)

---

### 3. Frontend Setup & Run

Open a second terminal in the root directory:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start the Next.js development server
npm run dev
```

- **Application Portal:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Login Portal:** [http://localhost:3000/login](http://localhost:3000/login)

---

## 🔍 Verification & Health Check

### Health Check Endpoint Test:
```bash
curl http://127.0.0.1:8000/api/health
```
**Expected Response:**
```json
{
  "status": "success",
  "message": "Master Scheduler API is running"
}
```

The frontend navbar dynamically pings `/api/health` and displays an active green indicator (`API Online`) when the backend is connected.

---

## 📋 What Was Completed (Phase 1)

1. ✅ **Folder Architecture:** Scalable `frontend/` and `backend/` decoupled structure.
2. ✅ **Next.js 16 Setup:** Full TypeScript, Tailwind CSS, App Router, Axios, React Hook Form, and Zod integration.
3. ✅ **FastAPI Backend:** Async lifecycle management, CORS middleware, centralized logging, and custom exception handling.
4. ✅ **MongoDB Integration:** Motor async connection manager with graceful connectivity fallback.
5. ✅ **Health Endpoint:** Standardized `GET /api/health` responding with exact expected payload.
6. ✅ **Admin Dashboard Base Layout:** Left Sidebar, Top Navbar with live API status badge, and Main Content Area.
7. ✅ **Sidebar Navigation:** All 12 university modules linked with route highlighting and category groupings.
8. ✅ **Reusable UI Component System:**
   - `Sidebar`
   - `Navbar`
   - `PageHeader`
   - `StatCard`
   - `DataTable`
   - `EmptyState`
   - `LoadingState`
   - `ConfirmDialog`
   - `AdminLayout`
9. ✅ **Pages Implemented:**
   - `/login` (University Admin auth form with Zod validation)
   - `/dashboard` (Key metrics, solver readiness card, dynamic programme summary table)
   - Route placeholders for `/academic-setup`, `/programmes`, `/classes`, `/subjects`, `/faculty`, `/faculty-allocation`, `/rooms-labs`, `/scheduler`, `/timetable`, `/reports`, and `/settings`.
10. ✅ **Environment Configuration & Setup Docs:** `.env.example` files created and tested.

---

## 🎯 Next Phase (Phase 2 Preview)

The next step will focus on **Dynamic Academic Setup & Resource Modeling**:
- MongoDB database models & Pydantic schemas for Academic Years, Semester Types, Working Days, Time Slots, Break Slots.
- Dynamic Programme, Semester, and Class Section registries (Zero hardcoding).
- Room & Laboratory capacity specifications.
- RESTful CRUD repositories and services for academic configuration.
