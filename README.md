# 🚨 SIH1440 - Disaster Management Rescue Coordination App

> **Smart India Hackathon 2026** | Disaster Management & Emergency Response

A comprehensive offline-first rescue coordination platform that enables real-time communication between survivors, volunteers, rescue agencies, and coordinators during disasters when traditional networks fail.

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Team](#-team)
- [Development Workflow](#-development-workflow)
- [Documentation](#-documentation)
- [Demo](#-demo)
- [Future Scope](#-future-scope)
- [License](#-license)

---

## 🎯 Problem Statement

**SIH1440: Disaster Management Rescue Coordination App**

During natural disasters (floods, earthquakes, cyclones, etc.), traditional communication networks often fail, creating critical challenges:

- ❌ **Communication breakdown** between survivors and rescue teams
- ❌ **No real-time coordination** among multiple rescue agencies
- ❌ **Difficulty locating survivors** in affected areas
- ❌ **Inefficient resource allocation** (food, water, medical supplies)
- ❌ **Duplication of efforts** by different rescue organizations
- ❌ **Lack of offline capabilities** when internet is unavailable

**Our mission**: Build a resilient, offline-first platform that keeps communities connected and coordinates rescue efforts even when cellular networks are down.

---

## 💡 Solution Overview

Our solution provides a **mesh-networked emergency communication platform** with:

- 📱 **Mobile App** (Flutter) - For survivors, volunteers, and field coordinators
- 🖥️ **Web Dashboard** (React/Next.js) - For command centers and agency heads
- ⚙️ **Backend API** (Node.js/FastAPI) - Real-time data synchronization
- 🔗 **Mesh Networking** - Bluetooth LE & Wi-Fi Direct for offline communication
- 🔒 **End-to-End Encryption** - Secure communication for sensitive data

### How It Works

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Survivors  │─────▶│   Volunteers │─────▶│ Rescue Teams│
│  (SOS)      │      │  (First Aid) │      │  (NDRF/SDRF)│
└─────────────┘      └──────────────┘      └─────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│              Mesh Network (Offline Mode)                │
│         Bluetooth LE + Wi-Fi Direct + Store-Carry       │
└─────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Coordinators│◀─────│ Command Center│◀────│  Web Portal │
│ (Field Ops) │      │  (Dashboard) │      │  (Public)   │
└─────────────┘      └──────────────┘      └─────────────┘
```

---

## ✨ Key Features

### 🆘 For Survivors
- **SOS Alert**: One-tap emergency broadcast with GPS location
- **Status Updates**: Mark yourself safe, injured, or need urgent help
- **Offline Messaging**: Send messages via mesh network when internet is down
- **Resource Requests**: Request food, water, medical aid, shelter
- **Missing Persons**: Report and search for missing family members
- **Safety Announcements**: Receive alerts from coordinators

### 🤝 For Volunteers
- **Task Assignment**: View and accept rescue tasks nearby
- **Availability Status**: Mark yourself available/on-duty/offline
- **Resource Inventory**: Track and update available supplies
- **Incident Reporting**: Report hazards, blocked routes, casualties
- **Team Coordination**: Communicate with other volunteers offline

### 🚒 For Rescue Agencies (NDRF, SDRF, Local Authorities)
- **Resource Management**: Track teams, equipment, vehicles
- **Priority Alerts**: High-priority SOS from critical areas
- **Multi-Agency Coordination**: Share information without duplication
- **Live Dashboard**: Real-time view of all incidents and resources
- **Route Planning**: Optimal paths considering blocked areas

### 📊 For Coordinators & Command Centers
- **Incident Map**: Visual overview of all incidents on map
- **Resource Allocation**: Assign teams and supplies efficiently
- **Analytics Dashboard**: Statistics on rescues, casualties, resources
- **Broadcast System**: Send announcements to specific areas
- **Report Generation**: Automated reports for government agencies

### 🔧 Technical Features
- ✅ **Offline-First**: Works without internet via mesh networking
- ✅ **Store-Carry-Forward**: Messages hop between devices until delivered
- ✅ **End-to-End Encryption**: libsodium for secure communication
- ✅ **Multi-Language**: Support for Hindi, English, and regional languages
- ✅ **Low Battery Mode**: Optimized for extended disaster scenarios
- ✅ **Cross-Platform**: Android & iOS from single codebase

---

## 🛠️ Tech Stack

### Mobile Application
| Technology | Purpose |
|------------|---------|
| **Flutter 3.x** | Cross-platform mobile framework |
| **flutter_blue_plus** | Bluetooth LE mesh networking |
| **provider / riverpod** | State management |
| **sqflite** | Local offline storage |
| **geolocator** | GPS location services |
| **mapbox_gl** | Offline maps integration |

### Web Dashboard
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with SSR |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Styling and responsive design |
| **Redux Toolkit** | State management |
| **Leaflet / Mapbox** | Interactive maps |
| **Recharts** | Data visualization |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 20** | Runtime environment |
| **Express.js / FastAPI** | RESTful API framework |
| **PostgreSQL** | Primary database |
| **Prisma ORM** | Database schema & migrations |
| **Redis** | Caching & real-time pub/sub |
| **Socket.io** | WebSocket for live updates |
| **JWT** | Authentication & authorization |

### DevOps & Tools
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD pipeline |
| **ESLint / Prettier** | Code quality |
| **Jest / Flutter Test** | Testing frameworks |
| **MinIO / AWS S3** | File storage |
| **PM2** | Process management |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
├──────────────────────┬──────────────────────────────────────┤
│   Mobile App (Flutter)│      Web Dashboard (Next.js)        │
│   - Survivor Module   │      - Command Center               │
│   - Volunteer Module  │      - Agency Dashboard             │
│   - Coordinator Module│      - Analytics & Reports          │
└──────────┬───────────┴────────────────┬─────────────────────┘
           │                            │
           │  HTTPS / WebSocket         │  HTTPS
           ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Nginx)                    │
│              - Rate Limiting - SSL Termination              │
└─────────────────────────┬───────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Auth Service   │ │  API Server │ │  WebSocket Svr  │
│  (JWT/OAuth)    │ │  (Node.js)  │ │  (Socket.io)    │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
├──────────────┬────────────────┬─────────────────────────────┤
│  PostgreSQL  │     Redis      │         MinIO/S3            │
│  (Primary)   │   (Cache)      │      (File Storage)         │
└──────────────┴────────────────┴─────────────────────────────┘
```

### Database Schema (Simplified)

```
Users ──┬──> Profiles ──> Roles (Survivor/Volunteer/Coordinator/Agency)
        │
        ├──> SOSAlerts ──> Location ──> Status (Pending/Resolved)
        │
        ├──> Messages ──> Recipients ──> DeliveryStatus
        │
        ├──> Resources ──> Inventory ──> Transactions
        │
        └──> Incidents ──> Reports ──> Media (Images/Videos)
```

---

## 🚀 Getting Started

### Prerequisites

- **Flutter SDK** (3.x or higher)
- **Node.js** (20.x or higher)
- **PostgreSQL** (15.x or higher)
- **Redis** (7.x or higher)
- **Git** (for version control)

### 1. Clone the Repository

```bash
git clone https://github.com/rachit140/SIH--Disaster-Management-Rescue-Coordination-App.git
cd SIH1440-DisasterRescueApp
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration:
# DATABASE_URL=postgresql://user:password@localhost:5432/sih1440
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

### 3. Mobile App Setup

```bash
cd mobile-app

# Get Flutter dependencies
flutter pub get

# Generate code (if using freezed, json_serializable, etc.)
flutter pub run build_runner build

# Run on Android emulator
flutter run

# Or run on iOS simulator
flutter run -d ios
```

### 4. Web Dashboard Setup

```bash
cd web-dashboard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Access at http://localhost:3000
```

### 5. Docker Setup (Optional)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 📁 Project Structure

```
SIH1440-DisasterRescueApp/
│
├── .github/                    # GitHub workflows & templates
│   ├── workflows/
│   │   ├── ci-cd.yml          # Continuous integration
│   │   └── code-quality.yml   # Linting & tests
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/                       # Documentation
│   ├── problem-statement.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   └── database-schema.md
│   ├── api-documentation.md
│   └── presentation/
│
├── mobile-app/                 # Flutter mobile application
│   ├── lib/
│   │   ├── main.dart
│   │   ├── core/              # Constants, theme, utils
│   │   ├── features/          # Feature modules
│   │   │   ├── auth/
│   │   │   ├── survivor/
│   │   │   ├── volunteer/
│   │   │   └── coordinator/
│   │   ├── services/          # Mesh, location, storage
│   │   ├── models/            # Data models
│   │   └── widgets/           # Reusable widgets
│   ├── test/                  # Unit & widget tests
│   └── pubspec.yaml
│
├── web-dashboard/              # Next.js web application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # UI components
│   │   ├── store/             # Redux store
│   │   └── utils/
│   ├── public/
│   └── package.json
│
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/            # Prisma models
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth, validation
│   │   ├── services/          # Business logic
│   │   └── config/            # Configuration
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   └── package.json
│
├── scripts/                    # Utility scripts
│   ├── setup.sh
│   └── deploy.sh
│
├── .env.example               # Environment variables template
├── .gitignore
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## 👥 Team

| Name | Role | Responsibilities | GitHub |
|------|------|------------------|--------|
| **Team Lead** | Full Stack | Architecture, Code Review, Integration | [@username](link) |
| **Mobile Dev 1** | Flutter | Survivor & Volunteer Modules | [@username](link) |
| **Mobile Dev 2** | Flutter | Coordinator & Agency Modules | [@username](link) |
| **Backend Dev 1** | Node.js | API, Auth, Database | [@username](link) |
| **Backend Dev 2** | Node.js | Mesh Networking, Real-time | [@username](link) |
| **Frontend Dev** | Next.js | Web Dashboard, Command Center | [@username](link) |

---

## 🔄 Development Workflow

### Branch Strategy

```
main (production)
  └── develop (integration)
        ├── feature/sos-alert-system
        ├── feature/mesh-networking
        ├── feature/resource-tracking
        └── bugfix/location-sync
```

### Daily Workflow

```bash
# 1. Sync with latest develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Work & commit frequently
git add .
git commit -m "feat: implement SOS alert broadcast"

# 4. Push and create PR
git push -u origin feature/your-feature-name
# Create PR on GitHub with description & screenshots

# 5. After review, merge to develop (Team Lead)
git checkout develop
git merge feature/your-feature-name
git push origin develop
```

### Commit Message Convention

```
feat: add offline mesh networking for survivor alerts
fix: resolve location sync issue in coordinator dashboard
docs: update API documentation for resource endpoints
test: add unit tests for SOS alert service
refactor: optimize database queries for faster response
```

### Pull Request Checklist

- [ ] Code follows project guidelines
- [ ] Self-review completed
- [ ] Tested locally on device/emulator
- [ ] No console warnings or errors
- [ ] Documentation updated
- [ ] Related issue linked

---

## 📚 Documentation

- [**Problem Statement**](./docs/problem-statement.md) - Detailed SIH1440 analysis
- [**System Design**](./docs/architecture/system-design.md) - Architecture diagrams
- [**Database Schema**](./docs/architecture/database-schema.md) - ER diagrams
- [**API Documentation**](./docs/api-documentation.md) - Endpoint specifications
- [**User Stories**](./docs/user-stories.md) - User personas & workflows
- [**Testing Plan**](./docs/testing-plan.md) - Test cases & coverage
- [**Deployment Guide**](./docs/deployment-guide.md) - Setup instructions

---

## 🎬 Demo

### Screenshots

#### Mobile App
| SOS Alert | Offline Mesh | Resource Request |
|-----------|--------------|------------------|
| ![SOS Alert](./docs/assets/sos-alert.png) | ![Mesh Network](./docs/assets/mesh-network.png) | ![Resources](./docs/assets/resources.png) |

#### Web Dashboard
| Command Center | Incident Map | Analytics |
|----------------|--------------|-----------|
| ![Dashboard](./docs/assets/dashboard.png) | ![Map](./docs/assets/incident-map.png) | ![Analytics](./docs/assets/analytics.png) |

### Video Demo

[Watch Demo Video](./docs/assets/demo-video.mp4)

### Live Demo

- **Web Dashboard**: [https://sih1440-dashboard.vercel.app](https://sih1440-dashboard.vercel.app)
- **API Docs**: [https://sih1440-api.herokuapp.com/docs](https://sih1440-api.herokuapp.com/docs)

---

## 🚀 Future Scope

### Phase 2 Features
- 🛰️ **Satellite Communication** integration for remote areas
- 🤖 **AI-Powered Triage** for prioritizing rescue operations
- 📊 **Predictive Analytics** for resource allocation
- 🌐 **Multi-Network Fallback** (LoRa, Satellite, HAM radio)
- 🏥 **Telemedicine Integration** for remote medical consultation
- 🚁 **Drone Coordination** for aerial surveillance and supply drops

### Scalability Improvements
- 📈 Handle 100,000+ concurrent users
- 🌍 Multi-region deployment for disaster-prone areas
- 🔐 Blockchain-based identity verification
- 📱 Progressive Web App (PWA) for broader accessibility

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Smart India Hackathon 2026** for the opportunity
- **Ministry of Electronics & IT** for the problem statement
- **NDRF & SDRF** for insights on rescue operations
- **Open Source Community** for amazing tools and libraries

---

## 📞 Contact

- **Project Lead**: [Your Name] - [email@example.com](mailto:email@example.com)
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-team/SIH1440-DisasterRescueApp/issues)
- **SIH Portal**: [https://sih.gov.in](https://sih.gov.in)

---

<div align="center">

**Made with ❤️ for Smart India Hackathon 2026**

[⬆ Back to Top](#-sih1440---disaster-management-rescue-coordination-app)

</div>
