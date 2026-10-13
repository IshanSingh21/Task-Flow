# TaskFlow

TaskFlow is a production-grade full-stack SaaS project and team management platform inspired by tools like Trello, Jira, and Linear.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router 7, Axios, Lucide React, @hello-pangea/dnd
- **Backend**: Node.js 20, Express.js (REST API v1), Prisma ORM, Redis (ioredis), bcrypt, jsonwebtoken, zod
- **Database**: PostgreSQL 15
- **Caching**: Redis 7
- **Security & Hardening**: Helmet, Express Rate Limiting, Request ID tracing, Centralized Error Handling
- **Infrastructure & Containerization**: Docker, Docker Compose, Nginx
- **Testing**: Jest, Supertest

---

## Architecture Overview

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

---

## Docker Quick Start (Recommended)

Run the entire stack with a single command using Docker Compose.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed and running.

### 2. Configure Environment
Copy the environment template:
```bash
cp .env.example .env
```
*(Review `.env` to customize ports or credentials if necessary)*

### 3. Build & Run Containers
```bash
docker compose up --build
```
Or run in detached mode:
```bash
docker compose up --build -d
```

### 4. Verify Services
Check container statuses and healthchecks:
```bash
docker compose ps
```

| Service | Container Name | Port Mapping | Health Check Endpoint / Probe |
| :--- | :--- | :--- | :--- |
| **Frontend** | `taskflow_frontend` | `http://localhost:3000` | HTTP GET `/` (Nginx) |
| **Backend** | `taskflow_backend` | `http://localhost:5000` | HTTP GET `/api/v1/health` |
| **PostgreSQL** | `taskflow_postgres` | `localhost:5432` | `pg_isready -U postgres -d taskflow` |
| **Redis** | `taskflow_redis` | `localhost:6379` | `redis-cli ping` |

### 5. Accessing the Application
- **Web App**: Open [http://localhost:3000](http://localhost:3000)
- **API Health Check**: Open [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health) (or via Nginx proxy at [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health))

### 6. Stopping the Application
Stop all running containers:
```bash
docker compose down
```
To also purge persistent database and cache volumes:
```bash
docker compose down -v
```

---

## Local Development (Without Docker)

### 1. Start Infrastructure (PostgreSQL & Redis)
Ensure PostgreSQL and Redis are running locally or use Docker for databases only:
```bash
docker compose up -d postgres redis
```

### 2. Setup & Run Backend
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Backend runs on `http://localhost:5000`.

### 3. Setup & Run Frontend
```bash
cd client
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` and automatically proxies `/api` requests to `http://localhost:5000`.

### 4. Run Test Suite
```bash
cd server
npm test
```

---

## Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgrespassword` | PostgreSQL password |
| `POSTGRES_DB` | `taskflow` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | Host port for PostgreSQL |
| `REDIS_PORT` | `6379` | Host port for Redis |
| `BACKEND_PORT` | `5000` | Host port for Express API |
| `FRONTEND_PORT` | `3000` | Host port for React UI |
| `JWT_SECRET` | *Configured in .env* | Secret key for signing JWT tokens |
| `NODE_ENV` | `production` | Environment mode |
