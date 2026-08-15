# 🚨 SIH1440 --- Disaster Management Rescue Coordination App

> **Smart India Hackathon 2026 \| Disaster Management & Emergency
> Response**

An offline-first disaster rescue coordination platform that connects
survivors, volunteers, rescue teams, and command centers even when
traditional cellular or Internet connectivity is unavailable.

The system combines a Flutter mobile application, an offline
communication layer, a Node.js backend, PostgreSQL, real-time
synchronization, and a Next.js command-center dashboard.

---

## 📌 Table of Contents

- [1. Problem Statement](#1-problem-statement)
- [2. Core Idea](#2-core-idea)
- [3. MVP Scope](#3-mvp-scope)
- [4. End-to-End Workflow](#4-end-to-end-workflow)
- [5. System Architecture](#5-system-architecture)
- [6. Offline Mesh Architecture](#6-offline-mesh-architecture)
- [7. Message Protocol](#7-message-protocol)
- [8. Offline Data and
  Synchronization](#8-offline-data-and-synchronization)
- [9. User Roles](#9-user-roles)
- [10. Core Features](#10-core-features)
- [11. Technology Stack](#11-technology-stack)
- [12. Database Design](#12-database-design)
- [13. Backend API](#13-backend-api)
- [14. Web Dashboard](#14-web-dashboard)
- [15. Mobile Application](#15-mobile-application)
- [16. Security](#16-security)
- [17. Development Workflow](#17-development-workflow)
- [18. Team Responsibilities](#18-team-responsibilities)
- [19. Development Roadmap](#19-development-roadmap)
- [20. Testing Strategy](#20-testing-strategy)
- [21. Deployment Architecture](#21-deployment-architecture)
- [22. Demo Scenario](#22-demo-scenario)
- [23. Future Scope](#23-future-scope)

---

# 1. 🎯 Problem Statement

During floods, earthquakes, cyclones, stampedes, and other disasters,
communication infrastructure can become unavailable.

This creates several problems:

- Communication breakdown between survivors and rescue teams
- Difficulty locating survivors
- Delayed SOS communication
- Poor coordination between rescue organizations
- Inefficient resource and team allocation
- Duplicate rescue efforts
- Lack of reliable offline communication

### Mission

Build a resilient rescue coordination system that can continue
exchanging critical information when Internet or cellular connectivity
is unavailable.

---

# 2. 💡 Core Idea

The most important concept in SIH1440 is:

> **Offline-first emergency communication + rescue coordination.**

The application operates in two modes.

## 🌐 Online Mode

```text
Mobile App
     |
     | HTTPS / WebSocket
     v
Node.js Backend
     |
     +------ PostgreSQL
     |
     +------ Redis
     |
     v
Command Center Dashboard
```

## 🚨 Offline Mode

```text
Survivor Phone
      |
      | Bluetooth / Wi-Fi
      v
Volunteer Phone
      |
      | Store-Carry-Forward
      v
Rescue Team Phone
      |
      v
Emergency Gateway
      |
      | Internet restored
      v
Backend
      |
      v
Command Center
```

The offline layer allows critical messages to be stored and forwarded
between nearby devices until they reach a device with a route to the
backend.

---

# 3. 🚀 MVP Scope

The project should **not attempt to implement every possible feature
during the SIH MVP**.

The MVP focuses on one complete and demonstrable emergency workflow.

## MVP Features

### Survivor

- Registration/login
- One-tap SOS
- GPS location
- Emergency message
- Emergency status
- Offline SOS storage

### Offline Communication

- Device discovery
- Bluetooth-based communication
- Message forwarding
- Store-Carry-Forward
- Message ID
- TTL
- Duplicate detection
- Offline queue

### Volunteer / Rescue Worker

- Receive nearby SOS
- View survivor location
- Accept rescue task
- Update rescue status

### Command Center

- Live incident map
- SOS list
- Priority classification
- Incident status
- Rescue-team assignment
- Real-time updates

### Synchronization

```text
Offline Event
     ↓
Local Database
     ↓
Mesh Network
     ↓
Emergency Gateway
     ↓
Backend API
     ↓
PostgreSQL
     ↓
Command Dashboard
```

---

# 4. 🔄 End-to-End Workflow

The complete system should work like this:

```text
1. Disaster occurs
        ↓
2. Cellular/Internet connectivity fails
        ↓
3. Survivor opens mobile app
        ↓
4. Survivor presses SOS
        ↓
5. GPS location is captured
        ↓
6. SOS is stored in local SQLite database
        ↓
7. Offline communication layer searches for nearby devices
        ↓
8. SOS is forwarded to another device
        ↓
9. Message continues through available devices
        ↓
10. Rescue/gateway device receives the SOS
        ↓
11. Internet connectivity becomes available
        ↓
12. Gateway synchronizes the SOS with backend
        ↓
13. Backend stores the incident in PostgreSQL
        ↓
14. Socket.IO pushes update to dashboard
        ↓
15. Command center sees the SOS on the map
        ↓
16. Coordinator assigns rescue team
        ↓
17. Rescue team updates incident status
        ↓
18. Incident is marked RESCUED / RESOLVED
```

This complete workflow should be the primary SIH demonstration.

---

# 5. 🏗️ System Architecture

```text
                           COMMAND CENTER
                         Next.js Web Dashboard
                                  |
                           HTTPS / WebSocket
                                  |
                                  v
                         +------------------+
                         |   API GATEWAY    |
                         |      Nginx       |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         |   Node.js API    |
                         |    Express.js    |
                         +--------+---------+
                                  |
                    +-------------+-------------+
                    |             |             |
                    v             v             v
              PostgreSQL       Redis       Object Storage
                    |
                    |
                Cloud Sync
                    ^
                    |
             +------+------+
             | Sync Engine |
             +------+------+
                    |
            Internet Available?
                 /       \
               YES       NO
                |         |
                v         v
           Cloud API   Offline Queue
                          |
                          v
                  +---------------+
                  |  Mesh Layer   |
                  | BLE / Wi-Fi   |
                  +-------+-------+
                          |
             +------------+------------+
             |            |            |
             v            v            v
         Survivor     Volunteer     Rescuer
           Phone        Phone         Phone
```

---

# 6. 📡 Offline Mesh Architecture

The offline communication layer is the most technically important
component.

## Basic Concept

```text
Device A
   |
   | BLE
   v
Device B
   |
   | BLE
   v
Device C
   |
   | Wi-Fi / Gateway
   v
Backend
```

A device does not need to have a direct connection to the final
destination.

It can:

1.  Receive a message
2.  Store it locally
3.  Check whether it has already seen it
4.  Decrease/check TTL
5.  Forward it when another suitable device becomes available

---

## Store-Carry-Forward

```text
Receive Message
      |
      v
Already Seen?
   /       \
 YES       NO
  |         |
Ignore    Store
            |
            v
         Check TTL
            |
            v
       Forward when
       device available
```

---

# 7. 📨 Message Protocol

Every important offline message should have a unique identifier and
routing metadata.

Example:

```json
{
  "message_id": "SOS-98231",
  "type": "SOS",
  "source_device": "DEVICE-A",
  "source_user": "USER-102",
  "timestamp": "2026-08-15T10:31:00Z",
  "priority": "CRITICAL",
  "ttl": 8,
  "hop_count": 2,
  "latitude": 26.4499,
  "longitude": 80.3319,
  "payload": {
    "message": "Trapped inside building",
    "status": "PENDING"
  }
}
```

## Important Fields

Field Purpose

---

`message_id` Prevent duplicate processing
`type` SOS, INCIDENT, MESSAGE, etc.
`source_device` Device that created/forwarded the message
`source_user` User who created the event
`timestamp` Event creation time
`priority` CRITICAL, HIGH, NORMAL
`ttl` Maximum forwarding lifetime
`hop_count` Number of devices crossed
`latitude` Survivor/incident location
`longitude` Survivor/incident location
`payload` Actual emergency data

## Duplicate Prevention

Before forwarding:

```text
Has message_id been processed?
       |
   +---+---+
   |       |
  YES      NO
   |        |
 IGNORE    STORE
            |
            v
         FORWARD
```

This prevents:

```text
A → B → A → B → A → B
```

from creating an endless loop.

---

# 8. 🔄 Offline Data and Synchronization

## Local Database

The mobile application should maintain an offline database.

Recommended local entities:

```text
messages
offline_events
sync_queue
devices
sos_alerts
```

Example:

```text
sync_queue
--------------------------------
id
message_id
event_type
payload
created_at
retry_count
sync_status
```

## Synchronization Flow

```text
Local Event
     |
     v
sync_queue
     |
     v
Internet Available?
     |
    YES
     |
     v
POST /sync
     |
     v
Backend Validation
     |
     v
Deduplication
     |
     v
PostgreSQL
     |
     v
Socket.IO
     |
     v
Dashboard
```

## Duplicate Synchronization

The backend should also check `message_id`.

If:

```text
message_id = SOS-98231
```

already exists, the backend should not create another incident.

---

# 9. 👥 User Roles

## Survivor

Can:

- Send SOS
- Share location
- Send emergency message
- Update safety status
- Request assistance

## Volunteer

Can:

- Receive SOS
- Accept tasks
- Report incidents
- Update availability
- Forward offline messages

## Coordinator

Can:

- Monitor incidents
- Assign teams
- Prioritize emergencies
- Broadcast announcements
- Track rescue progress

## Rescue Agency

Can:

- View incidents
- Manage teams
- Manage resources
- Coordinate rescue operations
- Update incident status

---

# 10. ✨ Core Features

## 🆘 SOS Alert

The survivor presses one button.

The system collects:

```text
User ID
GPS
Timestamp
Emergency type
Priority
Message
Battery status
```

The SOS is then:

```text
Saved locally
      ↓
Broadcast/forwarded offline
      ↓
Synchronized with server
      ↓
Displayed on command center
```

## 🗺️ Incident Map

The command center displays:

- SOS locations
- Incident locations
- Rescue team locations
- Incident priority
- Incident status

## 👨‍🚒 Rescue Assignment

```text
SOS
 ↓
Coordinator
 ↓
Nearest/available rescue team
 ↓
Task Assigned
 ↓
Team Accepts
 ↓
IN_PROGRESS
 ↓
RESCUED
 ↓
RESOLVED
```

---

# 11. 🛠️ Technology Stack

## Mobile

Technology Purpose

---

Flutter Cross-platform mobile app
Dart Application language
flutter_blue_plus Bluetooth communication
sqflite Local offline database
geolocator GPS
Provider / Riverpod State management

## Web Dashboard

Technology Purpose

---

Next.js Web application
TypeScript Type safety
Tailwind CSS UI
Redux Toolkit State management
Leaflet / Mapbox Maps
Recharts Analytics

## Backend

Technology Purpose

---

Node.js Runtime
Express.js REST API
TypeScript Backend language
Prisma ORM
PostgreSQL Primary database
Redis Cache / Pub/Sub
Socket.IO Real-time communication
JWT Authentication

## Infrastructure

Technology Purpose

---

Docker Containerization
Nginx Reverse proxy
GitHub Actions CI/CD
PM2 Process management
Object Storage Images/videos

> **Important:** The MVP should use one backend framework. This
> architecture standardizes on **Node.js + Express.js + TypeScript**
> instead of maintaining an Express.js/FastAPI alternative.

---

# 12. 🗄️ Database Design

## Core Entities

```text
Users
  |
  +---- Profiles
  |
  +---- SOS Alerts
  |         |
  |         +---- Location
  |
  +---- Messages
  |
  +---- Incidents
  |         |
  |         +---- Reports
  |
  +---- Rescue Tasks
  |
  +---- Resources
```

## Suggested Core Tables

### users

```text
id
name
phone/email
password_hash
role
created_at
```

### sos_alerts

```text
id
message_id
user_id
latitude
longitude
priority
status
message
created_at
updated_at
```

### incidents

```text
id
sos_id
type
severity
status
assigned_team
created_at
updated_at
```

### messages

```text
id
message_id
sender_id
type
payload
timestamp
ttl
hop_count
delivery_status
```

### rescue_tasks

```text
id
incident_id
team_id
assigned_by
status
assigned_at
completed_at
```

---

# 13. 🔌 Backend API

Recommended initial API structure:

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## SOS

```text
POST  /api/sos
GET   /api/sos
GET   /api/sos/:id
PATCH /api/sos/:id
```

## Incidents

```text
POST  /api/incidents
GET   /api/incidents
GET   /api/incidents/:id
PATCH /api/incidents/:id
```

## Tasks

```text
POST  /api/tasks
GET   /api/tasks
PATCH /api/tasks/:id
```

## Synchronization

```text
POST /api/sync
GET  /api/sync/status
```

## Resources

```text
POST  /api/resources
GET   /api/resources
PATCH /api/resources/:id
```

---

# 14. 🖥️ Web Dashboard

The command center should contain:

```text
+------------------------------------------------------+
|             DISASTER COMMAND CENTER                  |
+------------------------------------------------------+
| Critical SOS | Active Incidents | Teams | Resources |
+------------------------------------------------------+
|                                                    |
|                  INCIDENT MAP                      |
|                                                    |
|        🔴       🔴                                 |
|                  🟠                                |
|     🟢                         🔴                   |
|                                                    |
+------------------------------------------------------+
| SOS / Incident List                                |
+------------------------------------------------------+
| ID | Priority | Location | Status | Team           |
+------------------------------------------------------+
```

## Main Screens

1.  Login
2.  Command Center
3.  Incident Map
4.  SOS Management
5.  Rescue Teams
6.  Resource Management
7.  Incident Details
8.  Analytics

---

# 15. 📱 Mobile Application

## Survivor Flow

```text
Login
  ↓
Home
  ↓
SOS Button
  ↓
Confirm Emergency
  ↓
Capture GPS
  ↓
Save Locally
  ↓
Send/Forward
  ↓
Track Status
```

## Volunteer Flow

```text
Login
  ↓
Volunteer Dashboard
  ↓
Nearby SOS
  ↓
Accept Task
  ↓
Navigate
  ↓
Update Status
```

---

# 16. 🔐 Security

Security is especially important because the system handles emergency
locations and personal information.

## Required MVP Security

- HTTPS
- JWT authentication
- Password hashing
- Role-based authorization
- Input validation
- API rate limiting
- Message integrity verification
- Secure local storage where appropriate
- Access control for sensitive incident data

## Offline Message Security

Offline messages should contain enough metadata to verify that they are
legitimate and have not been altered.

The exact cryptographic implementation should be finalized before
production deployment.

---

# 17. 🔀 Development Workflow

## Branch Structure

```text
main
  |
  └── develop
        |
        ├── feature/auth
        ├── feature/sos
        ├── feature/offline-mesh
        ├── feature/sync
        ├── feature/dashboard
        └── feature/resource-management
```

## Workflow

```bash
git checkout develop
git pull origin develop

git checkout -b feature/your-feature

git add .
git commit -m "feat: implement SOS alert"

git push -u origin feature/your-feature
```

Create a Pull Request into `develop`.

After review:

```text
feature branch
      ↓
Pull Request
      ↓
Code Review
      ↓
Tests
      ↓
develop
      ↓
main
```

---

# 18. 👥 Team Responsibilities

For a six-person team:

---

Member Role Main Responsibility

---

1 Team Lead / Integration Architecture, Git,
integration, code
review

2 Flutter Developer Survivor application

3 Flutter / Offline BLE, local database,
Developer offline queue

4 Backend Developer APIs, authentication,
PostgreSQL

5 Backend / Sync Sync engine, Socket.IO,
Developer message protocol

6 Frontend Developer Next.js dashboard,
maps, analytics

---

Everyone should understand the complete system even if they own a
particular module.

---

# 19. 🗓️ Development Roadmap

## Phase 1 --- Foundation

```text
Project repository
Database schema
API contracts
UI wireframes
Git workflow
```

## Phase 2 --- Backend

```text
Authentication
Users
SOS APIs
Incident APIs
PostgreSQL
Socket.IO
```

## Phase 3 --- Mobile

```text
Flutter setup
Authentication
Survivor dashboard
SOS
GPS
SQLite
```

## Phase 4 --- Offline Layer

```text
BLE discovery
Device identity
Message protocol
Message ID
TTL
Deduplication
Store-Carry-Forward
```

## Phase 5 --- Dashboard

```text
Command center
Incident map
SOS list
Team management
Real-time updates
```

## Phase 6 --- Synchronization

```text
Offline queue
Retry mechanism
Sync API
Conflict handling
Duplicate prevention
```

## Phase 7 --- Security & Testing

```text
JWT
RBAC
Input validation
Offline testing
Network failure testing
Load testing
```

## Phase 8 --- Deployment

```text
Docker
Cloud deployment
Nginx
PostgreSQL
Redis
CI/CD
Monitoring
```

---

# 20. 🧪 Testing Strategy

The system must be tested in three primary environments.

## Test 1 --- Normal Internet

```text
Mobile
  ↓
Backend
  ↓
Database
  ↓
Dashboard
```

Verify:

- Login
- SOS
- Database insertion
- Real-time dashboard update

## Test 2 --- No Internet

```text
Phone A
   ↓
Phone B
   ↓
Phone C
```

Verify:

- Device discovery
- Message transfer
- Local storage
- TTL
- Deduplication
- Message forwarding

## Test 3 --- Internet Recovery

```text
Phone C
   ↓
Internet restored
   ↓
Sync API
   ↓
Backend
   ↓
PostgreSQL
   ↓
Dashboard
```

Verify:

- Queue processing
- Retry
- Duplicate prevention
- Correct final state

## Failure Tests

Also test:

- Device disconnects during transfer
- Duplicate message
- GPS unavailable
- Battery becomes low
- Multiple SOS alerts
- Server temporarily unavailable
- Internet repeatedly disconnects
- Conflicting incident updates

---

# 21. ☁️ Deployment Architecture

```text
                         INTERNET
                            |
                            v
                    +---------------+
                    |     Nginx     |
                    +-------+-------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
        Next.js Dashboard           Node.js API
                                      |
                    +-----------------+----------------+
                    |                 |                |
                    v                 v                v
               PostgreSQL           Redis        Object Storage
```

## Docker

Services can be containerized:

```text
docker-compose
    |
    ├── nginx
    ├── backend
    ├── frontend
    ├── postgres
    └── redis
```

## CI/CD

```text
Developer
    ↓
GitHub
    ↓
Pull Request
    ↓
Automated Tests
    ↓
Build
    ↓
Docker Image
    ↓
Deployment
```

---

# 22. 🎬 Demo Scenario

The best SIH demonstration should tell one complete story.

## Scenario

A flood has affected an area.

Cellular connectivity is unavailable.

### Step 1

A survivor opens the application.

### Step 2

The survivor presses:

```text
        🆘
      SEND SOS
```

### Step 3

The application captures:

```text
Location
Time
User
Emergency Message
Priority
```

### Step 4

The SOS is stored locally.

### Step 5

The survivor's phone discovers a nearby volunteer phone.

### Step 6

The SOS is forwarded.

```text
Survivor → Volunteer → Rescue Worker
```

### Step 7

The rescue worker reaches a gateway or regains connectivity.

### Step 8

The event synchronizes with the backend.

### Step 9

The command center receives:

```text
🚨 CRITICAL SOS

Location: Sector 4
Status: PENDING
Priority: CRITICAL
```

### Step 10

Coordinator assigns a rescue team.

```text
SOS
 ↓
Team Assigned
 ↓
IN_PROGRESS
 ↓
RESCUED
 ↓
RESOLVED
```

This is the primary end-to-end proof of the system.

---

# 23. 🔮 Future Scope

The following features should remain primarily as future expansion
rather than MVP requirements:

- AI-powered triage
- Predictive resource allocation
- Satellite communication
- LoRa fallback
- HAM radio integration
- Telemedicine
- Drone coordination
- Large-scale multi-region deployment
- Advanced analytics
- Progressive Web App
- Additional disaster-specific intelligence

The original project concept also identifies AI triage, predictive
analytics, satellite/LoRa/HAM fallback, telemedicine, and drone
coordination as future possibilities.

---

# 🏆 Final Architecture Principle

The project should be built around one simple principle:

```text
                 "CONNECTIVITY IS NOT GUARANTEED"
                              |
                              v
                    BUILD OFFLINE-FIRST
                              |
              +---------------+---------------+
              |                               |
          LOCAL DATA                    LOCAL MESH
              |                               |
              +---------------+---------------+
                              |
                        SYNC WHEN ONLINE
                              |
                              v
                         CLOUD BACKEND
                              |
                              v
                      COMMAND CENTER
```

The MVP succeeds if it can prove this:

> **A survivor can create a critical SOS without Internet connectivity,
> the message can travel through nearby devices, and the event can
> eventually reach the command center when connectivity is restored.**

That should remain the central engineering goal of SIH1440.
