# TaskPulse

Work assignment system for one Admin and many Clients. Admins assign tasks; clients update status and ask questions; both sides are notified instantly via Socket.io. Every notification is persisted in MongoDB.

## Folder structure

```
TaskPulse/
├── client/                 # React + Vite frontend
│   ├── .env.example
│   ├── src/
│   └── package.json
├── server/                 # Node.js + Express + MongoDB backend
│   ├── .env.example
│   ├── src/
│   ├── test/acceptance.mjs
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- A MongoDB instance (local or Atlas). The provided `server/.env` points at an Atlas cluster; change `MONGODB_URI` as needed.

## Setup

### Server

```bash
cd server
cp .env.example .env
# edit .env: set MONGODB_URI, JWT_SECRET (32+ chars), CLIENT_ORIGIN, ADMIN_* values
npm install
npm run seed          # creates the first Admin account from .env
npm run dev           # or: npm start
```

### Client

```bash
cd client
cp .env.example .env
# edit .env if the API is not on http://localhost:5000
npm install
npm run dev           # http://localhost:5173
npm run build         # production build (outputs client/dist)
```

## Environment variables

Server (`server/.env`): `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`.

Client (`client/.env`): `VITE_API_URL`, `VITE_SOCKET_URL`.

No credentials are hardcoded; all configuration comes from environment variables.

## Admin login flow (using the seed)

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`.
2. Run `npm run seed` in `server/`.
3. Start the server (`npm run dev` or `npm start`).
4. Start the client (`npm run dev`).
5. Open http://localhost:5173, sign in with the seeded admin email and password.
6. You are redirected to `/admin/dashboard`.

## Acceptance test

With the server running and `ADMIN_EMAIL`/`ADMIN_PASSWORD` set:

```bash
cd server
npm run test:acceptance
```

Result (real output):

```
TaskPulse acceptance test
API: http://127.0.0.1:5000/api
Socket: http://127.0.0.1:5000
──────────────────────────────────────────────────────────────────────────────
PASS  Step 1: Admin logs in and opens a live socket.
PASS  Step 2: Admin adds two Clients through POST /api/users.
PASS  Step 3: Admin creates Task A with one link and one image URL, plus an isolation task for Client B.
PASS  Step 4: Client A logs in and sees only their own task and no other data.
PASS  Step 5: Client A changes status to In Progress; Admin socket receives the event live.
PASS  Step 6: Client A changes status to Completed; Admin receives that live event too.
PASS  Step 6b: Both status notifications are saved and still present after a fresh Admin login.
PASS  Step 7: Client A posts a query; Admin receives it live and can read the thread.
PASS  Step 8: Admin replies; Client A receives it live and the thread contains both messages.
PASS  Step 9: Second Client cannot open, comment on, or change the first Client's task through the API.
PASS  Step 10: Admin stats are computed from the same live data.
──────────────────────────────────────────────────────────────────────────────
RESULT: ALL ACCEPTANCE CHECKS PASSED
```

## Notes

- Light theme only; no dark mode.
- No file uploads: resources are stored as label + http/https URL text only.
- Clients are individual people; there are no organizations, workspaces, or companies.
