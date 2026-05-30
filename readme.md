<div align="center">

<!-- Logo recreated in SVG matching the site's visual identity -->
<svg width="280" height="54" viewBox="0 0 280 54" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="44" height="44" x="0" y="5" rx="22" fill="#04393b" stroke="rgba(208,170,98,0.35)" stroke-width="1"/>
  <polyline points="9,35 16,23 22,28 28,18 35,35" stroke="#d0aa62" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="54" y="38" font-family="serif" font-size="22" font-weight="600" letter-spacing="1" fill="#04393b">SUMMIT</text>
  <text x="162" y="38" font-family="serif" font-size="22" font-style="italic" font-weight="400" fill="#d0aa62">Log</text>
  <text x="206" y="28" font-family="sans-serif" font-size="9" font-weight="700" letter-spacing="3" fill="#9a7a3a">UK</text>
</svg>

# SummitLog UK

**Track every peak. Log every ascent. Own your mountain story.**

A full-stack mountain tracking application for UK hillwalkers — log Wainwrights, Munros, Nuttalls and more with routes, photos, stats and weather forecasts.

[![React](https://img.shields.io/badge/Frontend-React_+_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)]()
[![Django](https://img.shields.io/badge/Backend-Django_4.2-092E20?style=for-the-badge&logo=django&logoColor=white)]()
[![DRF](https://img.shields.io/badge/API-Django_REST_Framework-ff1709?style=for-the-badge&logo=django&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/Database-SQLite_/_PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)]()
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)]()
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()

[![Backend Tests](https://img.shields.io/badge/Backend_Tests-80_passing-brightgreen?style=for-the-badge)]()
[![Frontend Tests](https://img.shields.io/badge/Frontend_Tests-85_passing-brightgreen?style=for-the-badge)]()
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)]()

</div>

---

## 📚 Table of Contents

- [📸 Screenshots](#-screenshots)
- [📖 Project Overview](#-project-overview)
- [🎯 What SummitLog Offers](#-what-summitlog-offers)
- [🎨 Design & UI Philosophy](#-design--ui-philosophy)
- [🚀 Key Features](#-key-features)
- [🏗️ Tech Stack](#️-tech-stack)
- [🧠 Architecture Overview](#-architecture-overview)
- [🔌 API Reference](#-api-reference)
- [📂 Project Structure](#-project-structure)
- [⚙️ Local Setup & Installation](#️-local-setup--installation)
- [🌩️ Cloudflare R2 Image Storage](#️-cloudflare-r2-image-storage)
- [👨‍💼 Django Admin](#-django-admin)
- [🧪 Testing](#-testing)
- [🐛 Bugs Encountered & Solutions](#-bugs-encountered--solutions)
- [✅ Manual Testing](#-manual-testing)
- [🗂️ Project Management](#️-project-management)
- [🚀 Deployment](#-deployment)
- [📌 Future Enhancements](#-future-enhancements)
- [📬 Contact](#-contact)

---

## 📸 Screenshots

### 🏠 Homepage

![Homepage Screenshot](frontend/public/images/screenshots/homepage.png)
> *Hero section with mountain imagery, elevation ruler and progress snapshot*

---

### 🏔️ Mountains Page

![Mountains Screenshot](frontend/public/images/screenshots/mountains.png)
> *Filterable mountain database with contour tide cards, region gradients and height markers*

---

### 📊 Dashboard

![Dashboard Screenshot](frontend/public/images/screenshots/dashboard.png)
> *Personal stats, charts, achievements, personal bests and collection progress*

---

### 🗺️ Map Page

![Map Screenshot](frontend/public/images/screenshots/map.png)
> *Interactive Leaflet map with colour-coded status markers and my ascents toggle*

---

### 🏔️ Mountain Detail Page

![Mountain Detail Screenshot](frontend/public/images/screenshots/mountain_detail.png)
> *Stat cards, 4-day weather forecast, ascent history and tracking form*

---

### 📖 Journal

![Journal Screenshot](frontend/public/images/screenshots/journal.png)
> *Chronological mountain diary grouped by month with filters*

---

### 🖼️ Gallery

![Gallery Screenshot](frontend/public/images/screenshots/gallery.png)
> *Masonry photo gallery with lightbox viewer*

---

### 📱 Mobile

![Mobile Screenshot](frontend/public/images/screenshots/mobile.png)
> *Responsive layout across all screen sizes*

---

## 📖 Project Overview

**SummitLog UK** is a personal mountain tracking application built for UK hillwalkers who want to log, visualise and reflect on their time in the mountains.

The project was built as a full-stack portfolio application with a strong emphasis on production-quality design, real-world data and genuinely useful functionality. It grew from an idea to track Wainwright completions into a comprehensive platform covering multiple UK mountain collections — Wainwrights, Munros and Nuttalls — with over 800 summits sourced from the DOBIH (Database of British and Irish Hills) dataset.

The application is built on a decoupled architecture with a React + Vite frontend consuming a Django REST Framework API. Authentication uses Django's session-based system with CSRF protection, images are stored on Cloudflare R2, and the interactive map is powered by Leaflet.

A major focus throughout development was creating something that feels like a premium, polished product rather than a generic CRUD application — with a custom design system, animated SVG mountain cards, personal best tracking, collection completion percentages and a detailed achievement system.

---

## 🎯 What SummitLog Offers

### For Hillwalkers

- **Track every ascent** — log status (planned, completed), season, date, route taken, distance, duration, steps and notes for every mountain
- **Multiple ascents** — log the same mountain multiple times (summer and winter ascents, different routes)
- **Personal bests** — automatically computed from your logs: longest hike, highest peak, most steps, first summit, most recent
- **Collection progress** — see how far through the Wainwrights, Munros and Nuttalls you are with visual progress bars
- **Photo uploads** — attach summit photos to each ascent, stored on Cloudflare R2

### For Planning

- **4-day weather forecast** — powered by Open-Meteo, shown on every mountain detail page
- **Interactive map** — see all your completed, planned and not-started peaks on a single map with colour-coded markers
- **My ascents toggle** — filter the map to just your logged mountains
- **Mountain journal** — a chronological diary of every logged ascent with filters by status, season, collection and search

### For Reflection

- **Dashboard** — charts showing completion by status (pie), collection progress (bar) and completions over time (line)
- **Achievement system** — badges for milestones like First Summit, Distance Walker, High Climber
- **Gallery** — a masonry grid of all uploaded summit photos with lightbox viewer
- **Export** — download completed summits as CSV or GPX for use in other apps

### Preview Mode

Unauthenticated users can view the dashboard with example data to understand what the app offers before creating an account.

---

## 🎨 Design & UI Philosophy

SummitLog UK was designed with a premium, editorial aesthetic inspired by alpine guide brands and mountain photography.

### Design Tokens

The design system uses CSS custom properties for a consistent visual language:

- **Primary colour** — Deep teal `#04393b`
- **Accent colour** — Warm gold `#d0aa62`
- **Background** — Near-black `#07110d`
- **Typography** — DM Serif Display for headings, DM Sans for body text

### Visual Identity

- **Dark hero sections** with radial gradient overlays and subtle topography patterns
- **Glass card panels** with `backdrop-filter: blur` for overlaid UI
- **Contour tide line cards** — each mountain card renders a unique SVG elevation contour using the mountain's ID as a seed for deterministic but varied shapes
- **Region gradient headers** — Scotland, Wales, Lake District and England each have distinct colour gradients
- **Page hero headings** — two-tier style (light thin "Explore" above heavy gold "MOUNTAINS.")
- **Gold accent system** — consistent use of the accent colour for kickers, CTAs, active states and data highlights

### UX Decisions

- **Sticky navbar** with blur backdrop that darkens on scroll
- **Skeleton loaders** on all data-fetching pages — no blank screens during loading
- **Toast notifications** replace all inline success/error text
- **Confirm modals** replace `window.confirm` for destructive actions
- **Login prompt** on mountain detail pages for unauthenticated users instead of a broken form
- **Auth redirect** on Journal and Gallery pages — unauthenticated users are redirected to the account page
- **Status filter toolbar** on collection detail pages — filter by completed/planned/not started

---

## 🚀 Key Features

### Mountains

- Browse 800+ UK peaks from the DOBIH dataset
- Filter by collection (Wainwrights, Munros, Nuttalls), region, and sort by height or name
- Search by mountain name
- Each mountain card shows height, a unique SVG contour and region styling
- Skeleton loading grid while data fetches

### Mountain Detail

- Stat cards: height, feet, prominence, region
- 4-day weather forecast (Open-Meteo, no API key required)
- Track ascent with full form: status, season, date, route, distance, duration, steps, flights, notes, photo
- Multiple ascents per mountain with history switcher
- Login prompt for unauthenticated users

### Dashboard

- 6 stat cards with animated count-up: completed, planned, distance, height, steps, flights
- Personal bests section (only shown when real data exists)
- Charts: status pie chart, collection bar chart, completions over time line chart
- Elevation milestone tracker with custom SVG ridge
- Recent activity timeline (clickable — links to mountain detail)
- Achievement panel with progress bars
- Region completion cards (clickable — link to region pages)
- Collection progress cards (clickable — link to collection pages)
- Saved logs with clickable arrow cards
- CSV / GPX export
- Demo mode for unauthenticated users with seeded random data

### Map

- Leaflet map with all mountains with coordinates plotted
- Colour-coded markers: teal (completed), gold (planned), grey (not started)
- Filter by collection, region and status
- My ascents only toggle (shown only when user has logs)
- Map summary card showing visible pin counts

### Journal

- Chronological diary grouped by month
- Filters: status, season, collection, search
- Entry shows: mountain name, region, height, season badge, stats strip, route, notes, photo
- Skeleton loading and redirect for unauthenticated users

### Gallery

- Masonry layout (3 columns desktop, 2 tablet, 1 mobile)
- Varying aspect ratios (tall, square, wide) for visual variety
- Hover overlay with mountain name, region and date
- Keyboard-navigable lightbox (arrow keys, escape)
- Skeleton shimmer loaders
- Redirect for unauthenticated users

### Collections & Regions

- Collection detail pages with status filter toolbar
- Progress hero panel with completion percentage
- Mountain list with rank badges (gold for top 3)
- Status-coded left border on mountain rows
- Region detail pages with mini stat cards

### Account

- Register and login with error feedback
- Profile editing with bio and avatar upload
- Quick links to Dashboard, Journal, Gallery when logged in
- Completed and planned counts

---

## 🏗️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| React Router v6 | Client-side routing |
| Recharts | Dashboard charts |
| React Leaflet + Leaflet | Interactive map |
| React Icons (Tabler) | Icon system |
| CSS Custom Properties | Design token system |

### Backend

| Technology | Purpose |
|---|---|
| Django 4.2 | Web framework |
| Django REST Framework | API layer |
| django-environ | Environment variable management |
| django-cors-headers | CORS handling |
| django-filter | API filtering |
| django-storages + boto3 | Cloudflare R2 image storage |
| WhiteNoise | Static file serving |
| Pillow | Image processing |
| gpxpy | GPX export |
| gunicorn | Production WSGI server |

### Infrastructure

| Technology | Purpose |
|---|---|
| SQLite | Development database |
| PostgreSQL | Production database |
| Cloudflare R2 | Image storage (S3-compatible) |
| GitHub Actions | CI/CD pipeline |

---

## 🧠 Architecture Overview

SummitLog UK uses a decoupled architecture. The React frontend communicates entirely through the Django REST API. The Vite dev server proxy eliminates CORS issues in development by forwarding all `/api` requests to the Django backend.

```
┌─────────────────────────────────────────┐
│           React + Vite Frontend         │
│         localhost:3000 (dev)            │
│                                         │
│  /api/* ──► Vite Proxy ──► Django:8000  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Django REST Framework           │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ accounts │  │ progress │            │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │mountains │  │  config  │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
    ┌──────────┐      ┌─────────────────┐
    │  SQLite  │      │ Cloudflare R2   │
    │  (dev)   │      │ Image Storage   │
    └──────────┘      └─────────────────┘
```

### Key Architectural Decisions

**Vite Proxy over CORS** — In development, the Vite proxy (`/api` → `http://127.0.0.1:8000`) means the browser never makes a cross-origin request. This eliminates CORS configuration complexity during development and matches the production setup where frontend and API are served from the same domain.

**Session Authentication** — Django's session-based auth with CSRF tokens is used instead of JWT. This is simpler for a web-only application, automatically handles token expiry, and integrates cleanly with Django's admin.

**Django `View` for Export** — The `ExportLogsView` uses Django's standard `View` class with `@login_required` rather than DRF's `APIView`. This is because DRF authentication can return unexpected 404s when returning raw `HttpResponse` objects (CSV/GPX) rather than DRF `Response` objects.

**Client-side Status Filtering** — Collection status filtering and map status filtering happen on the frontend rather than via API query params. This avoids additional API calls and keeps the filter state snappy since the full mountain list is already loaded.

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/csrf/` | Public | Get CSRF token |
| POST | `/api/auth/register/` | Public | Register new user |
| POST | `/api/auth/login/` | Public | Log in |
| POST | `/api/auth/logout/` | Required | Log out |
| GET | `/api/auth/me/` | Public | Current user (null if not logged in) |
| PATCH | `/api/auth/profile/` | Required | Update profile (bio, avatar, username, email) |

### Mountains

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/mountains/` | Public | List mountains (filterable, searchable, orderable) |
| GET | `/api/mountains/:slug/` | Public | Mountain detail |
| GET | `/api/collections/` | Public | List collections |
| GET | `/api/regions/` | Public | List regions |

### Progress Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/progress/logs/` | Required | User's own logs |
| POST | `/api/progress/logs/` | Required | Create log |
| GET | `/api/progress/logs/:id/` | Required | Log detail |
| PATCH | `/api/progress/logs/:id/` | Required | Update log |
| DELETE | `/api/progress/logs/:id/` | Required | Delete log (returns 200 with detail message) |
| GET | `/api/progress/export/?format=csv` | Required | Export as CSV |
| GET | `/api/progress/export/?format=gpx` | Required | Export as GPX |

**Auth scoping** — all progress log endpoints are fully user-scoped. Users can only see and modify their own logs. Attempting to access another user's log returns 404.

---

## 📂 Project Structure

```
summitlog-uk/
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI
│
├── backend/
│   ├── accounts/
│   │   ├── models.py               # UserProfile model
│   │   ├── serializers.py          # Register, User, Profile serializers
│   │   ├── views.py                # Auth views
│   │   ├── urls.py
│   │   └── tests.py                # 35 account tests
│   │
│   ├── mountains/
│   │   ├── models.py               # Mountain, Region, Collection, Membership
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── progress/
│   │   ├── models.py               # UserMountainLog
│   │   ├── serializers.py          # Log serializer with validation
│   │   ├── views.py                # Log CRUD + Export
│   │   ├── urls.py
│   │   └── tests.py                # 45 progress tests
│   │
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py             # Shared settings
│   │   │   ├── local.py            # Development settings
│   │   │   └── production.py       # Production settings
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── data/
│   │   └── dobhih.csv              # DOBIH mountain dataset
│   │
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Layout.jsx
│   │   │   └── ui/
│   │   │       ├── Toast.jsx
│   │   │       └── ConfirmModal.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── MountainsPage.jsx
│   │   │   ├── MountainDetailPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── MapPage.jsx
│   │   │   ├── AccountPage.jsx
│   │   │   ├── JournalPage.jsx
│   │   │   ├── GalleryPage.jsx
│   │   │   ├── CollectionDetailPage.jsx
│   │   │   ├── RegionDetailPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   │
│   │   ├── lib/
│   │   │   └── api.js              # All API calls
│   │   │
│   │   ├── test/
│   │   │   └── setup.js            # Vitest setup
│   │   │
│   │   └── styles/
│   │       ├── global.css
│   │       └── tokens.css
│   │
│   ├── public/
│   │   └── images/
│   │
│   ├── vite.config.js
│   └── package.json
│
├── .env                            # Local secrets (git-ignored)
├── .env.example                    # Example env vars
└── README.md
```

---

## ⚙️ Local Setup & Installation

### Prerequisites

- Python 3.11+
- Node.js 20+
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/summitlog-uk.git
cd summitlog-uk
```

---

### 2. Backend Setup

#### Create and activate a virtual environment

```bash
cd backend
python -m venv .venv
```

**Windows:**
```powershell
.venv\Scripts\activate
```

**Mac/Linux:**
```bash
source .venv/bin/activate
```

#### Install dependencies

```bash
pip install -r requirements.txt
```

#### Create `.env` file in the project root

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for dev — leave blank to use default)
DATABASE_URL=sqlite:///db.sqlite3

# CORS (must match Vite port)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Cloudflare R2 (optional — omit to use local file storage)
CLOUDFLARE_ACCOUNT_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_CUSTOM_DOMAIN=
```

#### Run migrations

```bash
python manage.py migrate
```

#### Create a superuser

```bash
python manage.py createsuperuser
```

#### Load mountain data

```bash
python manage.py import_mountains  # or your data import command
```

#### Start the Django server

```bash
python manage.py runserver
```

Django runs at: `http://127.0.0.1:8000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

> **Note:** The Vite proxy forwards all `/api` requests to `http://127.0.0.1:8000` automatically. Both servers must be running.

---

### 4. Verify setup

Visit `http://localhost:3000` — you should see the SummitLog homepage. Navigate to `/mountains` to confirm the API connection is working.

---

## 🌩️ Cloudflare R2 Image Storage

SummitLog uses Cloudflare R2 (S3-compatible) for storing user-uploaded summit photos. In development without R2 credentials, images fall back to local storage.

### Setup

1. Create a Cloudflare account and create an R2 bucket named `summitlog-media`
2. Create an R2 API token with read/write permissions
3. Enable **Public Access** on the bucket (R2 → bucket → Settings → Public access)
4. Copy the public domain (`pub-XXXX.r2.dev`)
5. Add to `.env`:

```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=summitlog-media
AWS_S3_CUSTOM_DOMAIN=pub-XXXX.r2.dev
```

> **Important:** The bucket must have public access enabled, otherwise uploaded images will return private storage URLs that browsers cannot load.

---

## 👨‍💼 Django Admin

The Django admin is used to manage mountains, collections, regions, users and progress logs.

```
http://127.0.0.1:8000/admin/
```

Login with your superuser credentials.

---

## 🧪 Testing

### Backend Tests

Backend tests use Django's built-in `TestCase` and DRF's `APITestCase`. No additional testing libraries are required.

**Run all backend tests:**

```bash
cd backend
python manage.py test progress accounts --verbosity=2
```

#### Coverage — 80 tests

**`progress/tests.py` — 45 tests**

| Test class | Tests |
|---|---|
| `UserMountainLogModelTest` | `__str__` with/without date, default status, ordering, cascade delete, multiple ascents |
| `UserMountainLogSerializerValidationTest` | Future date rejection, negative distance/duration, zero values, season choices |
| `LogListCreateAPITest` | Auth required, user scoping, create with all fields, future date rejected, mountain_detail in response |
| `LogDetailAPITest` | Owner CRUD, other user gets 404, unauthenticated gets 403, delete returns detail message |
| `ExportLogsViewTest` | CSV/GPX content-type, headers, completed-only filter, own-data scoping, content-disposition |

**`accounts/tests.py` — 35 tests**

| Test class | Tests |
|---|---|
| `UserProfileModelTest` | `__str__`, auto-creation, bio/avatar defaults |
| `RegisterSerializerTest` | Valid data, short password, optional email, hashed password |
| `UserSerializerTest` | avatar/bio fields, null profile handling |
| `CsrfTokenViewTest` | Returns token as string |
| `RegisterViewTest` | Valid, duplicate username, short password, already logged in, no password leak |
| `LoginViewTest` | Valid, wrong password, nonexistent user, missing fields, already logged in, sets session |
| `LogoutViewTest` | Clears session, 403 when unauthenticated |
| `CurrentUserViewTest` | Returns user / null, includes email and bio |
| `UpdateProfileViewTest` | Bio, email, username updates, partial updates don't clear other fields |

---

### Frontend Tests

Frontend tests use Vitest and React Testing Library.

**Install dependencies (first time only):**

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Run all frontend tests:**

```bash
cd frontend
npm run test:run
```

**Watch mode:**

```bash
npm run test
```

#### Coverage — 85 tests

**`api.test.js` — 40 tests**

Tests every exported function in `src/lib/api.js`:

- Correct URLs called
- CSRF token fetched first on all mutation operations
- Correct HTTP methods (GET, POST, PATCH, DELETE)
- Headers sent correctly (Content-Type, X-CSRFToken, Accept)
- JSON body serialisation
- Error handling: `detail`, `non_field_errors`, generic fallback
- Export: download anchor created, correct filename, correct Accept header

**`AccountPage.test.jsx` — 22 tests**

- Login form renders with username and password fields
- Sign in button present
- Register tab switches form and shows email field
- Auth error displayed on failed login
- Error clears when user types in any field
- Error clears when switching tabs
- `loginUser` called with correct credentials
- Generic error message shown when server returns no message
- Username shown when logged in
- Completed and planned stat counts displayed
- Quick links to Dashboard, Journal, Gallery present
- Edit profile and Logout buttons present
- `logoutUser` called on Logout click
- Edit form shown on Edit profile click
- Welcome back kicker text shown

**`CollectionDetailPage.test.jsx` — 23 tests**

- Skeleton shown during loading
- Collection name rendered
- All mountains shown by default
- Status filter buttons present (All, Completed, Planned, Not started)
- Mountain count shown in toolbar
- Completed/planned/not started filters each work correctly
- Filtered count updates in toolbar (`1 of 3 mountains`)
- Empty state shown when filter returns no results
- Show all mountains button resets filter
- Active filter button gets active class
- All button is active by default
- Stat cards show completed, planned, total
- Mountains link to detail pages
- Unauthenticated: mountains shown without status colours
- Error state shown when API fails
- Not found state when slug doesn't match

---

### CI — GitHub Actions

Tests run automatically on every push and pull request to `main` and `develop`.

```yaml
# .github/workflows/ci.yml
# Backend (Django) and Frontend (Vitest) jobs run in parallel
```

View workflow runs at: `https://github.com/your-username/summitlog-uk/actions`

---

## 🐛 Bugs Encountered & Solutions

This section documents the significant bugs encountered during development and how they were resolved.

---

### 🔴 Login working in Django admin but not from the frontend

**Symptom:** Login form submitted with correct credentials but nothing happened — no error, no redirect, no session created.

**Root cause:** The React frontend was running on a different port each time Vite started (`5173`, `5174`, `5175`...) but the Django `CORS_ALLOWED_ORIGINS` setting only whitelisted specific ports. The browser was silently blocking all cross-origin requests.

**Investigation steps:**
1. Confirmed password was correct via Django shell: `u.check_password('tom12345')` returned `True`
2. Added error state to login form — error message showed "Failed to fetch" (network error, not auth error)
3. Checked browser console — CORS policy blocking requests from `localhost:5174` while CORS only allowed `localhost:5173`

**Solution:** Replaced CORS-based cross-origin requests entirely with a Vite proxy. Added to `vite.config.js`:

```javascript
server: {
  port: 3000,
  strictPort: true,
  proxy: {
    '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true }
  }
}
```

`strictPort: true` prevents Vite silently switching ports. The proxy means the browser never makes a cross-origin request — CORS configuration is irrelevant for development.

---

### 🔴 CSV export returning 404

**Symptom:** Clicking "Export CSV" showed no response, then after adding error feedback: `Error: Not found.`

**Root cause:** `ExportLogsView` extended DRF's `APIView` which runs DRF's full authentication pipeline. When returning a raw Django `HttpResponse` (CSV content) rather than a DRF `Response`, DRF's authentication checks returned a 404 instead of the expected file — even for authenticated users.

**Investigation steps:**
1. Confirmed URL was registered: `reverse('export-logs')` returned `/api/progress/export/`
2. Tested directly in Django shell with `RequestFactory` — view returned 404 even with a valid user
3. Confirmed the issue was DRF's `APIView` not DRF's `Response` — the view returned `rest_framework.response.Response` with status 404

**Solution:** Changed `ExportLogsView` from `APIView` to Django's standard `View` with `@login_required`:

```python
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

@method_decorator(login_required, name='dispatch')
class ExportLogsView(View):
    def get(self, request):
        ...
        return HttpResponse(...)  # Plain Django HttpResponse
```

---

### 🔴 Vite port jumping breaking the proxy

**Symptom:** After fixing CORS with the Vite proxy, the export and other features would stop working intermittently. The frontend would be on a different port (`5175`, `5176`) than expected.

**Root cause:** If a process was already using the configured Vite port, Vite would silently increment the port number. The proxy configuration only applies when Vite starts on the configured port — on a different port, requests went directly to Django without the proxy.

**Solution:** Added `strictPort: true` to Vite config so Vite errors instead of silently switching:

```javascript
server: {
  port: 3000,
  strictPort: true,  // Fail loudly rather than switch ports
}
```

If port 3000 is in use:
```powershell
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

---

### 🔴 Cloudflare R2 images not displaying

**Symptom:** Images uploaded via the tracking form were saved successfully but showed as broken in the gallery and dashboard.

**Root cause:** Cloudflare R2 buckets are private by default. The URL stored in the database was the raw R2 storage URL (`https://ACCOUNT_ID.r2.cloudflarestorage.com/...`) which requires signed authentication — browsers cannot load it directly.

**Solution:**
1. Enabled public access on the R2 bucket in the Cloudflare dashboard (bucket → Settings → Public access)
2. Added `AWS_S3_CUSTOM_DOMAIN` to settings and `.env`:

```python
AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")
if AWS_S3_CUSTOM_DOMAIN:
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
```

New uploads now use the public `pub-XXXX.r2.dev` domain. Previously uploaded images with private URLs needed to be re-uploaded.

---

### 🟡 Django test failures — Mountain requires collection FK

**Symptom:** All progress tests failed with `IntegrityError: NOT NULL constraint failed: mountains_mountain.collection_id`

**Root cause:** The `Mountain` model has a non-nullable `collection` foreign key. The test helper `make_mountain()` was not providing a `collection` value.

**Solution:** Updated `make_mountain()` helper to create and assign a collection:

```python
def make_mountain(name="Scafell Pike", height_m=978):
    region = make_region()
    collection = make_collection()
    return Mountain.objects.get_or_create(
        name=name,
        defaults={
            "collection": collection,
            ...
        },
    )[0]
```

---

### 🟡 Multiple elements matching in React tests

**Symptom:** Two React tests failed with `Found multiple elements with the text: Completed` (and `1`)

**Root cause:** The test used `screen.getByText()` which throws if multiple elements match. "Completed" appeared in the stat card label, the filter button and mountain row status badge simultaneously. "1" appeared in both the completed count and planned count.

**Solution:** Scoped queries to the specific container element:

```javascript
const grid = document.querySelector('.collection-overview-grid')
expect(grid.textContent).toContain('Completed')
```

---

## ✅ Manual Testing

### Authentication

| Test | Expected | Result |
|---|---|---|
| Register new account | Creates user and profile, logs in | ✅ Pass |
| Login with correct credentials | Session created, user shown | ✅ Pass |
| Login with wrong password | Error message shown | ✅ Pass |
| Login with nonexistent user | Error message shown | ✅ Pass |
| Logout | Session cleared, login form shown | ✅ Pass |
| Update bio and avatar | Profile updated, avatar shown | ✅ Pass |
| Access journal when logged out | Redirected to account page | ✅ Pass |
| Access gallery when logged out | Redirected to account page | ✅ Pass |

### Mountain Logs

| Test | Expected | Result |
|---|---|---|
| Log a mountain as planned | Log created, status shown | ✅ Pass |
| Update log to completed with date | Status and date saved | ✅ Pass |
| Submit completed with no date | Required hint shown, toast error | ✅ Pass |
| Delete a log | Confirm modal shown, log deleted on confirm | ✅ Pass |
| Log same mountain twice | Both ascents shown in history list | ✅ Pass |
| Upload summit photo | Image stored in R2, shown in form preview | ✅ Pass |

### Dashboard

| Test | Expected | Result |
|---|---|---|
| View dashboard logged out | Demo mode with example data shown | ✅ Pass |
| View dashboard logged in | Real stats from logs shown | ✅ Pass |
| Click recent log item | Navigates to mountain detail page | ✅ Pass |
| Click region card | Navigates to region detail page | ✅ Pass |
| Export CSV | CSV file downloaded | ✅ Pass |
| Export GPX | GPX file downloaded | ✅ Pass |

### Map

| Test | Expected | Result |
|---|---|---|
| View map | All mountains plotted with grey markers | ✅ Pass |
| Filter by collection | Markers filtered to collection | ✅ Pass |
| Filter by status (completed) | Only completed markers shown | ✅ Pass |
| My ascents only toggle | Only logged mountains shown | ✅ Pass |
| Click marker popup link | Navigates to mountain detail page | ✅ Pass |

### Gallery & Journal

| Test | Expected | Result |
|---|---|---|
| View gallery with uploaded photos | Masonry grid shown | ✅ Pass |
| Click photo | Lightbox opens | ✅ Pass |
| Arrow key navigation in lightbox | Cycles through photos | ✅ Pass |
| Escape key closes lightbox | Lightbox closes | ✅ Pass |
| Journal filter by status | Only matching entries shown | ✅ Pass |
| Journal search | Matching mountain names shown | ✅ Pass |

### Collections

| Test | Expected | Result |
|---|---|---|
| Filter collection by Completed | Only completed mountains shown | ✅ Pass |
| Filter collection by Planned | Only planned mountains shown | ✅ Pass |
| Filter returns no results | Empty state with Show all button | ✅ Pass |
| Show all mountains resets filter | All mountains shown again | ✅ Pass |

### Mobile Responsiveness

| Page | Expected | Result |
|---|---|---|
| Homepage | Hero, stats and actions stack cleanly | ✅ Pass |
| Mountains | 1-column card grid | ✅ Pass |
| Mountain detail | Stat cards 2-column, form stacks | ✅ Pass |
| Map | Full width, legend below map | ✅ Pass |
| Dashboard | Stat grid 1-column, charts full width | ✅ Pass |
| Journal | Filters stack full width | ✅ Pass |
| Gallery | 1-column masonry | ✅ Pass |

---

## 🗂️ Project Management

*This section will be updated with the GitHub Project board link and sprint breakdown once the repository is public.*

Development was tracked using a GitHub Project board covering:

- Backend API development
- Frontend page implementation
- Authentication and user flows
- Design system and CSS
- Image storage setup
- Testing and coverage
- Bug fixes and polish
- Documentation

**GitHub Project Board:** [Link coming soon]

**GitHub Issues:** [Link coming soon]

---

## 🚀 Deployment

*Full deployment walkthrough coming soon. Below is a summary of the deployment configuration.*

### Frontend — Placeholder

The frontend can be deployed to any static hosting service (Vercel, Netlify, Cloudflare Pages).

**Build command:**
```bash
npm run build
```

**Environment variables:**
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

### Backend — Placeholder

The Django backend can be deployed to any Python hosting service (Render, Railway, Fly.io).

**Required environment variables:**
```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=your-api-domain.com
DATABASE_URL=postgresql://...
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com
CLOUDFLARE_ACCOUNT_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_CUSTOM_DOMAIN=
```

**Pre-deploy steps:**
```bash
python manage.py collectstatic --noinput
python manage.py migrate
```

---

## 📌 Future Enhancements

### Features

- **Strava integration** — import activities and auto-populate ascent stats
- **Social sharing** — shareable summit card (image with stats) for each completed ascent
- **Elevation profiles** — SVG elevation chart for each mountain using DEM data
- **Route suggestions** — recommended routes per mountain based on community logs
- **Seasonal conditions** — community-reported conditions per mountain per season
- **Mobile app** — React Native client using the same API

### Technical

- **Pagination** — the mountains endpoint returns all results; adding cursor pagination would improve performance at scale
- **Redis caching** — cache mountain data to reduce database load
- **Full-text search** — improve mountain search with PostgreSQL full-text search
- **Image optimisation** — resize and compress images before R2 upload
- **Expanded test coverage** — add tests for `MountainDetailPage`, `DashboardPage`, `MapPage`
- **E2E tests** — Playwright tests for critical user journeys (register → log mountain → view dashboard)

---

## 📬 Contact

- **GitHub:** [https://github.com/your-username](https://github.com/your-username)
- **LinkedIn:** [https://linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)

---

<div align="center">

Built for hillwalkers, by a hillwalker.

*Track the peaks. Own the journey.*

</div>

