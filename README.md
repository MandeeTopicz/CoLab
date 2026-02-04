# Vite + React + TypeScript

A minimal React application built with Vite and TypeScript.

## Environment variables

Create a `.env.local` (not committed) for local development:

```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Optional: Firebase Analytics (values from your Firebase console)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

## Setup

- **Node.js** 18+
- **npm**

## Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Project structure

- `src/` — React app source
- `public/` — Static assets
- `index.html` — Entry HTML
