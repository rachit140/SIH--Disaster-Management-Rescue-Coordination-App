# PRD — SAHAYSETU

## Original Problem Statement
SAHAYSETU — Intelligent Disaster Response & Rescue Coordination Platform. A production-quality,
enterprise-grade, professional disaster-management web application. Light mode default,
projector-friendly high contrast, clean command-and-control feel. Tagline: "Connect. Coordinate.
Respond. Save Lives." Requested stack was Next.js/Tailwind/Express/Postgres — built on the
platform's supported equivalent: **Expo/React Native + React Native Web (desktop-first) + FastAPI + MongoDB**.

## User Choices (locked)
- Proceed on supported Emergent stack. Replace previous app.
- Auth: real email+password JWT + Emergent Google login; OTP & Government ID simulated for demo.
- Desktop web first, responsive to mobile. Preload rich demo data.

## Architecture
- **Frontend (Expo Router):**
  - `app/index.tsx` splash + auth gate; `(auth)/` login, register, forgot-password, otp, role-selection; `(app)/` shell (`_layout` guard + AppShell) with dashboard, incidents, incident/[id], live-map, settings, profile, sos + placeholder modules.
  - `src/theme/` tokens + ThemeContext (light default, dark, persisted).
  - `src/auth/AuthContext.tsx` unified auth (JWT + Emergent Google session) + secure token storage via `@/src/utils/storage`.
  - `src/api.ts` REST client. `src/components/` Sidebar, TopBar, AppShell, AuthScaffold, ui kit, LeafletMap (web iframe / native WebView).
- **Backend (FastAPI + MongoDB, `/api`):** unified auth (register/verify-otp/login/forgot/reset/gov-login/google session/me/role/logout), dashboard summary, incidents CRUD + updates, map markers. Rich seed: 14 incidents (12 active), teams, shelters, hospitals, resources. DEV_RETURN_OTP for demo OTP.

## User Personas
Coordinator, Rescue Team, Volunteer, Survivor/Citizen, Government Official (role selection tailors dashboard).

## Core Requirements (static)
- Enterprise light-mode UI, navy/blue/red/orange/green/purple accents, 8px spacing, subtle borders.
- Sidebar (collapsible + mobile drawer) + top nav; role-based identity; light/dark toggle.
- Live OpenStreetMap (Leaflet) incident/team/shelter/hospital/resource mapping.

## Implemented (2026-06)
- [x] Splash, Login (split-screen + Google + Gov ID), Register, OTP, Forgot Password, Role Selection.
- [x] Responsive app shell (sidebar sections + badges + collapse + mobile drawer, top bar with search/notifications/online/profile).
- [x] Dashboard (KPIs, live incident map, recent incidents, legend).
- [x] Incidents (search + severity/status chip filters) and Incident Details (5 tabs, action buttons, live location, timeline updates, mark resolved).
- [x] Live Map (full map + layer toggles + counts).
- [x] Settings with working Light/Dark theme toggle (persisted), Profile, Emergency SOS.
- [x] Unified JWT + Emergent Google auth; simulated OTP + Government ID. 16/16 backend tests + full frontend E2E pass.

## Backlog (explicitly for later prompts, currently "Coming Soon")
- (All modules below now BUILT — see Implemented 2026-06 #2.)

## Implemented — Modules (2026-06 #2)
- [x] Survivors (stat cards, search, status+priority filters, list, Add Survivor modal).
- [x] Volunteers (metrics, cards, Assign/Contact/Track).
- [x] Rescue Teams (map tracking + team cards: leader/members/mission/status/resources).
- [x] Resources (category filters, available/allocated progress, action buttons).
- [x] Resource Requests (list + New Request modal + status advance workflow).
- [x] Shelters (map + capacity bars + facility indicators).
- [x] Messages (tabbed conversation list + thread, priority messages, composer).
- [x] Alerts (priority cards + Acknowledge/Broadcast/Resolve).
- [x] Reports (report cards + View/Download/Export PDF/CSV with toast).
- [x] Analytics (SVG bar/line/donut charts + date-range filters).
- [x] Profile (full fields + Edit Profile modal + activity history).
- [x] Backend: survivors/volunteers/teams/resources/requests/shelters/conversations/alerts/reports/analytics/profile endpoints + rich Indian sample data. 33/35 backend tests pass; frontend E2E verified; SelectMenu crash fixed.

## Next Tasks
- Build Survivors/Volunteers/Resources modules (data + screens) per follow-up prompt.
- Build Reports/Analytics with charts and Settings expansion per follow-up prompt.
