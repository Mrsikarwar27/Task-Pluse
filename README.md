# TaskPulse

A simple work-assignment system: one Admin creates client accounts and assigns tasks with deadlines, times, and resources. Clients see their own tasks, update the status, and ask questions — all in one place.

Live app: https://task-pluse.onrender.com

## What is TaskPulse

TaskPulse helps an Admin hand out work to clients and track it without endless emails. The Admin creates each client account, assigns tasks with dates, times, and links, and watches progress come in. Each client sees only their own tasks, can change the status as work moves forward, and can ask questions on a task. Both sides get notified when something changes, so nothing gets lost or forgotten.

## Features

For the Admin
- Create and manage client accounts
- Assign tasks with a title, description, due date and time, priority, and resource links
- See every task and every client's status at a glance
- Receive live notifications when a client updates a task or asks a question
- Reply to client questions and view task statistics

For Clients
- See only your own tasks — no one else's work
- Update a task status (for example: To Do, In Progress, Completed)
- Ask questions on a task and read the Admin's replies
- Get notified when the Admin assigns a new task or replies to a question

## How it works

1. The Admin creates client accounts.
2. The Admin assigns a task with its dates, times, and resources.
3. The Client gets notified and opens the task.
4. The Client updates the status and asks questions.
5. The Admin sees every update and reply.

## Tech Stack

| Part | Technology |
|------|------------|
| Server | Node.js, Express, Socket.io |
| Database | MongoDB (Mongoose) |
| Auth | JSON Web Tokens, bcryptjs |
| Client | React, Vite, Tailwind CSS |
| Client HTTP | axios |
| Client real-time | socket.io-client |

## Project Structure

```
TaskPulse/
├── client/              # React + Vite frontend (built and served by the server in production)
│   ├── src/
│   │   ├── pages/       # Login, dashboards, task pages
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # React context providers
│   │   ├── lib/         # API and socket helpers
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/              # Node.js + Express backend; serves the built frontend in production
│   ├── src/
│   │   ├── server.js    # App entry point
│   │   ├── app.js       # Express app setup
│   │   ├── routes/      # auth, tasks, users, notifications, stats
│   │   ├── controllers/ # route controllers
│   │   ├── models/      # Mongoose models
│   │   ├── middleware/  # auth and error middleware
│   │   ├── sockets/     # Socket.io real-time events
│   │   ├── seed/        # seedAdmin.js — creates the first Admin
│   │   ├── config/      # database config
│   │   ├── utils/       # helpers
│   │   └── reminderScheduler.js
│   ├── test/            # acceptance tests
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
└── README.md
```

## Run it locally

Prerequisites: Node.js 18+ and npm, plus your own MongoDB Atlas connection string.

1. Clone the repository:
```bash
git clone <your-repo-url>
cd TaskPulse
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Copy each `.env.example` to `.env` and fill in your own values:
```bash
cd ../server
cp .env.example .env
cd ../client
cp .env.example .env
```

5. Create the first Admin account with the existing seed command:
```bash
cd server
npm run seed
```

6. Run the app in development mode:

Server:
```bash
cd server
npm run dev
```

Client:
```bash
cd client
npm run dev
```

The client dev server runs on `http://localhost:5173` and the server on `http://localhost:5000`.

## Environment Variables

Server (`server/.env`):

| Variable | What it is for | Example |
|----------|---------------|---------|
| PORT | The port the server listens on | `5000` |
| NODE_ENV | Running mode (development or production) | `development` |
| MONGODB_URI | Your MongoDB Atlas connection string | `mongodb+srv://<username>:<password>@<cluster>/<database>` |
| JWT_SECRET | Secret used to sign login tokens | `<your-long-random-secret>` |
| JWT_EXPIRES_IN | How long a login token lasts | `7d` |
| CLIENT_URL | Allowed frontend origins (comma-separated) | `http://localhost:5173` |
| ADMIN_NAME | Name of the first Admin created by the seed | `TaskPulse Admin` |
| ADMIN_EMAIL | Email of the first Admin created by the seed | `admin@example.com` |
| ADMIN_PASSWORD | Password of the first Admin created by the seed | `<your-secure-password>` |
| ADMIN_PHONE | Phone of the first Admin created by the seed | `+1 555 0000` |

Client (`client/.env`):

| Variable | What it is for | Example |
|----------|---------------|---------|
| VITE_API_URL | The API base URL the frontend calls | `http://localhost:5000/api` |
| VITE_SOCKET_URL | The Socket.io server URL for real-time events | `http://localhost:5000` |

## Production and deployment

This app runs live as a single service. The server installs both server and client dependencies, builds the React frontend, serves the built files, and runs the API and Socket.io on the same port.

- Root directory: `server`
- Install and build: `npm install && npm run build:client`
- Start: `npm start`

No dashboard links or account details are needed.

## Notes and limits

- Browser notifications work while the app tab is open in the browser.
- The free hosting plan can take a short while to respond after being idle.

## Security notes

- Passwords are stored hashed, never in plain text.
- Access is role-based: Admin and Client see different things.
- Never commit real `.env` files to GitHub; only `.env.example` files belong in the repository.
