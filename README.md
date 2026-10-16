# TaskFlow

TaskFlow is a production-grade full-stack SaaS project and team management platform inspired by tools like Trello, Jira, and Linear. Built with multi-tenancy, role-based access control (RBAC), optimistic drag-and-drop Kanban boards, Redis-backed caching with automatic failover, defensive security hardening, and full containerization.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture & System Design](#architecture--system-design)
- [Environment Variables](#environment-variables)
- [Quick Start with Docker](#quick-start-with-docker)
- [Local Development Setup](#local-development-setup)
- [Testing Strategy & Test Suites](#testing-strategy--test-suites)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment Guide](#production-deployment-guide)
  - [Frontend to Vercel](#1-frontend-deployment-vercel)
  - [Backend to Render / Railway](#2-backend-deployment-render--railway)
  - [Managed PostgreSQL](#3-managed-postgresql)
  - [Managed Redis](#4-managed-redis)
- [API Documentation (v1)](#api-documentation-v1)

---

## Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4, Lucide React
- **Routing**: React Router 7
- **Kanban Drag-and-Drop**: `@hello-pangea/dnd`
- **HTTP Client**: Axios with interceptors for JWT injection

### Backend
- **Runtime**: Node.js 20, Express.js
- **API Architecture**: RESTful API (`/api/v1/...`) with versioning
- **Database ORM**: PostgreSQL 15 via Prisma ORM v6
- **Caching**: Redis 7 via `ioredis` with fail-open circuit resilience
- **Authentication**: JWT, bcrypt
- **Validation**: Zod schema validation
- **Security & Hardening**: Helmet security headers, Express Rate Limiting, Request ID tracing, request size capping (50KB)
- **Logging**: Morgan structured JSON logging

### Infrastructure & DevOps
- **Containerization**: Docker, Docker Compose, Nginx reverse proxy
- **CI/CD**: GitHub Actions
- **Quality & Linting**: Oxlint, Jest, Supertest

---

## Architecture & System Design

```
                                [ Client Browser ]
                                        |
                                        v
                        +-------------------------------+
                        |  taskflow_frontend (Nginx)    |
                        |  Port: 3000 -> 80             |
                        +---------------+---------------+
                                        |
                        +---------------+ (reverse-proxies /api/*)
                        |
                        v
          +-------------------------------+
          |  taskflow_backend (Express)   |
          |  Port: 5000                   |
          +---------------+---------------+
                  |               |
                  v               v
        +-------------------+   +------------------+
        | taskflow_postgres |   |  taskflow_redis  |
        | PostgreSQL 15     |   |  Redis 7 (Cache) |
        | Port: 5432        |   |  Port: 6379      |
        +-------------------+   +------------------+
```

### Key Architectural Decisions
1. **Multi-Tenancy & RBAC**: Every organization has independent workspaces. User roles (`OWNER`, `ADMIN`, `MEMBER`) are strictly verified on the backend. Cross-tenant access attempts return HTTP 404 (anti-enumeration) to prevent resource probing.
2. **Fail-Open Redis Caching**: Redis accelerates high-frequency read endpoints (`organizations`, `projects`). If Redis disconnects or times out, the backend gracefully falls back to PostgreSQL without interrupting user traffic.
3. **Nginx Reverse Proxy**: In containerized production, Nginx serves the compiled SPA bundle and reverse-proxies API calls directly to `http://backend:5000`, eliminating CORS errors.

---

## Environment Variables

### Core Configuration Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/taskflow?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *32+ character random string* |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `FRONTEND_URL` / `CLIENT_URL` | Allowed CORS origin(s) (comma-separated for multiple) | `http://localhost:3000,http://localhost:5173` |
| `VITE_API_URL` | Frontend API base URL | `/api/v1` (Docker) or `http://localhost:5000/api/v1` |

Copy the template to get started:
```bash
cp .env.example .env
```

---

## Quick Start with Docker

Run the entire multi-container stack with a single command:

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Build and start all services (frontend, backend, postgres, redis)
docker compose up --build -d

# 3. View service status & healthchecks
docker compose ps
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

To stop the containers:
```bash
docker compose down
```

---

## Local Development Setup

### 1. Start Backing Services (PostgreSQL & Redis)
```bash
docker compose up -d postgres redis
```

### 2. Setup & Start Backend
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Backend runs on `http://localhost:5000`.

### 3. Setup & Start Frontend
```bash
cd client
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` with automatic `/api` proxying to `http://localhost:5000`.

---

## Testing Strategy & Test Suites

The test strategy covers both isolated unit validations and full integration workflows across 8 test suites and 72 tests.

```bash
# Run the complete test suite
cd server
npm test

# Run isolated unit tests (Zod schemas & middleware)
npm run test:unit

# Run API integration tests (Express routers & Prisma mocking)
npm run test:integration

# Generate code coverage report
npm run test:coverage
```

### Verified Test Areas
- **Authentication**: Registration, password complexity rules, duplicate emails, login credential validation, JWT tokens.
- **Role-Based Authorization**: Org member permissions, admin restrictions, anti-enumeration security responses (404 on foreign tenant access).
- **Projects & Tasks**: Project isolation, task CRUD, priority/status filtering, search, assignee verification.
- **Security & Hardening**: Rate limiting thresholds, Helmet headers, payload capping (`413 Payload Too Large`), Request ID (`X-Request-Id`) injection.
- **Cache Resilience**: Redis disconnection recovery, graceful cache bypass.

---

## CI/CD Pipeline

TaskFlow uses GitHub Actions (`.github/workflows/ci.yml`) to automatically validate every push and pull request against `main`/`master`:

1. **Backend Job**:
   - Node 20 environment with npm caching
   - Dependency verification (`npm ci`)
   - Static analysis & linting (`npm run lint`)
   - Prisma Client generation (`npm run build`)
   - Full automated test suite execution (`npm test`) — *pipeline fails if any test fails*
2. **Frontend Job**:
   - Node 20 environment with npm caching
   - Dependency verification (`npm ci`)
   - Linting check (`npm run lint`)
   - Production bundle compilation (`npm run build`)

---

## Production Deployment Guide

### 1. Frontend Deployment (Vercel)
1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variable:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api/v1`
5. Deploy. `client/vercel.json` automatically handles SPA routing fallback.

### 2. Backend Deployment (Render / Railway)
- **Render**: Connect your GitHub repository to Render using the included `render.yaml` blueprint:
  - Automatically provisions the web service, a managed PostgreSQL database, and a managed Redis instance.
- **Railway**: Uses the provided `railway.json` and `server/Procfile`:
  - `startCommand`: `npx prisma db push --skip-generate && node src/server.js`

### 3. Managed PostgreSQL
- Compatible with **Neon**, **Supabase**, **AWS RDS**, or **Render PostgreSQL**.
- Provide connection URI in `DATABASE_URL` (ensure connection pooling or SSL parameters are appended if required: `?sslmode=require`).

### 4. Managed Redis
- Compatible with **Upstash Redis**, **Redis Cloud**, or **Render Redis**.
- Provide connection URI in `REDIS_URL` (`rediss://...` for TLS-enabled instances).

---

## API Documentation (v1)

Base URL: `/api/v1`

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public (Rate-limited) | Register a new user | `{ "name": "Jane", "email": "jane@ex.com", "password": "Password123" }` |
| `POST` | `/auth/login` | Public (Rate-limited) | Authenticate user & get token | `{ "email": "jane@ex.com", "password": "Password123" }` |
| `GET` | `/auth/me` | Bearer Token | Get authenticated user profile | *None* |

### Organizations (`/api/v1/organizations`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/organizations` | Authenticated | Create a new tenant organization (creator becomes `OWNER`) |
| `GET` | `/organizations` | Authenticated | List organizations current user belongs to (Redis cached) |
| `GET` | `/organizations/:id` | Org Member | Get organization details and aggregated stats |
| `POST` | `/organizations/:id/members` | Org Owner/Admin | Invite a member by email (`{ "email": "...", "role": "MEMBER" }`) |
| `GET` | `/organizations/:id/members` | Org Member | List all members in the organization |
| `DELETE` | `/organizations/:id/members/:userId` | Org Owner/Admin | Remove a member from the organization |
| `DELETE` | `/organizations/:id` | Org Owner | Delete organization and cascade project/task data |

### Projects (`/api/v1/projects`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects` | Org Owner/Admin | Create a project within organization (`{ "name": "...", "organizationId": "..." }`) |
| `GET` | `/projects?organizationId=...` | Org Member | List projects in organization (Redis cached) |
| `GET` | `/projects/:id` | Org Member | Get project details |
| `PATCH` | `/projects/:id` | Org Owner/Admin | Update project name or description |
| `DELETE` | `/projects/:id` | Org Owner/Admin | Delete project |

### Tasks (`/api/v1/projects/:projectId/tasks` & `/api/v1/tasks`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects/:projectId/tasks` | Org Member | Create a task (`{ "title": "...", "priority": "HIGH", "status": "TODO", "assigneeId": "..." }`) |
| `GET` | `/projects/:projectId/tasks` | Org Member | List tasks with filters (`?status=TODO&priority=HIGH&search=...&page=1&limit=20`) |
| `GET` | `/tasks/:id` | Org Member | Get task details with assignee and project relations |
| `PATCH` | `/tasks/:id` | Org Member | Update task status, priority, description, or assignee |
| `DELETE` | `/tasks/:id` | Org Member | Delete task |

### System Health (`/api/v1/health`)

| Method | Endpoint | Description | Sample Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Live database and Redis probe | `{ "success": true, "data": { "database": "connected", "redis": "connected", "uptime": 120 } }` |
