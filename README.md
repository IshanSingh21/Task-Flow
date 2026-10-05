# TaskFlow

TaskFlow is a production-grade full-stack SaaS application for project and team management, inspired by tools like Trello, Jira, and Linear.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express.js, PostgreSQL (Prisma ORM), Redis
- **Authentication**: JWT, bcrypt
- **Infrastructure**: Docker, Docker Compose
- **Testing**: Jest, Supertest
- **CI/CD**: GitHub Actions

## Project Structure
- `client/`: Frontend React application.
- `server/`: Backend Node.js/Express API.
- `docker-compose.yml`: Infrastructure (Postgres, Redis).

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- npm or yarn

### Setup

1. Start Infrastructure:
   ```bash
   docker-compose up -d
   ```

2. Setup Backend:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Ensure the env vars are correct for your local setup
   npm run dev
   ```

3. Setup Frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Development
See the Architecture Document and Development Roadmap for more details.
